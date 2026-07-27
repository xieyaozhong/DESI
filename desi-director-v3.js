(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(pointer: fine)");

  const sectionNames = new Map([
    ["top", "ORIGIN"],
    ["crystal-passage", "CRYSTAL ARCHIVE"],
    ["wave", "SUPERPOSITION"],
    ["orbit", "ORBIT"],
    ["spiral", "GROWTH"],
    ["fractal", "INFINITE"],
    ["modular", "MODULAR FIELD"],
    ["fourier", "HARMONIC FIELD"],
    ["lorenz", "CHAOS"],
    ["cellular", "EMERGENCE"],
    ["ulam", "PRIME FIELD"],
    ["rose", "POLAR GARDEN"],
    ["closing", "FINAL FRAME"],
  ]);

  const state = {
    canvas: null,
    gl: null,
    program: null,
    uniforms: null,
    raf: 0,
    width: 0,
    height: 0,
    dpr: 1,
    time: 0,
    last: performance.now(),
    scroll: 0,
    scrollTarget: 0,
    velocity: 0,
    lastScrollY: scrollY,
    pointerX: 0,
    pointerY: 0,
    pointerTargetX: 0,
    pointerTargetY: 0,
    activeIndex: 0,
    sceneTarget: 0,
    scene: 0,
    accent: [0.55, 0.82, 0.94],
    accentTarget: [0.55, 0.82, 0.94],
    paused: false,
  };

  const vertexShader = `#version 300 es
  precision highp float;
  const vec2 verts[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
  void main(){
    vec2 p = verts[gl_VertexID];
    gl_Position = vec4(p,0.0,1.0);
  }`;

  const fragmentShader = `#version 300 es
  precision highp float;
  out vec4 outColor;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uScroll;
  uniform float uVelocity;
  uniform float uScene;
  uniform vec2 uPointer;
  uniform vec3 uAccent;
  uniform float uQuality;

  #define MAX_STEPS 72
  #define FAR 20.0

  mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
  float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
  }
  float fbm(vec2 p){ float v=0.0,a=.5; for(int i=0;i<5;i++){ v+=noise(p)*a; p=mat2(1.6,-1.2,1.2,1.6)*p+1.7; a*=.5;} return v; }

  float sdOcta(vec3 p,float s){ p=abs(p); return (p.x+p.y+p.z-s)*0.57735027; }
  vec3 opRotate(vec3 p,float a,float b){ p.xz*=rot(a); p.xy*=rot(b); return p; }

  float crystalField(vec3 p, out float material){
    float scenePhase=uScene*6.28318;
    float breathe=.05*sin(uTime*.55+scenePhase);
    vec3 q=p;
    q.y-=.12+breathe;
    q=opRotate(q,uTime*.11+uScroll*2.2+uPointer.x*.18,-.16+uPointer.y*.11);
    q/=vec3(.78,1.34,.78);
    float d=sdOcta(q,1.02)*.78;
    material=1.0;

    float explode=.42+.25*sin(uScroll*12.0+scenePhase);
    for(int i=0;i<7;i++){
      float fi=float(i);
      float a=fi*0.8976+scenePhase*.14;
      float r=1.25+explode*(.35+.18*sin(fi*2.4+uTime*.35));
      vec3 sPos=vec3(cos(a)*r, -.05+sin(fi*1.9)*.48, sin(a)*r*.55);
      vec3 sp=p-sPos;
      sp=opRotate(sp,-a+uTime*(.04+.008*fi),.35*sin(a));
      float shard=sdOcta(sp/vec3(.24,.52+.05*sin(fi),.20),.72)*.20;
      if(shard<d){d=shard; material=2.0;}
    }
    return d;
  }

  vec3 getNormal(vec3 p){
    float m; vec2 e=vec2(.0025,0.0);
    float d=crystalField(p,m);
    return normalize(vec3(
      crystalField(p+e.xyy,m)-d,
      crystalField(p+e.yxy,m)-d,
      crystalField(p+e.yyx,m)-d
    ));
  }

  mat3 camera(vec3 ro, vec3 ta){
    vec3 f=normalize(ta-ro);
    vec3 r=normalize(cross(f,vec3(0,1,0)));
    vec3 u=cross(r,f);
    return mat3(r,u,f);
  }

  vec3 sky(vec3 rd){
    float h=clamp(rd.y*.5+.5,0.0,1.0);
    vec3 low=vec3(.008,.012,.016);
    vec3 high=vec3(.035,.055,.067)+uAccent*.04;
    vec3 col=mix(low,high,pow(h,1.45));
    float sun=pow(max(dot(rd,normalize(vec3(-.35,.42,.72))),0.0),68.0);
    col+=uAccent*sun*.9;
    float haze=fbm(rd.xz*2.4+uTime*.015);
    col+=uAccent*(.012*haze)*(1.0-h);
    return col;
  }

  vec3 water(vec3 ro, vec3 rd){
    float denom=rd.y;
    if(abs(denom)<.001) return sky(rd);
    float t=(-1.05-ro.y)/denom;
    if(t<0.0) return sky(rd);
    vec3 p=ro+rd*t;
    float n=fbm(p.xz*.34+vec2(uTime*.025,-uTime*.018));
    float wave=sin(p.x*.58+uTime*.35)*.04+sin(p.z*.44-uTime*.29)*.035+(n-.5)*.09;
    vec3 normal=normalize(vec3(
      .10*cos(p.x*.58+uTime*.35)+(noise(p.xz*.6+3.1)-.5)*.08,
      1.0,
      .08*cos(p.z*.44-uTime*.29)+(noise(p.zx*.55+7.2)-.5)*.08
    ));
    vec3 refl=reflect(rd,normal);
    float fres=pow(1.0-max(dot(-rd,normal),0.0),3.0);
    vec3 deep=vec3(.004,.012,.016)+uAccent*.018;
    vec3 col=mix(deep,sky(refl),.28+.55*fres);
    float spec=pow(max(dot(refl,normalize(vec3(-.35,.42,.72))),0.0),110.0);
    col+=uAccent*spec*1.8;
    float grid=pow(max(0.0,.5-abs(fract((p.x+p.z*.4)*.04)-.5))*2.0,18.0);
    col+=uAccent*grid*.012;
    col+=wave*.025;
    float fog=1.0-exp(-t*.055);
    return mix(col,sky(rd),fog*.65);
  }

  vec3 render(vec2 fragCoord){
    vec2 uv=(fragCoord-.5*uResolution)/uResolution.y;
    float s=uScroll;
    float sceneWave=sin(uScene*.85)*.45;
    vec3 ro=vec3(
      sin(s*3.4+uScene*.18)*1.15+uPointer.x*.28,
      .58+sin(s*2.2)*.16+uPointer.y*.13,
      5.4-s*1.25+sceneWave
    );
    vec3 target=vec3(0.0,.02,-.2-uScene*.03);
    mat3 cam=camera(ro,target);
    float lens=1.7+.08*sin(uScene*.7)+abs(uVelocity)*.035;
    vec3 rd=normalize(cam*vec3(uv,lens));

    vec3 base=water(ro,rd);
    float t=0.0, material=0.0, glow=0.0;
    bool hit=false;
    int steps=int(mix(46.0,72.0,uQuality));
    for(int i=0;i<MAX_STEPS;i++){
      if(i>=steps) break;
      vec3 p=ro+rd*t;
      float mat;
      float d=crystalField(p,mat);
      glow+=exp(-18.0*abs(d))*.0035;
      if(d<.0018){hit=true; material=mat; break;}
      t+=d*.78;
      if(t>FAR) break;
    }

    vec3 col=base+uAccent*glow*(1.2+abs(uVelocity)*.55);
    if(hit){
      vec3 p=ro+rd*t;
      vec3 n=getNormal(p);
      vec3 lightDir=normalize(vec3(-.38,.72,.58));
      float diff=max(dot(n,lightDir),0.0);
      float rim=pow(1.0-max(dot(n,-rd),0.0),2.6);
      float edge=pow(1.0-abs(dot(n,-rd)),5.0);
      vec3 refl=sky(reflect(rd,n));
      vec3 glass=mix(vec3(.008,.015,.020),uAccent,.18+.10*material);
      col=mix(glass,refl,.32+.42*rim);
      col+=uAccent*(diff*.18+rim*.45+edge*.85);
      col+=vec3(.9,.96,1.0)*pow(max(dot(reflect(-lightDir,n),-rd),0.0),90.0)*1.4;
      float fog=1.0-exp(-t*.07);
      col=mix(col,base,fog*.42);
    }

    float vignette=1.0-smoothstep(.25,1.0,length(uv*.72));
    col*=.58+.42*vignette;
    float grain=(hash21(fragCoord+uTime*93.7)-.5)*(.018+.012*abs(uVelocity));
    col+=grain;
    float scan=.008*sin(fragCoord.y*1.18+uTime*4.0);
    col+=scan;
    col=pow(max(col,0.0),vec3(.86));
    return col;
  }

  void main(){
    vec3 col=render(gl_FragCoord.xy);
    outColor=vec4(col,1.0);
  }`;

  function addStylesheet() {
    if ($('link[data-desi-director-v3]')) return Promise.resolve();
    return new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "./desi-director-v3.css?v=20260728-director-v3";
      link.dataset.desiDirectorV3 = "true";
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", resolve, { once: true });
      document.head.appendChild(link);
      setTimeout(resolve, 1000);
    });
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) || "Unknown shader error";
      gl.deleteShader(shader);
      throw new Error(info);
    }
    return shader;
  }

  function createProgram(gl) {
    const program = gl.createProgram();
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Unable to link WebGL program");
    }
    return program;
  }

  function createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = "desi-director-webgl";
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
    });
    if (!gl) {
      document.body.classList.add("desi-v3-no-webgl");
      return false;
    }

    try {
      state.program = createProgram(gl);
    } catch (error) {
      console.error("DESI cinematic WebGL shader failed:", error);
      document.body.classList.add("desi-v3-no-webgl");
      return false;
    }

    state.gl = gl;
    state.uniforms = {
      resolution: gl.getUniformLocation(state.program, "uResolution"),
      time: gl.getUniformLocation(state.program, "uTime"),
      scroll: gl.getUniformLocation(state.program, "uScroll"),
      velocity: gl.getUniformLocation(state.program, "uVelocity"),
      scene: gl.getUniformLocation(state.program, "uScene"),
      pointer: gl.getUniformLocation(state.program, "uPointer"),
      accent: gl.getUniformLocation(state.program, "uAccent"),
      quality: gl.getUniformLocation(state.program, "uQuality"),
    };
    gl.useProgram(state.program);
    gl.bindVertexArray(gl.createVertexArray());
    resize();
    return true;
  }

  function resize() {
    if (!state.canvas || !state.gl) return;
    const mobile = innerWidth < 760;
    state.dpr = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.35);
    const width = Math.max(1, Math.floor(innerWidth * state.dpr));
    const height = Math.max(1, Math.floor(innerHeight * state.dpr));
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
    const viewport = document.createElement("div");
    viewport.className = "desi-v3-viewport";
    viewport.setAttribute("aria-hidden", "true");
    viewport.innerHTML = `
      <span class="desi-v3-line desi-v3-line-top"></span>
      <span class="desi-v3-line desi-v3-line-bottom"></span>
      <span class="desi-v3-line desi-v3-line-left"></span>
      <span class="desi-v3-line desi-v3-line-right"></span>
      <div class="desi-v3-shot"><small>SHOT</small><strong>01</strong><i>/</i><span>13</span></div>
      <div class="desi-v3-scene"><small>SCENE</small><strong>ORIGIN</strong></div>
      <div class="desi-v3-coordinate">25.03°N / 121.56°E</div>`;
    document.body.appendChild(viewport);

    const transition = document.createElement("div");
    transition.className = "desi-v3-transition";
    transition.setAttribute("aria-hidden", "true");
    transition.innerHTML = "<i></i><b></b>";
    document.body.appendChild(transition);
  }

  function createLoader(webglReady) {
    $$(".desi-cinematic-loader,.desi-v2-loader,.desi-v2-bootstrap").forEach((node) => node.remove());
    const loader = document.createElement("div");
    loader.className = "desi-v3-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-label", "DESI 3D 場景載入中");
    loader.innerHTML = `
      <div class="desi-v3-loader-curtain desi-v3-loader-curtain-a"></div>
      <div class="desi-v3-loader-curtain desi-v3-loader-curtain-b"></div>
      <div class="desi-v3-loader-core">
        <div class="desi-v3-loader-title"><strong>DESI</strong><span>INTERACTIVE MATHEMATICAL CINEMA</span></div>
        <div class="desi-v3-loader-track"><i></i></div>
        <div class="desi-v3-loader-meta"><span class="desi-v3-loader-phase">BOOTING OPTICAL FIELD</span><b>000%</b></div>
      </div>`;
    document.body.appendChild(loader);
    document.documentElement.classList.add("desi-v3-locked");

    if (reducedMotion.matches) {
      loader.remove();
      document.documentElement.classList.remove("desi-v3-locked");
      document.body.classList.add("desi-v3-ready");
      return;
    }

    const phase = $(".desi-v3-loader-phase", loader);
    const count = $(".desi-v3-loader-meta b", loader);
    const track = $(".desi-v3-loader-track i", loader);
    const start = performance.now();
    const duration = webglReady ? 2350 : 1500;

    const tick = (now) => {
      const raw = clamp((now - start) / duration);
      const eased = 1 - Math.pow(1 - raw, 2.8);
      const value = Math.min(100, Math.round(eased * 100));
      count.textContent = `${String(value).padStart(3, "0")}%`;
      track.style.width = `${value}%`;
      phase.textContent = value < 24 ? "BOOTING OPTICAL FIELD" : value < 51 ? "CALIBRATING CAMERA" : value < 78 ? "ASSEMBLING CRYSTAL WORLD" : value < 97 ? "SYNCING SCROLL TIMELINE" : "FIELD READY";
      if (raw < 1) return requestAnimationFrame(tick);
      loader.classList.add("is-charged");
      setTimeout(() => {
        loader.classList.add("is-opening");
        document.documentElement.classList.remove("desi-v3-locked");
        document.body.classList.add("desi-v3-ready");
      }, 220);
      setTimeout(() => loader.remove(), 1750);
    };
    requestAnimationFrame(tick);
  }

  function themeAccent() {
    const prism = $(".crystal-prism");
    const raw = prism?.style.getPropertyValue("--crystal-rgb").trim();
    if (!raw) return;
    const parts = raw.split(",").map((part) => clamp(Number(part.trim()) / 255));
    if (parts.length === 3 && parts.every(Number.isFinite)) state.accentTarget = parts;
  }

  function updateShot(index, section) {
    const total = Math.max(1, $$("main > section").length);
    const shot = $(".desi-v3-shot strong");
    const shotTotal = $(".desi-v3-shot span");
    const scene = $(".desi-v3-scene strong");
    if (shot) shot.textContent = String(index + 1).padStart(2, "0");
    if (shotTotal) shotTotal.textContent = String(total).padStart(2, "0");
    if (scene) scene.textContent = sectionNames.get(section.id) || section.id.replaceAll("-", " ").toUpperCase();
  }

  function playTransition() {
    if (reducedMotion.matches || state.paused) return;
    const node = $(".desi-v3-transition");
    if (!node?.animate) return;
    node.getAnimations().forEach((animation) => animation.cancel());
    node.animate([
      { opacity: 0, clipPath: "inset(0 100% 0 0)" },
      { opacity: 1, clipPath: "inset(0 0 0 0)", offset: .42 },
      { opacity: .4, clipPath: "inset(0 0 0 0)", offset: .58 },
      { opacity: 0, clipPath: "inset(0 0 0 100%)" },
    ], { duration: 980, easing: "cubic-bezier(.72,0,.18,1)" });
  }

  let sectionObserver = null;
  function registerSections() {
    const sections = $$("main > section");
    sections.forEach((section, index) => {
      section.classList.add("desi-v3-section");
      section.style.setProperty("--desi-v3-index", index);
    });

    sectionObserver?.disconnect();
    sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const section = visible.target;
      const index = $$("main > section").indexOf(section);
      if (index < 0 || index === state.activeIndex) return;
      state.activeIndex = index;
      state.sceneTarget = index;
      $$("main > section").forEach((node) => node.classList.toggle("desi-v3-active", node === section));
      section.classList.add("desi-v3-seen");
      updateShot(index, section);
      playTransition();
    }, { threshold: [.18, .36, .58], rootMargin: "-12% 0px -18% 0px" });
    sections.forEach((section) => sectionObserver.observe(section));
    sections[0]?.classList.add("desi-v3-active", "desi-v3-seen");
    updateShot(0, sections[0] || document.body);
  }

  function observeDynamicSections() {
    const main = $("main");
    if (!main || !("MutationObserver" in window)) return;
    let timer = 0;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(registerSections, 60);
    }).observe(main, { childList: true });
  }

  function installInput() {
    addEventListener("resize", resize, { passive: true });
    addEventListener("scroll", () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      state.scrollTarget = scrollY / max;
    }, { passive: true });

    if (finePointer.matches && !reducedMotion.matches) {
      addEventListener("pointermove", (event) => {
        state.pointerTargetX = (event.clientX / innerWidth - .5) * 2;
        state.pointerTargetY = (event.clientY / innerHeight - .5) * 2;
      }, { passive: true });
      addEventListener("pointerleave", () => {
        state.pointerTargetX = 0;
        state.pointerTargetY = 0;
      }, { passive: true });
    }

    $("#motion-toggle")?.addEventListener("click", () => {
      queueMicrotask(() => {
        state.paused = document.body.classList.contains("motion-paused");
      });
    });

    const prism = $(".crystal-prism");
    if (prism && "MutationObserver" in window) {
      new MutationObserver(themeAccent).observe(prism, { attributes: true, attributeFilter: ["style", "data-crystal-shape"] });
    }
    themeAccent();
  }

  function updateSectionProgress() {
    const center = innerHeight * .5;
    $$("main > section.desi-v3-section").forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -innerHeight || rect.top > innerHeight * 2) return;
      const local = clamp((center - rect.top) / Math.max(1, rect.height));
      const focus = clamp(1 - Math.abs((rect.top + rect.height * .5 - center) / (innerHeight * .86)));
      section.style.setProperty("--desi-v3-local", local.toFixed(4));
      section.style.setProperty("--desi-v3-focus", focus.toFixed(4));
    });
  }

  function render(now) {
    const dt = Math.min(.05, (now - state.last) / 1000);
    state.last = now;
    state.paused = document.body.classList.contains("motion-paused");

    const deltaY = scrollY - state.lastScrollY;
    state.lastScrollY = scrollY;
    state.velocity = lerp(state.velocity, clamp(deltaY / 52, -1.5, 1.5), .12);
    state.scroll = lerp(state.scroll, state.scrollTarget, .065);
    state.scene = lerp(state.scene, state.sceneTarget, .055);
    state.pointerX = lerp(state.pointerX, state.paused ? 0 : state.pointerTargetX, .05);
    state.pointerY = lerp(state.pointerY, state.paused ? 0 : state.pointerTargetY, .05);
    state.accent = state.accent.map((value, index) => lerp(value, state.accentTarget[index], .045));
    if (!state.paused) state.time += dt;

    updateSectionProgress();

    const gl = state.gl;
    if (gl && state.program) {
      gl.useProgram(state.program);
      gl.uniform2f(state.uniforms.resolution, state.width, state.height);
      gl.uniform1f(state.uniforms.time, state.time);
      gl.uniform1f(state.uniforms.scroll, state.scroll * 5.8);
      gl.uniform1f(state.uniforms.velocity, state.velocity);
      gl.uniform1f(state.uniforms.scene, state.scene);
      gl.uniform2f(state.uniforms.pointer, state.pointerX, state.pointerY);
      gl.uniform3f(state.uniforms.accent, state.accent[0], state.accent[1], state.accent[2]);
      gl.uniform1f(state.uniforms.quality, innerWidth < 760 ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    state.raf = requestAnimationFrame(render);
  }

  async function init() {
    document.documentElement.classList.add("desi-v3-booting");
    await addStylesheet();
    document.body.classList.add("desi-director-v3");
    createChrome();
    const webglReady = createCanvas();
    createLoader(webglReady);
    registerSections();
    observeDynamicSections();
    installInput();
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    state.scrollTarget = scrollY / max;
    state.scroll = state.scrollTarget;
    state.raf = requestAnimationFrame(render);
    document.documentElement.classList.remove("desi-v3-booting");
    addEventListener("pagehide", () => cancelAnimationFrame(state.raf), { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
  else void init();
})();
