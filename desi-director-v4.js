(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(pointer: fine)");

  const sceneTitles = [
    "ORIGIN / WATERLIGHT",
    "CRYSTAL ARCHIVE",
    "SUPERPOSITION",
    "HARMONIC ORBIT",
    "EXPONENTIAL GROWTH",
    "INFINITE BOUNDARY",
    "MODULAR FIELD",
    "HARMONIC FIELD",
    "CHAOS ATTRACTOR",
    "EMERGENCE",
    "PRIME FIELD",
    "POLAR GARDEN",
    "FINAL FRAME",
  ];

  const state = {
    canvas: null,
    gl: null,
    program: null,
    uniforms: null,
    raf: 0,
    resizeObserver: null,
    sectionObserver: null,
    mutationObserver: null,
    sections: [],
    activeIndex: 0,
    scene: 0,
    sceneTarget: 0,
    sceneLocal: 0,
    sceneLocalTarget: 0,
    scroll: 0,
    scrollTarget: 0,
    velocity: 0,
    lastScrollY: scrollY,
    pointerX: 0,
    pointerY: 0,
    pointerTargetX: 0,
    pointerTargetY: 0,
    cursorX: innerWidth * 0.5,
    cursorY: innerHeight * 0.5,
    cursorTargetX: innerWidth * 0.5,
    cursorTargetY: innerHeight * 0.5,
    transition: 0,
    accent: [0.56, 0.82, 0.94],
    accentTarget: [0.56, 0.82, 0.94],
    time: 0,
    lastFrame: performance.now(),
    width: 0,
    height: 0,
    dpr: 1,
    quality: innerWidth < 760 ? 0 : 2,
    frameSamples: [],
    paused: false,
    hidden: document.hidden,
    ready: false,
  };

  const vertexShader = `#version 300 es
  precision highp float;
  const vec2 positions[3] = vec2[3](vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));
  void main(){ gl_Position=vec4(positions[gl_VertexID],0.0,1.0); }`;

  const fragmentShader = `#version 300 es
  precision highp float;
  out vec4 outColor;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uScroll;
  uniform float uVelocity;
  uniform float uScene;
  uniform float uLocal;
  uniform float uTransition;
  uniform vec2 uPointer;
  uniform vec3 uAccent;
  uniform float uQuality;

  #define PI 3.14159265359
  #define MAX_CRYSTAL_STEPS 68
  #define MAX_TERRAIN_STEPS 72
  #define FAR_CLIP 30.0

  mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
  float sat(float x){return clamp(x,0.0,1.0);}
  float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
  float noise(vec2 p){
    vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1)),f.x),f.y);
  }
  float fbm(vec2 p){
    float value=0.0,amp=.52;
    mat2 m=mat2(.82,.57,-.57,.82);
    for(int i=0;i<5;i++){value+=amp*noise(p);p=m*p*2.03+17.17;amp*=.49;}
    return value;
  }
  float sdOcta(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*.57735027;}
  float sdShard(vec3 p,vec3 scale,float twist){
    p.xz*=rot(twist+p.y*.12);
    p/=scale;
    float d=sdOcta(p,1.0);
    return d*min(scale.x,min(scale.y,scale.z));
  }
  float scenePhase(){return mod(floor(uScene+.5),6.0);}

  float terrainHeight(vec2 p){
    float shot=scenePhase();
    vec2 q=p;
    q*=rot(.08*sin(uScene*.7));
    float broad=fbm(q*.105+vec2(uScene*.17,-uScene*.11));
    float detail=fbm(q*.38+13.7);
    float ridge=1.0-abs(2.0*fbm(q*.19+4.2)-1.0);
    float amp=mix(.18,1.22,smoothstep(1.4,4.8,shot));
    if(shot<1.5) amp=.12;
    if(shot>4.5) amp=.58;
    float h=(broad-.48)*amp+(ridge-.56)*amp*.68+(detail-.5)*.12;
    float coast=smoothstep(-1.2,1.4,p.x+sin(p.y*.24+uScene)*1.4);
    if(shot<2.5) h=mix(-.24,h,coast);
    return h-.17;
  }

  vec3 terrainNormal(vec2 p){
    float e=.018;
    float h=terrainHeight(p);
    return normalize(vec3(h-terrainHeight(p+vec2(e,0.0)),e,h-terrainHeight(p+vec2(0.0,e))));
  }

  float crystalMap(vec3 p,out float material){
    float shot=scenePhase();
    vec3 center=vec3(0.0,.48,-.35);
    center.x+=sin(uScene*.63)*.34;
    center.y+=.08*sin(uTime*.42+uScene);
    if(shot>2.5&&shot<4.5) center.x=mix(-1.25,1.18,uLocal);
    if(shot>4.5) center.z=-1.15;
    vec3 q=p-center;
    q.xz*=rot(.22*uTime+.22*uScene);
    q.xy*=rot(.08*sin(uTime*.31));
    float mainD=sdShard(q,vec3(.76,1.34,.64),.1);
    float best=mainD;
    material=1.0;
    for(int i=0;i<7;i++){
      float fi=float(i);
      float angle=fi*6.2831853/7.0+uTime*(.075+.012*fi)+uScene*.11;
      float radius=1.22+.17*sin(fi*2.7+uTime*.33);
      vec3 pos=vec3(cos(angle)*radius,.34+.28*sin(angle*1.7+fi),sin(angle)*radius*.62);
      pos*=mix(.54,1.0,smoothstep(.1,.55,uLocal));
      vec3 sp=q-pos;
      sp.xy*=rot(angle*.7+fi);
      float d=sdShard(sp,vec3(.19,.45+.08*sin(fi),.17),angle);
      if(d<best){best=d;material=2.0+fi*.08;}
    }
    return best;
  }

  vec3 crystalNormal(vec3 p){
    float m;float e=.0018;
    vec2 h=vec2(e,-e);
    return normalize(h.xyy*crystalMap(p+h.xyy,m)+h.yyx*crystalMap(p+h.yyx,m)+h.yxy*crystalMap(p+h.yxy,m)+h.xxx*crystalMap(p+h.xxx,m));
  }

  vec3 sky(vec3 rd){
    float shot=scenePhase();
    vec3 low=mix(vec3(.012,.021,.028),uAccent*.105,.42);
    vec3 high=vec3(.0025,.004,.007);
    float horizon=pow(sat(1.0-abs(rd.y)),4.0);
    vec3 col=mix(low,high,sat(rd.y*.62+.48));
    col+=uAccent*horizon*(.04+.018*sin(uScene));
    vec3 sunDir=normalize(vec3(-.46,.31,.74));
    float sun=max(dot(rd,sunDir),0.0);
    col+=vec3(1.0,.94,.84)*pow(sun,620.0)*3.5;
    col+=uAccent*pow(sun,14.0)*.13;
    float cloud=fbm(rd.xz*3.1/(abs(rd.y)+.18)+uTime*.006);
    col+=uAccent*.018*smoothstep(.58,.82,cloud)*horizon;
    if(shot>3.5) col*=vec3(.86,.9,1.03);
    return col;
  }

  mat3 cameraBasis(vec3 ro,vec3 ta,float roll){
    vec3 f=normalize(ta-ro);
    vec3 r=normalize(cross(vec3(sin(roll),cos(roll),0.0),f));
    vec3 u=cross(f,r);
    return mat3(r,u,f);
  }

  void cameraPath(out vec3 ro,out vec3 ta,out float lens){
    float shot=scenePhase();
    float p=uLocal;
    float drift=uScroll*PI*2.0;
    if(shot<.5){
      ro=vec3(-1.45+2.65*p,.66+.1*sin(p*PI),5.85-1.22*p);
      ta=vec3(.08,.35,-.42);
      lens=1.74;
    }else if(shot<1.5){
      ro=vec3(2.25*cos(.38+p*1.52),.9+.32*sin(p*PI),4.35-1.06*p);
      ta=vec3(0.0,.42,-.42);
      lens=1.68;
    }else if(shot<2.5){
      ro=vec3(-3.8+7.2*p,2.18+.18*sin(p*PI*2.0),5.4-2.0*p);
      ta=vec3(.15,.02,-1.8);
      lens=1.88;
    }else if(shot<3.5){
      ro=vec3(3.6-6.4*p,1.24+1.18*p,5.2-2.55*p);
      ta=vec3(.25,.12,-1.7);
      lens=1.94;
    }else if(shot<4.5){
      ro=vec3(-2.5+4.6*p,2.7-.72*p,4.5-1.4*p);
      ta=vec3(.0,.08,-2.3);
      lens=2.04;
    }else{
      ro=vec3(1.5*sin(drift*.2+1.2),1.08+.48*sin(p*PI),5.0-1.8*p);
      ta=vec3(0.0,.18,-1.1);
      lens=1.78;
    }
    ro.x+=uPointer.x*.24;
    ro.y+=uPointer.y*.13;
    ta.x-=uPointer.x*.08;
    lens+=abs(uVelocity)*.035;
  }

  bool marchTerrain(vec3 ro,vec3 rd,out float t,out vec3 p){
    t=.08;
    int maxSteps=int(mix(42.0,72.0,uQuality));
    for(int i=0;i<MAX_TERRAIN_STEPS;i++){
      if(i>=maxSteps)break;
      p=ro+rd*t;
      float d=p.y-terrainHeight(p.xz);
      if(d<.009&&t>.2)return true;
      t+=max(.025,d*.48);
      if(t>FAR_CLIP||p.y>8.0)break;
    }
    return false;
  }

  bool marchCrystal(vec3 ro,vec3 rd,out float t,out vec3 p,out float material){
    t=.05;material=0.0;
    int maxSteps=int(mix(44.0,68.0,uQuality));
    for(int i=0;i<MAX_CRYSTAL_STEPS;i++){
      if(i>=maxSteps)break;
      p=ro+rd*t;
      float d=crystalMap(p,material);
      if(d<.0016)return true;
      t+=d*.72;
      if(t>FAR_CLIP)break;
    }
    return false;
  }

  vec3 shadeWater(vec3 ro,vec3 rd,float t){
    vec3 p=ro+rd*t;
    float e=.035;
    float h=fbm(p.xz*.72+vec2(uTime*.026,-uTime*.018));
    float hx=fbm((p.xz+vec2(e,0.0))*.72+vec2(uTime*.026,-uTime*.018));
    float hz=fbm((p.xz+vec2(0.0,e))*.72+vec2(uTime*.026,-uTime*.018));
    vec3 n=normalize(vec3((h-hx)*1.5,e,(h-hz)*1.5));
    float fres=pow(1.0-sat(dot(-rd,n)),4.0);
    vec3 refl=sky(reflect(rd,n));
    vec3 deep=mix(vec3(.005,.015,.021),uAccent*.07,.34);
    vec3 col=mix(deep,refl,.27+.67*fres);
    float foam=smoothstep(.78,.95,fbm(p.xz*1.5+uTime*.035));
    col+=vec3(.72,.87,.93)*foam*.045;
    return col;
  }

  vec3 shadeTerrain(vec3 p,vec3 rd,float distanceToCamera){
    vec3 n=terrainNormal(p.xz);
    vec3 lightDir=normalize(vec3(-.52,.72,.43));
    float diffuse=max(dot(n,lightDir),0.0);
    float ridge=pow(1.0-sat(n.y),1.7);
    float detail=fbm(p.xz*.62+8.0);
    vec3 rock=mix(vec3(.028,.035,.038),vec3(.095,.105,.106),detail);
    rock=mix(rock,uAccent*.15,ridge*.36);
    vec3 col=rock*(.32+.72*diffuse);
    col+=uAccent*pow(max(dot(reflect(-lightDir,n),-rd),0.0),48.0)*.18;
    float fog=1.0-exp(-distanceToCamera*.075);
    return mix(col,sky(rd),fog*.78);
  }

  vec3 shadeCrystal(vec3 p,vec3 rd,float distanceToCamera,float material){
    vec3 n=crystalNormal(p);
    vec3 lightDir=normalize(vec3(-.42,.74,.51));
    float diffuse=max(dot(n,lightDir),0.0);
    float fres=pow(1.0-sat(dot(n,-rd)),3.25);
    float edge=pow(1.0-abs(dot(n,-rd)),7.0);
    vec3 reflected=sky(reflect(rd,n));
    vec3 base=mix(vec3(.004,.009,.014),uAccent,.12+.028*material);
    vec3 col=mix(base,reflected,.28+.48*fres);
    col+=uAccent*(diffuse*.15+fres*.58+edge*1.12);
    col+=vec3(1.0,.98,.92)*pow(max(dot(reflect(-lightDir,n),-rd),0.0),110.0)*1.7;
    float inner=sin((p.x+p.y*1.7+p.z*.8)*18.0+uTime*.42)*.5+.5;
    col+=uAccent*inner*.025;
    float fog=1.0-exp(-distanceToCamera*.055);
    return mix(col,sky(rd),fog*.36);
  }

  vec3 aces(vec3 x){
    const float a=2.51,b=.03,c=2.43,d=.59,e=.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
  }

  vec3 renderScene(vec2 fragCoord){
    vec2 uv=(fragCoord-.5*uResolution)/uResolution.y;
    vec3 ro,ta;float lens;
    cameraPath(ro,ta,lens);
    float roll=.012*sin(uScene*.74)+uVelocity*.006;
    vec3 rd=normalize(cameraBasis(ro,ta,roll)*vec3(uv,lens));
    vec3 col=sky(rd);

    float waterT=1e5;
    if(rd.y<-.001)waterT=(0.0-ro.y)/rd.y;

    float terrainT;vec3 terrainP;
    bool terrainHit=marchTerrain(ro,rd,terrainT,terrainP);

    float crystalT,material;vec3 crystalP;
    bool crystalHit=marchCrystal(ro,rd,crystalT,crystalP,material);

    float nearest=FAR_CLIP;
    if(waterT>.05&&waterT<nearest){nearest=waterT;col=shadeWater(ro,rd,waterT);}
    if(terrainHit&&terrainT<nearest){nearest=terrainT;col=shadeTerrain(terrainP,rd,terrainT);}
    if(crystalHit&&crystalT<nearest){nearest=crystalT;col=shadeCrystal(crystalP,rd,crystalT,material);}

    vec3 sunDir=normalize(vec3(-.46,.31,.74));
    float sun=max(dot(rd,sunDir),0.0);
    float anamorphic=pow(sun,90.0)*exp(-abs(uv.y)*55.0);
    col+=mix(uAccent,vec3(1.0,.91,.76),.45)*anamorphic*.7;

    float velocity=abs(uVelocity);
    float fringe=sat(length(uv)*.72);
    col.r+=fringe*.007*(.35+velocity);
    col.b-=fringe*.004;
    float vignette=1.0-smoothstep(.18,1.05,length(uv*vec2(.78,.64)));
    col*=.42+.58*vignette;

    float exposure=1.0+uTransition*1.85;
    float sweep=exp(-pow((uv.x-(uTransition*2.1-1.05))*7.5,2.0));
    col=col*exposure+vec3(.88,.96,1.0)*sweep*uTransition*.38;

    float grain=(hash21(fragCoord+uTime*91.73)-.5)*(.017+.012*velocity);
    col+=grain;
    col+=.004*sin(fragCoord.y*1.23+uTime*3.2);
    col=aces(max(col,0.0));
    col=pow(col,vec3(.92));
    return col;
  }

  void main(){outColor=vec4(renderScene(gl_FragCoord.xy),1.0);}`;

  function bootstrapCover() {
    const style = document.createElement("style");
    style.id = "desi-v4-bootstrap-style";
    style.textContent = `html.desi-v4-booting{background:#020304!important}html.desi-v4-booting body{visibility:hidden!important}.desi-cinematic-loader,.desi-v2-loader,.desi-v3-loader{display:none!important}`;
    document.head.appendChild(style);
    document.documentElement.classList.add("desi-v4-booting");
  }

  function addStylesheet() {
    return new Promise((resolve) => {
      const existing = $('link[data-desi-director-v4]');
      if (existing?.sheet) return resolve();
      const link = existing || document.createElement("link");
      if (!existing) {
        link.rel = "stylesheet";
        link.href = "./desi-director-v4.css?v=20260728-director-v4";
        link.dataset.desiDirectorV4 = "true";
        document.head.appendChild(link);
      }
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
      setTimeout(done, 1200);
    });
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Unknown shader compilation failure";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(gl) {
    const program = gl.createProgram();
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Unable to link cinematic program");
    }
    return program;
  }

  function createCanvas() {
    const old = $("#desi-director-webgl");
    old?.remove();
    const canvas = document.createElement("canvas");
    canvas.id = "desi-director-webgl-v4";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    state.canvas = canvas;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      desynchronized: true,
    });

    if (!gl) {
      document.body.classList.add("desi-v4-no-webgl");
      return false;
    }

    try {
      state.program = createProgram(gl);
    } catch (error) {
      console.error("DESI WebGL director v4 shader failed:", error);
      document.body.classList.add("desi-v4-no-webgl");
      canvas.remove();
      state.canvas = null;
      return false;
    }

    state.gl = gl;
    state.uniforms = {
      resolution: gl.getUniformLocation(state.program, "uResolution"),
      time: gl.getUniformLocation(state.program, "uTime"),
      scroll: gl.getUniformLocation(state.program, "uScroll"),
      velocity: gl.getUniformLocation(state.program, "uVelocity"),
      scene: gl.getUniformLocation(state.program, "uScene"),
      local: gl.getUniformLocation(state.program, "uLocal"),
      transition: gl.getUniformLocation(state.program, "uTransition"),
      pointer: gl.getUniformLocation(state.program, "uPointer"),
      accent: gl.getUniformLocation(state.program, "uAccent"),
      quality: gl.getUniformLocation(state.program, "uQuality"),
    };
    gl.useProgram(state.program);
    gl.bindVertexArray(gl.createVertexArray());

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      document.body.classList.add("desi-v4-no-webgl");
    });
    canvas.addEventListener("webglcontextrestored", () => location.reload());
    resize();
    return true;
  }

  function resize() {
    if (!state.canvas || !state.gl) return;
    const mobile = innerWidth < 760;
    const caps = mobile ? [0.72, 0.86, 1] : [0.88, 1.08, 1.32];
    state.dpr = Math.min(devicePixelRatio || 1, caps[state.quality]);
    const width = Math.max(1, Math.round(innerWidth * state.dpr));
    const height = Math.max(1, Math.round(innerHeight * state.dpr));
    if (width === state.width && height === state.height) return;
    state.width = width;
    state.height = height;
    state.canvas.width = width;
    state.canvas.height = height;
    state.canvas.style.width = `${innerWidth}px`;
    state.canvas.style.height = `${innerHeight}px`;
    state.gl.viewport(0, 0, width, height);
  }

  function createChrome() {
    const elements = [
      ["desi-v4-vignette", ""],
      ["desi-v4-letterbox", "<i></i><i></i>"],
      ["desi-v4-transition", ""],
      ["desi-v4-scene-meter", '<span class="desi-v4-shot">SHOT 01</span><strong>ORIGIN / WATERLIGHT</strong><small>SCENE 01 / 13</small>'],
      ["desi-v4-cursor", "<i></i><b></b>"],
    ];
    for (const [className, html] of elements) {
      if ($(`.${className}`)) continue;
      const node = document.createElement("div");
      node.className = className;
      node.setAttribute("aria-hidden", "true");
      node.innerHTML = html;
      document.body.appendChild(node);
    }
  }

  function createLoader(webglReady) {
    $$(".desi-cinematic-loader,.desi-v2-loader,.desi-v3-loader").forEach((node) => node.remove());
    if (reducedMotion.matches || performance.getEntriesByType?.("navigation")?.[0]?.type === "back_forward") {
      document.body.classList.add("desi-v4-ready");
      state.ready = true;
      return;
    }

    const loader = document.createElement("div");
    loader.className = "desi-v4-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-label", "DESI 電影場景載入中");
    loader.innerHTML = `
      <div class="desi-v4-loader-curtain desi-v4-loader-curtain-top"></div>
      <div class="desi-v4-loader-curtain desi-v4-loader-curtain-bottom"></div>
      <div class="desi-v4-loader-glow"></div>
      <div class="desi-v4-loader-content">
        <div class="desi-v4-loader-brand"><strong>DESI</strong><span>INTERACTIVE MATHEMATICS<br>CINEMATIC FIELD / IV</span></div>
        <div class="desi-v4-loader-line"><i></i></div>
        <div class="desi-v4-loader-meta"><span class="desi-v4-loader-phase">OPENING OPTICAL FIELD</span><span class="desi-v4-loader-count">000%</span></div>
      </div>`;
    document.body.appendChild(loader);

    const count = $(".desi-v4-loader-count", loader);
    const phase = $(".desi-v4-loader-phase", loader);
    const started = performance.now();
    let shown = 0;
    const duration = webglReady ? 2100 : 1350;

    const tick = (now) => {
      const raw = clamp((now - started) / duration);
      const eased = 1 - Math.pow(1 - raw, 2.7);
      const target = Math.round(eased * 100);
      shown += Math.max(1, Math.ceil((target - shown) * 0.22));
      shown = Math.min(target, shown);
      loader.style.setProperty("--desi-v4-load", `${shown}%`);
      count.textContent = `${String(shown).padStart(3, "0")}%`;
      phase.textContent = shown < 24 ? "OPENING OPTICAL FIELD" : shown < 49 ? "BUILDING AERIAL TERRAIN" : shown < 74 ? "ASSEMBLING CRYSTAL LIGHT" : shown < 96 ? "SYNCING CAMERA PATH" : "FIELD READY";
      if (raw < 1 || shown < 100) return requestAnimationFrame(tick);
      loader.classList.add("is-charged");
      setTimeout(() => {
        loader.classList.add("is-opening");
        document.body.classList.add("desi-v4-ready");
        state.ready = true;
      }, 180);
      setTimeout(() => loader.remove(), 1700);
    };
    requestAnimationFrame(tick);
  }

  function registerSections() {
    state.sectionObserver?.disconnect();
    state.sections = $$("main > section");
    state.sections.forEach((section, index) => {
      section.classList.add("desi-v4-section");
      section.dataset.desiV4Index = String(index);
      section.style.setProperty("--desi-v4-index", String(index));
    });

    if (!("IntersectionObserver" in window)) {
      state.sections.forEach((section) => section.classList.add("desi-v4-entered"));
      return;
    }

    state.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("desi-v4-entered");
        if (entry.isIntersecting && entry.intersectionRatio >= 0.34) {
          const index = Number(entry.target.dataset.desiV4Index || 0);
          setActiveScene(index);
        }
      });
    }, { rootMargin: "-10% 0px -15%", threshold: [0, 0.12, 0.34, 0.58] });
    state.sections.forEach((section) => state.sectionObserver.observe(section));
  }

  function observeDynamicSections() {
    const main = $("main");
    if (!main || !("MutationObserver" in window)) return;
    state.mutationObserver?.disconnect();
    let timer = 0;
    state.mutationObserver = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(registerSections, 80);
    });
    state.mutationObserver.observe(main, { childList: true });
  }

  function setActiveScene(index) {
    if (index === state.activeIndex && state.ready) return;
    state.activeIndex = index;
    state.sceneTarget = index;
    state.transition = 1;
    state.sections.forEach((section, sectionIndex) => section.classList.toggle("desi-v4-active", sectionIndex === index));
    const meter = $(".desi-v4-scene-meter");
    if (meter) {
      $(".desi-v4-shot", meter).textContent = `SHOT ${String(index + 1).padStart(2, "0")}`;
      $("strong", meter).textContent = sceneTitles[index] || `FIELD ${String(index + 1).padStart(2, "0")}`;
      $("small", meter).textContent = `SCENE ${String(index + 1).padStart(2, "0")} / ${String(Math.max(1, state.sections.length)).padStart(2, "0")}`;
      meter.classList.remove("is-changing");
      void meter.offsetWidth;
      meter.classList.add("is-changing");
    }
    const transition = $(".desi-v4-transition");
    if (transition?.animate && !reducedMotion.matches) {
      transition.getAnimations().forEach((animation) => animation.cancel());
      transition.animate([
        { opacity: 0, transform: "translate3d(-115%,0,0) skewX(-10deg)" },
        { opacity: .72, offset: .46 },
        { opacity: .14, transform: "translate3d(112%,0,0) skewX(-10deg)", offset: .84 },
        { opacity: 0, transform: "translate3d(132%,0,0) skewX(-10deg)" },
      ], { duration: 1180, easing: "cubic-bezier(.16,.78,.16,1)" });
    }
  }

  function syncThemeColor() {
    const prism = $(".crystal-prism");
    if (!prism) return;
    const update = () => {
      const raw = prism.style.getPropertyValue("--crystal-rgb").trim();
      const values = raw.split(",").map((value) => Number.parseFloat(value.trim()) / 255).filter(Number.isFinite);
      if (values.length === 3) state.accentTarget = values.map((value) => clamp(value, 0, 1));
    };
    update();
    if ("MutationObserver" in window) new MutationObserver(update).observe(prism, { attributes: true, attributeFilter: ["style", "data-crystal-shape"] });
  }

  function installInput() {
    const updateScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      state.scrollTarget = scrollY / max;
    };
    addEventListener("scroll", updateScroll, { passive: true });
    addEventListener("resize", () => {
      updateScroll();
      resize();
    }, { passive: true });
    updateScroll();

    if (finePointer.matches && !reducedMotion.matches) {
      addEventListener("pointermove", (event) => {
        state.pointerTargetX = (event.clientX / innerWidth - .5) * 2;
        state.pointerTargetY = (event.clientY / innerHeight - .5) * 2;
        state.cursorTargetX = event.clientX;
        state.cursorTargetY = event.clientY;
      }, { passive: true });
      addEventListener("pointerleave", () => {
        state.pointerTargetX = 0;
        state.pointerTargetY = 0;
      }, { passive: true });
      document.addEventListener("pointerover", (event) => {
        const interactive = event.target.closest("a,button,input,label,[role=button]");
        document.body.classList.toggle("desi-v4-pointer-active", Boolean(interactive));
      }, { passive: true });
    }

    document.addEventListener("visibilitychange", () => { state.hidden = document.hidden; });
  }

  function updateSectionProgress() {
    const center = innerHeight * .5;
    const active = state.sections[state.activeIndex];
    if (active) {
      const rect = active.getBoundingClientRect();
      state.sceneLocalTarget = clamp((center - rect.top) / Math.max(1, rect.height));
    }
    for (const section of state.sections) {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -innerHeight || rect.top > innerHeight * 2) continue;
      const local = clamp((center - rect.top) / Math.max(1, rect.height));
      const focus = clamp(1 - Math.abs((rect.top + rect.height * .5 - center) / (innerHeight * .88)));
      section.style.setProperty("--desi-v4-local", local.toFixed(4));
      section.style.setProperty("--desi-v4-focus", focus.toFixed(4));
    }
  }

  function adaptQuality(frameTime) {
    if (!state.gl || reducedMotion.matches) return;
    state.frameSamples.push(frameTime);
    if (state.frameSamples.length < 120) return;
    const average = state.frameSamples.reduce((sum, value) => sum + value, 0) / state.frameSamples.length;
    state.frameSamples.length = 0;
    if (average > 25 && state.quality > 0) {
      state.quality -= 1;
      resize();
    } else if (average < 16.2 && state.quality < 2 && innerWidth >= 760) {
      state.quality += 1;
      resize();
    }
  }

  function render(now) {
    const frameTime = Math.min(50, now - state.lastFrame);
    const dt = frameTime / 1000;
    state.lastFrame = now;
    state.paused = document.body.classList.contains("motion-paused");

    const deltaY = scrollY - state.lastScrollY;
    state.lastScrollY = scrollY;
    state.velocity = lerp(state.velocity, state.paused ? 0 : clamp(deltaY / 48, -1.6, 1.6), .12);
    state.scroll = lerp(state.scroll, state.scrollTarget, .055);
    state.scene = lerp(state.scene, state.sceneTarget, .052);
    state.sceneLocal = lerp(state.sceneLocal, state.sceneLocalTarget, .075);
    state.pointerX = lerp(state.pointerX, state.paused ? 0 : state.pointerTargetX, .05);
    state.pointerY = lerp(state.pointerY, state.paused ? 0 : state.pointerTargetY, .05);
    state.cursorX = lerp(state.cursorX, state.cursorTargetX, .18);
    state.cursorY = lerp(state.cursorY, state.cursorTargetY, .18);
    state.accent = state.accent.map((value, index) => lerp(value, state.accentTarget[index], .045));
    state.transition = Math.max(0, state.transition - dt * .82);
    if (!state.paused && !state.hidden) state.time += dt;

    updateSectionProgress();
    const root = document.documentElement;
    root.style.setProperty("--desi-v4-velocity", Math.min(1, Math.abs(state.velocity)).toFixed(4));
    root.style.setProperty("--desi-v4-scroll", state.scroll.toFixed(4));
    root.style.setProperty("--desi-v4-transition", state.transition.toFixed(4));
    root.style.setProperty("--desi-v4-cursor-x", `${state.cursorX}px`);
    root.style.setProperty("--desi-v4-cursor-y", `${state.cursorY}px`);

    if (state.gl && state.program && !state.hidden) {
      const gl = state.gl;
      gl.useProgram(state.program);
      gl.uniform2f(state.uniforms.resolution, state.width, state.height);
      gl.uniform1f(state.uniforms.time, state.time);
      gl.uniform1f(state.uniforms.scroll, state.scroll);
      gl.uniform1f(state.uniforms.velocity, state.velocity);
      gl.uniform1f(state.uniforms.scene, state.scene);
      gl.uniform1f(state.uniforms.local, state.sceneLocal);
      gl.uniform1f(state.uniforms.transition, state.transition);
      gl.uniform2f(state.uniforms.pointer, state.pointerX, state.pointerY);
      gl.uniform3f(state.uniforms.accent, state.accent[0], state.accent[1], state.accent[2]);
      gl.uniform1f(state.uniforms.quality, state.quality === 0 ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      adaptQuality(frameTime);
    }

    state.raf = requestAnimationFrame(render);
  }

  function cleanup() {
    cancelAnimationFrame(state.raf);
    state.sectionObserver?.disconnect();
    state.mutationObserver?.disconnect();
    state.resizeObserver?.disconnect();
  }

  async function init() {
    bootstrapCover();
    await addStylesheet();
    document.body.classList.add("desi-director-v4");
    createChrome();
    const webglReady = createCanvas();
    registerSections();
    observeDynamicSections();
    syncThemeColor();
    installInput();
    createLoader(webglReady);
    state.scene = state.sceneTarget = 0;
    state.raf = requestAnimationFrame(render);
    document.documentElement.classList.remove("desi-v4-booting");
    document.body.style.visibility = "";
    $("#desi-v4-bootstrap-style")?.remove();
    addEventListener("pagehide", cleanup, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
  else void init();
})();
