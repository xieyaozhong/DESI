(() => {
  "use strict";
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(pointer: fine)");
  const paused = () => document.body.classList.contains("motion-paused");

  let raf = 0;
  let lastY = scrollY;
  let velocity = 0;
  let tx = 0;
  let ty = 0;
  let px = 0;
  let py = 0;
  let activeSection = null;
  let crystalShape = "";

  function bootstrapCover() {
    if (!document.querySelector("#desi-v2-bootstrap-style")) {
      const style = document.createElement("style");
      style.id = "desi-v2-bootstrap-style";
      style.textContent = ".desi-cinematic-loader:not(.desi-v2-loader){display:none!important}.desi-v2-bootstrap{position:fixed;z-index:10001;inset:0;background:#020304;pointer-events:none}";
      document.head.appendChild(style);
    }
    const cover = document.createElement("div");
    cover.className = "desi-v2-bootstrap";
    cover.setAttribute("aria-hidden", "true");
    document.body.appendChild(cover);
    return cover;
  }

  function styles() {
    const existing = document.querySelector('link[data-desi-cinematic-v2]');
    if (existing?.sheet) return Promise.resolve();
    return new Promise((resolve) => {
      const link = existing || document.createElement("link");
      if (!existing) {
        link.rel = "stylesheet";
        link.href = "./desi-cinematic-motion-v2.css?v=20260728-motion-v2";
        link.dataset.desiCinematicV2 = "true";
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
      setTimeout(done, 900);
    });
  }

  function layer(name, parent = document.body) {
    let node = $(`.${name}`, parent);
    if (!node) {
      node = document.createElement("div");
      node.className = name;
      node.setAttribute("aria-hidden", "true");
      parent.appendChild(node);
    }
    return node;
  }

  function chrome() {
    layer("desi-v2-haze");
    layer("desi-v2-shutter");
    layer("desi-v2-theme-wipe");
    const sticky = $(".crystal-sticky");
    if (sticky) {
      layer("desi-v2-caustic", sticky);
      layer("desi-v2-aperture", sticky);
    }
  }

  function ready() {
    document.documentElement.classList.remove("v2-locked");
    document.body.classList.add("cinema-v2-ready");
  }

  function loader() {
    const navigation = performance.getEntriesByType?.("navigation")?.[0];
    if (reduced.matches || navigation?.type === "back_forward") {
      ready();
      return;
    }
    document.documentElement.classList.add("v2-locked");
    const old = $(".desi-cinematic-loader:not(.desi-v2-loader)");
    old?.remove();
    const node = document.createElement("div");
    node.className = "desi-cinematic-loader desi-v2-loader";
    node.setAttribute("role", "status");
    node.setAttribute("aria-label", "DESI 互動場景載入中");
    node.innerHTML = `<div class="desi-v2-loader-panel desi-v2-loader-top"></div><div class="desi-v2-loader-panel desi-v2-loader-bottom"></div><div class="desi-v2-loader-scan"></div><div class="desi-v2-loader-inner"><div class="desi-v2-loader-mark"><strong>DESI</strong><span>MATHEMATICAL FIELD<br>OPTICAL ASSEMBLY / 2026</span></div><div class="desi-v2-loader-track"><i></i></div><div class="desi-v2-loader-meta"><span class="desi-v2-loader-phase">INITIALIZING FIELD</span><span class="desi-v2-loader-count">000%</span></div></div>`;
    document.body.appendChild(node);
    const count = $(".desi-v2-loader-count", node);
    const phase = $(".desi-v2-loader-phase", node);
    const start = performance.now();
    let shown = 0;
    const tick = (now) => {
      const raw = clamp((now - start) / 1600);
      const target = Math.round((1 - Math.pow(1 - raw, 2.4)) * 100);
      shown = Math.min(target, shown + Math.max(1, Math.ceil((target - shown) * .24)));
      node.style.setProperty("--v2-load", `${shown}%`);
      count.textContent = `${String(shown).padStart(3, "0")}%`;
      phase.textContent = shown < 34 ? "INITIALIZING FIELD" : shown < 72 ? "CALIBRATING OPTICS" : shown < 96 ? "ASSEMBLING CRYSTALS" : "FIELD READY";
      if (now - start < 1660 || shown < 100) return requestAnimationFrame(tick);
      node.classList.add("charged");
      setTimeout(() => {
        node.classList.add("opening");
        ready();
      }, 180);
      setTimeout(() => node.remove(), 1500);
    };
    requestAnimationFrame(tick);
  }

  function shutter() {
    if (reduced.matches || paused()) return;
    const node = $(".desi-v2-shutter");
    if (!node?.animate) return;
    node.getAnimations().forEach((a) => a.cancel());
    node.animate([
      { opacity: 0, transform: "translateX(-120%) skewX(-9deg)" },
      { opacity: .36, offset: .42 },
      { opacity: .09, transform: "translateX(115%) skewX(-9deg)", offset: .84 },
      { opacity: 0, transform: "translateX(135%) skewX(-9deg)" },
    ], { duration: 900, easing: "cubic-bezier(.16,.75,.18,1)" });
  }

  function sections() {
    const main = $("main");
    if (!main) return;
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("cinema-v2-entered", "cinema-v2-active");
              if (activeSection && activeSection !== entry.target) activeSection.classList.remove("cinema-v2-active");
              if (activeSection !== entry.target && entry.intersectionRatio > .28) shutter();
              activeSection = entry.target;
            } else if (!entry.intersectionRatio) {
              entry.target.classList.remove("cinema-v2-active");
            }
          });
        }, { rootMargin: "-12% 0 -18%", threshold: [0, .16, .28, .55] })
      : null;

    const register = (section) => {
      if (!(section instanceof HTMLElement) || !section.matches("main>section") || section.classList.contains("cinema-v2-section")) return;
      section.classList.add("cinema-v2-section");
      if (observer) observer.observe(section);
      else section.classList.add("cinema-v2-entered");
    };

    $$("main>section").forEach(register);
    if ("MutationObserver" in window) {
      new MutationObserver((records) => {
        records.forEach((record) => record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("section")) register(node);
          $$("section", node).forEach(register);
        }));
      }).observe(main, { childList: true });
    }
  }

  function crystalDirector() {
    const prism = $(".crystal-prism");
    const wipe = $(".desi-v2-theme-wipe");
    const aperture = $(".desi-v2-aperture");
    if (!prism || !("MutationObserver" in window)) return;
    crystalShape = prism.dataset.crystalShape || "";
    new MutationObserver(() => {
      const next = prism.dataset.crystalShape || "";
      if (!next || next === crystalShape) return;
      crystalShape = next;
      const rgb = prism.style.getPropertyValue("--crystal-rgb").trim() || "160,222,245";
      document.documentElement.style.setProperty("--v2-transition-rgb", rgb);
      if (!reduced.matches && !paused() && wipe?.animate) {
        wipe.getAnimations().forEach((a) => a.cancel());
        wipe.animate([
          { opacity: 0, transform: "skewX(-12deg) translateX(-230%)" },
          { opacity: .78, offset: .43 },
          { opacity: .17, transform: "skewX(-12deg) translateX(570%)", offset: .83 },
          { opacity: 0, transform: "skewX(-12deg) translateX(660%)" },
        ], { duration: 1080, easing: "cubic-bezier(.18,.78,.18,1)" });
        aperture?.animate?.([
          { opacity: .04, filter: "brightness(1)" },
          { opacity: .17, filter: "brightness(1.8)", offset: .42 },
          { opacity: .06, filter: "brightness(1)" },
        ], { duration: 1080, easing: "cubic-bezier(.18,.78,.18,1)" });
      }
      $$("#crystal-theme-rail button").forEach((button, i) => button.animate?.([
        { opacity: .38, transform: `translateX(${12 + i * 2}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ], { duration: 540, delay: i * 24, easing: "cubic-bezier(.16,.75,.18,1)" }));
    }).observe(prism, { attributes: true, attributeFilter: ["data-crystal-shape"] });
  }

  function magnetic() {
    if (!fine.matches || reduced.matches) return;
    $$(".button,.icon-button,.crystal-reshuffle").forEach((node) => {
      node.addEventListener("pointermove", (event) => {
        const r = node.getBoundingClientRect();
        node.style.transform = `translate3d(${((event.clientX-r.left)/r.width-.5)*6}px,${((event.clientY-r.top)/r.height-.5)*4}px,0)`;
      }, { passive: true });
      node.addEventListener("pointerleave", () => { node.style.transform = ""; }, { passive: true });
    });
  }

  function frame() {
    if (document.hidden) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const y = scrollY;
    if (paused()) { tx = 0; ty = 0; }
    const delta = paused() ? 0 : y - lastY;
    lastY = y;
    velocity = lerp(velocity, clamp(delta / 42, -1.6, 1.6), .13);
    px = lerp(px, tx, .055);
    py = lerp(py, ty, .055);
    const root = document.documentElement;
    const speed = Math.min(1, Math.abs(velocity));
    const global = clamp(y / Math.max(1, root.scrollHeight-innerHeight));
    root.style.setProperty("--v2-x", `${px*-5}px`);
    root.style.setProperty("--v2-y", `${py*-4}px`);
    root.style.setProperty("--v2-copy-x", `${px*-6}px`);
    root.style.setProperty("--v2-copy-y", `${py*-4+global*-14}px`);
    root.style.setProperty("--v2-object-x", `${px*15}px`);
    root.style.setProperty("--v2-object-y", `${py*11+global*-28}px`);
    root.style.setProperty("--v2-haze-x", `${50+px*18}%`);
    root.style.setProperty("--v2-haze-y", `${48+py*12}%`);
    root.style.setProperty("--v2-haze-rotate", `${210+global*18}deg`);
    root.style.setProperty("--v2-scan", String(.07+speed*.035));
    root.style.setProperty("--v2-reticle", String(1+speed*.015));
    document.body.classList.toggle("cinema-scrolling-down", velocity > .08 && y > 80);

    const center = innerHeight*.5;
    $$("main>section.cinema-v2-section").forEach((section) => {
      const r = section.getBoundingClientRect();
      if (r.bottom < -innerHeight || r.top > innerHeight*2) return;
      const p = clamp((center-r.top)/Math.max(1,r.height));
      const focus = clamp(1-Math.abs((r.top+r.height*.5-center)/(innerHeight*.82)));
      section.style.setProperty("--v2-section-shift", `${(.5-p)*38}px`);
      section.style.setProperty("--v2-section-scale", String(1+(1-focus)*.018));
    });

    const passage = $("#crystal-passage");
    const shell = $("#crystal-card-shell");
    if (passage && shell) {
      const r = passage.getBoundingClientRect();
      const p = clamp(-r.top/Math.max(1,r.height-innerHeight));
      root.style.setProperty("--v2-crystal-progress", p.toFixed(4));
      root.style.setProperty("--v2-caustic-x", `${px*20}px`);
      root.style.setProperty("--v2-caustic-y", `${(.5-p)*70}px`);
      root.style.setProperty("--v2-caustic-opacity", String(.16+p*.2));
      root.style.setProperty("--v2-caustic-angle", `${210+p*145}deg`);
      root.style.setProperty("--v2-aperture-opacity", String(.04+p*.06));
      root.style.setProperty("--v2-aperture-rotate", `${p*54}deg`);
      root.style.setProperty("--v2-aperture-scale", String(.82+p*.16));
      if (!reduced.matches && !paused()) {
        const desktop = innerWidth > 900;
        const yaw = desktop ? (p-.5)*16+px*3.5 : 0;
        const pitch = desktop ? Math.sin(p*Math.PI)*-4+py*-2.2 : 0;
        const lift = desktop ? Math.sin(p*Math.PI)*-10 : 0;
        const scale = desktop ? .95+Math.sin(p*Math.PI)*.075 : 1;
        shell.style.setProperty("transform", `translate3d(-50%,calc(-50% + ${lift}px),0) rotateX(${pitch.toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg) scale(${scale.toFixed(4)})`, "important");
        shell.style.setProperty("filter", `drop-shadow(0 ${44+p*18}px ${88+p*24}px rgba(0,0,0,.74)) saturate(${.7+p*.16})`);
      } else {
        shell.style.setProperty("transform", "translate3d(-50%,-50%,0) rotateX(0) rotateY(0) scale(1)", "important");
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function motion() {
    if (!reduced.matches && fine.matches) {
      addEventListener("pointermove", (event) => {
        tx = (event.clientX/innerWidth-.5)*2;
        ty = (event.clientY/innerHeight-.5)*2;
      }, { passive: true });
      addEventListener("pointerleave", () => { tx = 0; ty = 0; }, { passive: true });
    }
    raf = requestAnimationFrame(frame);
    addEventListener("pagehide", () => cancelAnimationFrame(raf), { once: true });
  }

  async function init() {
    const cover = bootstrapCover();
    await styles();
    chrome();
    sections();
    crystalDirector();
    magnetic();
    motion();
    loader();
    requestAnimationFrame(() => cover.remove());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
  else void init();
})();
