(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(pointer: fine)");

  const sceneMeta = new Map([
    ["top", ["ORIGIN", "WATERLIGHT DOMAIN"]],
    ["crystal-passage", ["ARCHIVE", "CRYSTAL ASSEMBLY"]],
    ["wave", ["SUPERPOSITION", "INTERFERENCE FIELD"]],
    ["orbit", ["ORBIT", "HARMONIC TRAJECTORY"]],
    ["spiral", ["GROWTH", "EXPONENTIAL FIELD"]],
    ["fractal", ["INFINITE", "BOUNDARY ITERATION"]],
    ["modular", ["MODULAR", "ARITHMETIC CHORDS"]],
    ["fourier", ["HARMONIC", "FREQUENCY ASSEMBLY"]],
    ["lorenz", ["CHAOS", "ATTRACTOR FIELD"]],
    ["cellular", ["EMERGENCE", "CELLULAR WORLD"]],
    ["ulam", ["PRIME", "NUMBER CONSTELLATION"]],
    ["rose", ["POLAR", "TRIGONOMETRIC GARDEN"]],
    ["system-note", ["CRAFT", "BUILT IN THE BROWSER"]],
    ["closing", ["FINAL FRAME", "THE RULE CONTINUES"]],
  ]);

  const state = {
    sections: [],
    activeSection: null,
    activeIndex: -1,
    observer: null,
    mutationObserver: null,
    prismObserver: null,
    raf: 0,
    idleTimer: 0,
    titleTimer: 0,
    lastScrollY: scrollY,
    velocity: 0,
    pointerX: 0,
    pointerY: 0,
    pointerTargetX: 0,
    pointerTargetY: 0,
    focus: 0,
    suspended: false,
  };

  function addStylesheet() {
    const existing = $('link[data-desi-director-v6]');
    if (existing?.sheet) return Promise.resolve();
    return new Promise((resolve) => {
      const link = existing || document.createElement("link");
      if (!existing) {
        link.rel = "stylesheet";
        link.href = "./desi-director-v6.css?v=20260809-portfolio-r14";
        link.dataset.desiDirectorV6 = "true";
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
      setTimeout(done, 1000);
    });
  }

  function makeLayer(className, html = "") {
    let element = $(`.${className}`);
    if (element) return element;
    element = document.createElement("div");
    element.className = className;
    element.setAttribute("aria-hidden", "true");
    element.innerHTML = html;
    document.body.appendChild(element);
    return element;
  }

  function createCinemaChrome() {
    makeLayer("desi-v6-grade");
    makeLayer("desi-v6-bloom");
    makeLayer("desi-v6-foreground", "<i></i><i></i><i></i>");
    makeLayer("desi-v6-cut");
    makeLayer("desi-v6-glare");
    makeLayer(
      "desi-v6-title-card",
      '<span class="desi-v6-title-number">SCENE 01</span><strong>ORIGIN</strong><small>WATERLIGHT DOMAIN</small>',
    );
    makeLayer("desi-v6-progress", "<i></i>");
  }

  function headingFor(section) {
    return $("h1,h2", section)?.textContent.replace(/\s+/g, " ").trim() || "";
  }

  function registerSections() {
    state.observer?.disconnect();
    state.sections = $$('main > section');
    state.sections.forEach((section, index) => {
      section.classList.add("desi-v6-section");
      section.dataset.desiV6Index = String(index);
      const heading = $("h1,h2", section);
      heading?.classList.add("desi-v6-heading");
    });

    if (!("IntersectionObserver" in window)) {
      state.sections.forEach((section) => section.classList.add("desi-v6-entered"));
      return;
    }

    state.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("desi-v6-entered");
        });
      },
      { rootMargin: "-8% 0px -10% 0px", threshold: 0.1 },
    );
    state.sections.forEach((section) => state.observer.observe(section));
  }

  function observeDynamicSections() {
    const main = $("main");
    if (!main || !("MutationObserver" in window)) return;
    state.mutationObserver?.disconnect();
    let timer = 0;
    state.mutationObserver = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(registerSections, 100);
    });
    state.mutationObserver.observe(main, { childList: true });
  }

  function syncThemeColor() {
    const prism = $(".crystal-prism");
    if (!prism) return;
    const sync = () => {
      const rgb = prism.style.getPropertyValue("--crystal-rgb").trim() || "151, 211, 235";
      document.documentElement.style.setProperty("--v6-rgb", rgb);
    };
    sync();
    if (!("MutationObserver" in window)) return;
    state.prismObserver?.disconnect();
    state.prismObserver = new MutationObserver(sync);
    state.prismObserver.observe(prism, {
      attributes: true,
      attributeFilter: ["style", "data-crystal-shape"],
    });
  }

  function updateTitleCard(section, index) {
    const card = $(".desi-v6-title-card");
    if (!card || !section) return;
    const [code, descriptor] = sceneMeta.get(section.id) || ["FIELD", `SCENE ${String(index + 1).padStart(2, "0")}`];
    $(".desi-v6-title-number", card).textContent = `SCENE ${String(index + 1).padStart(2, "0")}`;
    $("strong", card).textContent = code;
    $("small", card).textContent = headingFor(section) || descriptor;
    card.classList.remove("is-visible");
    requestAnimationFrame(() => card.classList.add("is-visible"));
    clearTimeout(state.titleTimer);
    state.titleTimer = setTimeout(() => card.classList.remove("is-visible"), 1450);
  }

  function playCut(direction) {
    if (reducedMotion.matches || document.body.classList.contains("motion-paused")) return;
    const cut = $(".desi-v6-cut");
    const glare = $(".desi-v6-glare");
    if (!cut?.animate || !glare?.animate) return;
    cut.getAnimations().forEach((animation) => animation.cancel());
    glare.getAnimations().forEach((animation) => animation.cancel());
    const start = direction < 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
    const end = direction < 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
    cut.animate(
      [
        { opacity: 0, clipPath: start },
        { opacity: 0.82, clipPath: "inset(0 0 0 0)", offset: 0.38 },
        { opacity: 0.2, clipPath: "inset(0 0 0 0)", offset: 0.64 },
        { opacity: 0, clipPath: end },
      ],
      { duration: 920, easing: "cubic-bezier(.18,.78,.18,1)" },
    );
    glare.animate(
      [
        { opacity: 0, transform: `translateX(${direction < 0 ? 150 : -150}%) skewX(-12deg)` },
        { opacity: 0.9, offset: 0.42 },
        { opacity: 0, transform: `translateX(${direction < 0 ? -150 : 150}%) skewX(-12deg)` },
      ],
      { duration: 980, easing: "cubic-bezier(.16,.78,.18,1)" },
    );
  }

  function activate(section, index, focus) {
    if (!section || state.activeSection === section) return;
    const previous = state.activeIndex;
    state.activeSection?.classList.remove("desi-v6-active");
    section.classList.add("desi-v6-active");
    state.activeSection = section;
    state.activeIndex = index;
    document.body.classList.toggle("is-crystal-archive", section.id === "crystal-passage");
    document.documentElement.style.setProperty("--v6-scene", String(index));
    updateTitleCard(section, index);
    if (previous >= 0 && scrollY > innerHeight * 0.25 && focus > 0.3) {
      playCut(index < previous ? -1 : 1);
    }
  }

  function markMoving() {
    requestFrame();
    document.body.classList.add("desi-v6-moving");
    document.body.classList.remove("desi-v6-settled");
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => {
      document.body.classList.remove("desi-v6-moving", "desi-v6-fast");
      document.body.classList.add("desi-v6-settled");
    }, 170);
  }

  function installInput() {
    addEventListener("scroll", markMoving, { passive: true });
    addEventListener("resize", requestFrame, { passive: true });
    if (finePointer.matches && !reducedMotion.matches) {
      addEventListener(
        "pointermove",
        (event) => {
          state.pointerTargetX = (event.clientX / innerWidth - 0.5) * 2;
          state.pointerTargetY = (event.clientY / innerHeight - 0.5) * 2;
        },
        { passive: true },
      );
      addEventListener("pointerleave", () => {
        state.pointerTargetX = 0;
        state.pointerTargetY = 0;
      }, { passive: true });
    }
    $("#motion-toggle")?.addEventListener("click", () => setTimeout(requestFrame, 0));
    reducedMotion.addEventListener?.("change", requestFrame);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) requestFrame();
    });
  }

  function installMagneticButtons() {
    if (!finePointer.matches || reducedMotion.matches) return;
    $$(".button,.icon-button,.crystal-reshuffle").forEach((button) => {
      if (button.dataset.desiV6Magnetic) return;
      button.dataset.desiV6Magnetic = "true";
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        button.style.transform = `translate3d(${x * 5}px,${y * 3}px,0)`;
      }, { passive: true });
      button.addEventListener("pointerleave", () => {
        button.style.transform = "";
      }, { passive: true });
    });
  }

  function updateSectionFocus() {
    if (!state.sections.length) return;
    const center = innerHeight * 0.52;
    let best = { section: state.sections[0], index: 0, distance: Infinity, focus: 0 };

    state.sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -innerHeight || rect.top > innerHeight * 2) return;
      const local = clamp((center - rect.top) / Math.max(1, rect.height));
      const isStickyArchive =
        section.id === "crystal-passage" &&
        rect.top <= center &&
        rect.bottom >= center;
      const distance = isStickyArchive
        ? 0
        : Math.abs(rect.top + rect.height * 0.5 - center);
      const focus = isStickyArchive
        ? 1
        : clamp(1 - distance / (innerHeight * 0.88));
      const opacity = 0.14 + focus * 0.86;
      const blur = (1 - focus) * 5.2;
      const translate = (0.5 - local) * 72;
      const scale = 0.987 + focus * 0.013;
      const brightness = 0.78 + focus * 0.22;
      const archiveOpacity = 0.22 + focus * 0.78;
      const crystalBrightness = 0.88 + focus * 0.18;
      section.style.setProperty("--v6-local", local.toFixed(4));
      section.style.setProperty("--v6-focus", focus.toFixed(4));
      section.style.setProperty("--v6-opacity", opacity.toFixed(4));
      section.style.setProperty("--v6-blur", `${blur.toFixed(2)}px`);
      section.style.setProperty("--v6-shift", `${translate.toFixed(2)}px`);
      section.style.setProperty("--v6-scale", scale.toFixed(4));
      section.style.setProperty("--v6-brightness", brightness.toFixed(4));
      section.style.setProperty("--v6-archive-opacity", archiveOpacity.toFixed(4));
      section.style.setProperty("--v6-crystal-brightness", crystalBrightness.toFixed(4));
      if (distance < best.distance) best = { section, index, distance, focus };
    });

    state.focus = lerp(state.focus, best.focus, 0.08);
    activate(best.section, best.index, best.focus);
  }

  function updateCanvas(speed) {
    const canvas = $("#desi-director-webgl-v4");
    if (!canvas) return;
    const mobile = innerWidth < 760;
    const scale = 1.002 + speed * (mobile ? 0.002 : 0.011);
    const x = mobile ? 0 : state.pointerX * 4.5 + state.velocity * 1.6;
    const y = mobile ? 0 : state.pointerY * 3.2;
    const blur = mobile ? 0 : speed * 0.28;
    const contrast = 1.025 + speed * 0.055;
    const brightness = 0.93 + state.focus * 0.07;
    const saturation = 0.76 + state.focus * 0.15;
    canvas.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
    canvas.style.filter = `contrast(${contrast.toFixed(3)}) brightness(${brightness.toFixed(3)}) saturate(${saturation.toFixed(3)}) blur(${blur.toFixed(2)}px)`;
  }

  function requestFrame() {
    if (state.suspended || state.raf) return;
    state.raf = requestAnimationFrame(frame);
  }

  function frame() {
    state.raf = 0;
    if (state.suspended) return;
    const paused = document.body.classList.contains("motion-paused");
    const currentY = scrollY;
    const delta = currentY - state.lastScrollY;
    state.lastScrollY = currentY;
    state.velocity = lerp(state.velocity, paused ? 0 : clamp(delta / 46, -1.8, 1.8), 0.13);
    state.pointerX = lerp(state.pointerX, paused ? 0 : state.pointerTargetX, 0.055);
    state.pointerY = lerp(state.pointerY, paused ? 0 : state.pointerTargetY, 0.055);

    updateSectionFocus();

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = clamp(currentY / maxScroll);
    const speed = Math.min(1, Math.abs(state.velocity));
    const root = document.documentElement;
    root.style.setProperty("--v6-progress", progress.toFixed(5));
    root.style.setProperty("--v6-speed", speed.toFixed(4));
    root.style.setProperty("--v6-focus-global", state.focus.toFixed(4));
    root.style.setProperty("--v6-x", `${(state.pointerX * 18).toFixed(2)}px`);
    root.style.setProperty("--v6-y", `${(state.pointerY * 12).toFixed(2)}px`);
    root.style.setProperty("--v6-hero-x", `${(state.pointerX * -2.88).toFixed(2)}px`);
    root.style.setProperty("--v6-hero-y", `${(state.pointerY * -1.44).toFixed(2)}px`);
    root.style.setProperty("--v6-object-x", `${(state.pointerX * 7.56).toFixed(2)}px`);
    root.style.setProperty("--v6-object-y", `${(state.pointerY * 3.6).toFixed(2)}px`);
    root.style.setProperty("--v6-copy-x", `${(state.pointerX * -0.81).toFixed(2)}px`);
    root.style.setProperty("--v6-panel-x", `${(state.pointerX * 0.63).toFixed(2)}px`);
    root.style.setProperty("--v6-streak-a", `${(state.pointerX * 14.4).toFixed(2)}px`);
    root.style.setProperty("--v6-streak-b", `${(state.pointerX * -9.9).toFixed(2)}px`);
    root.style.setProperty("--v6-dir", state.velocity < 0 ? "-1" : "1");
    root.style.setProperty("--v6-letterbox", `${(speed * 4.5).toFixed(2)}vh`);
    root.style.setProperty("--v6-grade-top", (0.11 + speed * 0.1).toFixed(4));
    root.style.setProperty("--v6-grade-bottom", (0.38 + speed * 0.14).toFixed(4));
    root.style.setProperty("--v6-bloom-opacity", (0.08 + state.focus * 0.11).toFixed(4));
    root.style.setProperty("--v6-foreground-opacity", (0.2 + speed * 0.25).toFixed(4));
    document.body.classList.toggle("desi-v6-fast", speed > 0.53);
    updateCanvas(speed);
    if (!paused && !reducedMotion.matches && !document.hidden) requestFrame();
  }

  function cleanup() {
    state.suspended = true;
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    clearTimeout(state.idleTimer);
    clearTimeout(state.titleTimer);
    state.observer?.disconnect();
    state.mutationObserver?.disconnect();
    state.prismObserver?.disconnect();
  }

  function resume(event) {
    if (!event.persisted) return;
    state.suspended = false;
    state.lastScrollY = scrollY;
    registerSections();
    observeDynamicSections();
    syncThemeColor();
    requestFrame();
  }

  async function init() {
    await addStylesheet();
    document.body.classList.remove("desi-v5-edit");
    document.body.classList.add("desi-v6-cinema", "desi-v6-settled");
    $$(".desi-v5-edit-mask,.desi-v5-edit-bloom,.desi-v5-edit-sweep,.desi-v5-edit-readout,.desi-v5-edit-progress,.desi-v5-route").forEach((node) => node.remove());
    createCinemaChrome();
    registerSections();
    observeDynamicSections();
    syncThemeColor();
    installInput();
    installMagneticButtons();
    state.suspended = false;
    requestFrame();
    addEventListener("pagehide", cleanup);
    addEventListener("pageshow", resume);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
  } else {
    void init();
  }
})();
