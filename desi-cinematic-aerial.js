(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function injectStyles() {
    if ($("#desi-cinematic-aerial-styles")) return;
    const style = document.createElement("style");
    style.id = "desi-cinematic-aerial-styles";
    style.textContent = `:root{--ink:#030405;--deep:#080b0e;--deep-2:#0d1217;--aqua:#aeeaff;--cyan:#75bedd;--violet:#a4a9c6;--pearl:#f1f5f6;--gold:#c9c0aa;--muted:#83909a;--line:rgba(224,239,244,.13);--line-strong:rgba(224,239,244,.28);--glass:rgba(7,11,14,.56);--cinematic-white:236,244,246;--cinematic-blue:137,214,244;--cinematic-black:3,4,5;--camera-x:0;--camera-y:0;--header-height:92px}html{background:#030405}body.desi-cinematic-aerial{background:radial-gradient(circle at 64% 18%,rgba(88,150,177,.13),transparent 31rem),radial-gradient(circle at 16% 52%,rgba(95,111,125,.08),transparent 36rem),linear-gradient(180deg,#030405 0%,#080b0e 38%,#030405 100%);color:var(--pearl);letter-spacing:.012em}body.desi-cinematic-aerial::before,body.desi-cinematic-aerial::after{content:"";position:fixed;inset:0;pointer-events:none}body.desi-cinematic-aerial::before{z-index:27;background:linear-gradient(180deg,rgba(0,0,0,.26),transparent 14%,transparent 82%,rgba(0,0,0,.58)),radial-gradient(ellipse at center,transparent 42%,rgba(0,0,0,.68) 100%);mix-blend-mode:multiply}body.desi-cinematic-aerial::after{z-index:28;opacity:.13;background:repeating-linear-gradient(180deg,transparent 0 3px,rgba(255,255,255,.018) 3px 4px)}.atmosphere{background:radial-gradient(circle at 61% 38%,rgba(94,174,204,.08),transparent 31%),linear-gradient(90deg,rgba(0,0,0,.75),transparent 22%,transparent 78%,rgba(0,0,0,.78)),linear-gradient(180deg,transparent 64%,rgba(0,0,0,.82))}.grain{z-index:29;opacity:.075;mix-blend-mode:soft-light;filter:contrast(1.35)}.hud-frame{inset:18px;border-color:rgba(232,244,247,.085)}.corner{width:36px;height:36px;opacity:.44}.corner::before,.corner::after{background:rgba(231,244,247,.75);box-shadow:none}.scroll-progress{height:1px;background:rgba(235,246,248,.94);box-shadow:0 0 14px rgba(140,216,245,.38)}.site-header{height:92px;padding-inline:max(var(--edge),34px);background:linear-gradient(180deg,rgba(3,4,5,.92),rgba(3,4,5,.42) 64%,transparent);backdrop-filter:blur(10px) saturate(.78)}.brand-mark{width:30px;height:30px;border-left-color:rgba(226,241,244,.4)}.brand-mark i{left:5px;width:20px;border-color:rgba(238,246,247,.88)}.brand strong{font-size:.78rem;letter-spacing:.28em;font-weight:520}.brand small,.chapter-nav,.motion-toggle,.telemetry,.panel-head,.chapter-index,.crystal-archive-head,.crystal-depth-readout,.crystal-scroll-hint,.eyebrow{text-transform:uppercase;letter-spacing:.22em}.brand small{color:rgba(213,226,230,.44);font-size:.43rem}.chapter-nav{gap:clamp(.7rem,1.6vw,1.7rem);font-size:.57rem}.chapter-nav a{color:rgba(224,236,239,.43)}.chapter-nav a::after{bottom:-11px;background:rgba(233,244,246,.88)}.chapter-nav span{color:rgba(144,207,231,.74)}.icon-button,.button,.crystal-reshuffle,.chip{border-radius:999px}.icon-button{border-color:rgba(226,239,242,.15);background:rgba(8,12,15,.44);backdrop-filter:blur(15px)}.section-shell{width:min(100%,1780px);padding-inline:clamp(26px,7.5vw,138px)}.hero{min-height:108svh;place-items:end start;padding-bottom:clamp(90px,14vh,160px)}.hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(3,4,5,.92) 0%,rgba(3,4,5,.56) 38%,rgba(3,4,5,.08) 72%),radial-gradient(circle at 72% 43%,rgba(134,213,244,.14),transparent 23rem)}.hero::after{right:-8%;bottom:-3%;left:35%;height:42%;opacity:.72;background:radial-gradient(ellipse,rgba(114,196,226,.16),transparent 69%);filter:blur(34px)}.hero-copy{width:min(100%,1120px);transform:translate3d(calc(var(--camera-x) * -5px),calc(var(--camera-y) * -4px),0);transition:transform 900ms cubic-bezier(.16,.72,.18,1)}.eyebrow{margin-bottom:28px;color:rgba(205,220,225,.52);font-size:clamp(.5rem,.62vw,.62rem)}.eyebrow::before{width:56px;background:rgba(231,242,244,.34)}.eyebrow span{color:rgba(158,222,246,.84)}.hero h1,.chapter h2,.closing h2,.desi-world-divider h2{font-family:"Helvetica Neue","Arial Nova","Noto Sans TC","PingFang TC",sans-serif;font-weight:260;letter-spacing:-.055em}.hero h1{max-width:8em;font-size:clamp(4.2rem,11vw,11.6rem);line-height:.83;text-transform:uppercase}.hero h1 em{color:transparent;-webkit-text-stroke:1px rgba(229,241,244,.74);text-shadow:0 0 34px rgba(123,203,234,.12)}.hero-lede{max-width:34rem;margin-top:32px;color:rgba(220,229,232,.62);font-size:clamp(.92rem,1.25vw,1.12rem);line-height:1.9}.hero-actions{margin-top:36px;gap:12px}.button{min-height:50px;padding:0 24px;border:1px solid rgba(228,240,243,.2);font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;backdrop-filter:blur(15px)}.button-primary{background:rgba(231,241,243,.94);color:#050607;box-shadow:0 14px 40px rgba(0,0,0,.27)}.button-primary:hover{background:#fff}.button-ghost{background:rgba(7,11,14,.32);color:rgba(229,239,241,.75)}.hero-object{right:clamp(4vw,10vw,170px);top:46%;width:min(45vw,660px);opacity:.78;transform:translate3d(calc(var(--camera-x) * 13px),calc(-50% + var(--camera-y) * 10px),0) scale(1.04);filter:grayscale(.24) saturate(.68) contrast(1.1);transition:transform 1200ms cubic-bezier(.16,.72,.18,1),filter 600ms ease}.orbital{border-color:rgba(199,228,238,.18);box-shadow:inset 0 0 38px rgba(111,189,219,.035),0 0 28px rgba(111,189,219,.035)}.light-core{background:radial-gradient(circle at 42% 34%,rgba(255,255,255,.95),rgba(178,224,242,.5) 11%,rgba(51,84,99,.25) 38%,rgba(4,7,9,.93) 72%);box-shadow:0 0 90px rgba(130,208,238,.18),inset -22px -28px 48px rgba(0,0,0,.7)}.axis-label,.orbital-index,.scroll-cue{color:rgba(213,228,233,.38)}.scroll-cue i{background:linear-gradient(180deg,rgba(235,244,246,.84),transparent)}.crystal-sticky{background:radial-gradient(circle at 51% 46%,rgba(110,188,218,.1),transparent 28rem),linear-gradient(180deg,rgba(2,3,4,.97),rgba(7,10,13,.98))}.crystal-sticky::before{background:linear-gradient(rgba(205,231,239,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(205,231,239,.018) 1px,transparent 1px);background-size:92px 92px;mask-image:radial-gradient(circle at center,black,transparent 68%)}.crystal-sticky::after{opacity:.18;background:linear-gradient(90deg,transparent,rgba(238,247,248,.72),transparent);box-shadow:0 0 24px rgba(139,213,241,.28)}.crystal-archive-head{color:rgba(211,225,229,.33);font-size:.45rem}.crystal-archive-head>span:first-child{color:rgba(222,238,242,.7)}.crystal-card-shell{width:clamp(390px,58vw,830px);filter:drop-shadow(0 42px 80px rgba(0,0,0,.68)) saturate(.8);transform-style:preserve-3d}.crystal-shard-body{background:linear-gradient(128deg,rgba(255,255,255,.22),transparent 18%),conic-gradient(from 126deg at 50% 48%,rgba(229,244,247,.34),rgba(var(--crystal-rgb),.11) 16%,rgba(16,25,31,.9) 34%,rgba(109,119,142,.24) 57%,rgba(2,4,6,.97) 78%,rgba(222,239,243,.25));filter:drop-shadow(0 34px 65px rgba(0,0,0,.74)) drop-shadow(0 0 36px rgba(var(--crystal-rgb),.11))}.crystal-shard-depth{background:linear-gradient(148deg,rgba(81,111,124,.22),rgba(1,3,4,.98) 65%);opacity:.48}.crystal-topic-face{background:rgba(4,7,9,.88);box-shadow:inset 0 0 0 1px rgba(228,241,244,.2),inset 0 0 70px rgba(var(--crystal-rgb),.035)}.crystal-topic-card{background:radial-gradient(circle at 72% 25%,rgba(var(--crystal-rgb),.11),transparent 38%),linear-gradient(160deg,rgba(12,18,22,.93),rgba(2,4,5,.97))}.crystal-card-glass{background:linear-gradient(145deg,rgba(255,255,255,.12),transparent 20%),linear-gradient(32deg,transparent 59%,rgba(180,190,205,.08) 60%,transparent 75%),linear-gradient(180deg,transparent 38%,rgba(0,0,0,.72));mix-blend-mode:screen}.crystal-card-copy h2{font-family:"Helvetica Neue","Arial Nova","Noto Sans TC",sans-serif;font-weight:260;letter-spacing:-.045em}.crystal-card-meta,#crystal-description,.crystal-face-id{color:rgba(215,229,232,.55)}#crystal-formula{color:rgba(229,225,211,.85)}.crystal-theme-rail button{color:rgba(205,221,226,.28)}.crystal-theme-rail button.is-active{color:rgba(240,247,248,.94)}.chapter{min-height:max(106svh,860px)}.chapter::before{inset:4% 1.5%;border-color:rgba(225,239,242,.055);background:linear-gradient(90deg,rgba(5,8,10,.9),rgba(5,8,10,.16)),radial-gradient(circle at 76% 50%,rgba(var(--extra-accent,130,205,235),.035),transparent 34rem);backdrop-filter:blur(7px) saturate(.7)}.chapter-alt::before{background:linear-gradient(270deg,rgba(5,8,10,.9),rgba(5,8,10,.16)),radial-gradient(circle at 24% 50%,rgba(var(--extra-accent,130,205,235),.035),transparent 34rem)}.chapter-grid{grid-template-columns:minmax(280px,.68fr) minmax(460px,1.48fr);gap:clamp(46px,8vw,138px)}.chapter h2{font-size:clamp(3.2rem,6.6vw,7.4rem);line-height:.94}.chapter-intro{max-width:34rem;color:rgba(214,226,230,.56);line-height:1.9}.formula,.challenge,.lesson-result{border-color:rgba(225,239,242,.12);background:rgba(5,9,12,.38);backdrop-filter:blur(12px)}.formula{color:rgba(231,237,235,.84)}.challenge span,.lesson-result strong{color:rgba(156,218,242,.8)}.lab-panel{border-color:rgba(225,239,242,.12);background:rgba(4,7,9,.72);box-shadow:0 38px 90px rgba(0,0,0,.36),inset 0 0 0 1px rgba(255,255,255,.012);backdrop-filter:blur(16px) saturate(.72)}.canvas-wrap{background:#030506}.controls{background:rgba(5,8,10,.9)}.control{border-color:rgba(223,238,241,.09)}input[type="range"]{accent-color:rgba(169,222,242,.88)}.lab-crystal{opacity:.48;filter:grayscale(.25) saturate(.72) drop-shadow(0 0 18px rgba(var(--crystal-rgb),.24))}.desi-world-divider::before{background:linear-gradient(90deg,transparent,rgba(226,239,242,.28),transparent)}.desi-world-divider p{color:rgba(204,219,224,.38)}.desi-world-divider h2 em{color:rgba(166,221,242,.88)}.closing{background:radial-gradient(circle at 50% 48%,rgba(91,170,201,.1),transparent 24rem),linear-gradient(180deg,#050708,#020303)}.site-footer{border-top-color:rgba(225,239,242,.09);color:rgba(203,218,222,.38);background:#030405}.desi-cinematic-horizon{position:fixed;z-index:24;right:24px;bottom:22px;left:24px;height:28px;pointer-events:none;opacity:.34;border-top:1px solid rgba(226,240,243,.14)}.desi-cinematic-horizon::before,.desi-cinematic-horizon::after{content:"";position:absolute;top:-3px;width:7px;height:7px;border:1px solid rgba(226,240,243,.28);transform:rotate(45deg)}.desi-cinematic-horizon::before{left:15%}.desi-cinematic-horizon::after{right:15%}.desi-camera-reticle{position:fixed;z-index:23;top:50%;left:50%;width:min(68vw,920px);aspect-ratio:16 / 9;pointer-events:none;opacity:.07;border:1px solid rgba(225,239,242,.36);transform:translate(-50%,-50%)}.desi-camera-reticle::before,.desi-camera-reticle::after{content:"";position:absolute;background:rgba(225,239,242,.36)}.desi-camera-reticle::before{top:50%;left:0;width:100%;height:1px}.desi-camera-reticle::after{top:0;left:50%;width:1px;height:100%}.desi-cinematic-loader{position:fixed;z-index:9999;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 50% 46%,rgba(95,170,199,.11),transparent 27rem),#030405;color:rgba(238,246,247,.9);transition:opacity 700ms cubic-bezier(.2,.7,.2,1),visibility 700ms}.desi-cinematic-loader.is-complete{opacity:0;visibility:hidden}.desi-loader-inner{width:min(82vw,760px);display:grid;gap:24px}.desi-loader-mark{display:flex;align-items:baseline;justify-content:space-between;gap:20px}.desi-loader-mark strong{font-family:"Helvetica Neue","Arial Nova",sans-serif;font-size:clamp(2.8rem,8vw,7.6rem);font-weight:200;letter-spacing:-.06em}.desi-loader-mark span,.desi-loader-meta{color:rgba(207,222,226,.46);font-family:var(--mono);font-size:.52rem;letter-spacing:.2em}.desi-loader-track{position:relative;height:1px;background:rgba(225,239,242,.13);overflow:hidden}.desi-loader-track i{position:absolute;inset:0 auto 0 0;width:var(--load-progress,0%);background:rgba(236,245,247,.92);box-shadow:0 0 20px rgba(137,214,244,.42);transition:width 100ms linear}.desi-loader-meta{display:flex;justify-content:space-between}@media (max-width:1080px){.hero-object{right:-9vw;width:min(58vw,620px);opacity:.6}}@media (max-width:900px){:root{--header-height:76px}.site-header{height:76px;padding-inline:22px}.section-shell{padding-inline:24px}.hero{min-height:100svh;padding-bottom:15vh}.hero::before{background:linear-gradient(180deg,rgba(3,4,5,.15) 0%,rgba(3,4,5,.3) 38%,rgba(3,4,5,.94) 78%),radial-gradient(circle at 52% 28%,rgba(134,213,244,.13),transparent 20rem)}.hero-copy{transform:none}.hero-object{top:31%;right:50%;width:min(96vw,560px);transform:translate(50%,-50%);opacity:.56}.hero h1{font-size:clamp(3.6rem,18vw,7.5rem)}.chapter{min-height:0}.chapter-grid{grid-template-columns:1fr}.chapter h2{font-size:clamp(2.9rem,12vw,5rem)}.desi-camera-reticle{width:calc(100vw - 38px);opacity:.045}}@media (max-width:560px){.hud-frame{inset:8px}.desi-cinematic-horizon{right:12px;bottom:10px;left:12px}.hero-actions{align-items:stretch;flex-direction:column}.button{width:100%}.crystal-card-shell{width:calc(100% - 28px)}.desi-loader-mark{align-items:flex-end}.desi-loader-mark span{max-width:9rem;text-align:right}}@media (prefers-reduced-motion:reduce){.hero-copy,.hero-object{transform:none !important;transition:none !important}.desi-cinematic-loader{display:none}}`;
    document.head.appendChild(style);
  }

  function addCinematicChrome() {
    if (!$('body > .desi-cinematic-horizon')) {
      const horizon = document.createElement("div");
      horizon.className = "desi-cinematic-horizon";
      horizon.setAttribute("aria-hidden", "true");
      document.body.appendChild(horizon);
    }

    if (!$('body > .desi-camera-reticle')) {
      const reticle = document.createElement("div");
      reticle.className = "desi-camera-reticle";
      reticle.setAttribute("aria-hidden", "true");
      document.body.appendChild(reticle);
    }
  }

  function updateCopy() {
    const brandSmall = $(".brand small");
    if (brandSmall) brandSmall.textContent = "INTERACTIVE MATHEMATICS / FIELD STUDY";

    const heroEyebrow = $("#top .eyebrow");
    if (heroEyebrow) heroEyebrow.innerHTML = "<span>00</span> CINEMATIC MATHEMATICAL FIELD";

    const leftTelemetry = $(".hero-telemetry.telemetry-left");
    if (leftTelemetry) {
      leftTelemetry.innerHTML = "<span>DESI / FIELD 00</span><span>LENS 24MM</span><span>DEPTH / INFINITE</span>";
    }

    const rightTelemetry = $(".hero-telemetry.telemetry-right");
    if (rightTelemetry) {
      rightTelemetry.innerHTML = "<span>CAMERA / EXPLORE</span><span>LIGHT / REFRACTED</span><span>STATUS / LIVE</span>";
    }

    const archiveLabel = $(".crystal-archive-head > span:first-child");
    if (archiveLabel) archiveLabel.textContent = "CRYSTAL FIELD / LIVE STUDY";

    const liveProjection = $(".crystal-face-id span:last-child");
    if (liveProjection) liveProjection.textContent = "LIVE OPTICAL FIELD";
  }

  function installLoader() {
    if (reducedMotion.matches || $(".desi-cinematic-loader")) return;

    const loader = document.createElement("div");
    loader.className = "desi-cinematic-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-label", "DESI 互動場景載入中");
    loader.innerHTML = `
      <div class="desi-loader-inner">
        <div class="desi-loader-mark"><strong>DESI</strong><span>MATHEMATICAL FIELD<br>INTERACTIVE STUDY</span></div>
        <div class="desi-loader-track"><i></i></div>
        <div class="desi-loader-meta"><span>SYSTEM LOADING</span><span class="desi-loader-count">000%</span></div>
      </div>`;
    document.body.appendChild(loader);

    let progress = 0;
    const started = performance.now();
    const count = $(".desi-loader-count", loader);
    const track = $(".desi-loader-track", loader);

    const tick = (now) => {
      const elapsed = now - started;
      const target = Math.min(100, Math.round((elapsed / 1050) * 100));
      progress += Math.max(1, Math.ceil((target - progress) * .28));
      progress = Math.min(progress, target);
      if (count) count.textContent = `${String(progress).padStart(3, "0")}%`;
      if (track) track.style.setProperty("--load-progress", `${progress}%`);

      if (elapsed < 1120 || progress < 100) {
        requestAnimationFrame(tick);
      } else {
        loader.classList.add("is-complete");
        setTimeout(() => loader.remove(), 760);
      }
    };
    requestAnimationFrame(tick);
  }

  function installCameraParallax() {
    if (reducedMotion.matches || !matchMedia("(pointer:fine)").matches) return;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const render = () => {
      currentX += (targetX - currentX) * .065;
      currentY += (targetY - currentY) * .065;
      document.documentElement.style.setProperty("--camera-x", currentX.toFixed(3));
      document.documentElement.style.setProperty("--camera-y", currentY.toFixed(3));
      frame = requestAnimationFrame(render);
    };

    addEventListener("pointermove", (event) => {
      targetX = (event.clientX / innerWidth - .5) * 2;
      targetY = (event.clientY / innerHeight - .5) * 2;
    }, { passive: true });

    addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
    }, { passive: true });

    frame = requestAnimationFrame(render);
    addEventListener("pagehide", () => cancelAnimationFrame(frame), { once: true });
  }

  function installSectionDepth() {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("cinematic-in-frame", entry.isIntersecting);
      });
    }, { rootMargin: "-12% 0px -18% 0px", threshold: .16 });
    $$("main > section").forEach((section) => observer.observe(section));
  }

  function init() {
    document.body.classList.add("desi-cinematic-aerial");
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", "#030405");
    injectStyles();
    addCinematicChrome();
    updateCopy();
    installLoader();
    installCameraParallax();
    installSectionDepth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
