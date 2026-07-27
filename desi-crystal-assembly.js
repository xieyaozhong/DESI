(() => {
  "use strict";

  const COLORS = {
    wave: [120, 255, 230],
    orbit: [112, 202, 255],
    spiral: [243, 216, 145],
    fractal: [166, 140, 255],
    modular: [255, 143, 190],
    fourier: [255, 191, 110],
    lorenz: [95, 245, 175],
    cellular: [120, 170, 255],
    ulam: [242, 248, 181],
    rose: [224, 126, 255],
  };

  const SHAPE_ORDER = Object.keys(COLORS);
  const FRAGMENTS = [
    { x: 13, y: 18, sx: -330, sy: -230, rotate: -42, size: 0.92 },
    { x: 31, y: 11, sx: -110, sy: -340, rotate: 31, size: 0.72 },
    { x: 52, y: 13, sx: 45, sy: -360, rotate: -18, size: 0.82 },
    { x: 74, y: 18, sx: 255, sy: -245, rotate: 47, size: 0.88 },
    { x: 88, y: 39, sx: 345, sy: -70, rotate: 70, size: 0.66 },
    { x: 82, y: 68, sx: 300, sy: 210, rotate: 36, size: 0.96 },
    { x: 65, y: 84, sx: 115, sy: 340, rotate: -24, size: 0.74 },
    { x: 43, y: 87, sx: -40, sy: 360, rotate: 18, size: 0.9 },
    { x: 21, y: 77, sx: -285, sy: 260, rotate: -55, size: 0.7 },
    { x: 9, y: 52, sx: -365, sy: 35, rotate: -76, size: 0.84 },
    { x: 37, y: 42, sx: -135, sy: -25, rotate: 23, size: 0.62 },
    { x: 61, y: 55, sx: 145, sy: 55, rotate: -32, size: 0.68 },
  ];

  const FRAGMENT_POLYGONS = [
    "polygon(50% 0, 100% 28%, 80% 100%, 13% 81%, 0 24%)",
    "polygon(18% 0, 100% 13%, 78% 69%, 88% 100%, 10% 83%, 0 31%)",
    "polygon(0 11%, 75% 0, 100% 48%, 57% 100%, 12% 76%)",
    "polygon(32% 0, 100% 35%, 77% 100%, 0 73%, 12% 19%)",
  ];

  let shell;
  let prism;
  let passage;
  let layer;
  let fragments = [];
  let currentShape = "wave";
  let initialAssemblyPlayed = false;
  let passageVisible = false;
  let activeAnimations = [];
  let replayTimer = 0;
  let generation = 0;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function motionPaused() {
    return document.body.classList.contains("motion-paused");
  }

  function injectStyles() {
    if (document.querySelector("#desi-crystal-assembly-styles")) return;
    const style = document.createElement("style");
    style.id = "desi-crystal-assembly-styles";
    style.textContent = `
      .crystal-card-shell {
        --assembly-rgb: 120, 255, 230;
      }

      .crystal-assembly-layer {
        position: absolute;
        z-index: 12;
        inset: -24%;
        pointer-events: none;
        opacity: 0;
        transition: opacity 180ms ease;
        filter: drop-shadow(0 0 18px rgba(var(--assembly-rgb), .2));
        transform-style: preserve-3d;
      }

      .crystal-card-shell.crystal-awaiting .crystal-assembly-layer,
      .crystal-card-shell.crystal-assembling .crystal-assembly-layer {
        opacity: 1;
      }

      .crystal-card-shell.crystal-awaiting .crystal-prism {
        opacity: 0 !important;
        visibility: hidden;
        filter: blur(5px) brightness(.62) !important;
      }

      .crystal-card-shell.crystal-assembled .crystal-assembly-layer {
        opacity: 0;
      }

      .crystal-fragment {
        position: absolute;
        left: var(--fragment-x);
        top: var(--fragment-y);
        width: clamp(25px, 5vw, 58px);
        aspect-ratio: .76;
        opacity: 0;
        transform-origin: 50% 50%;
        clip-path: var(--fragment-shape);
        background:
          linear-gradient(145deg, rgba(255,255,255,.6), transparent 22%),
          linear-gradient(33deg, rgba(var(--assembly-rgb),.08), rgba(var(--assembly-rgb),.4) 52%, rgba(3,14,23,.82));
        border: 1px solid rgba(var(--assembly-rgb), .52);
        box-shadow:
          inset 0 0 18px rgba(var(--assembly-rgb), .12),
          0 0 20px rgba(var(--assembly-rgb), .16);
        mix-blend-mode: screen;
        will-change: transform, opacity, filter;
      }

      .crystal-fragment::before,
      .crystal-fragment::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        clip-path: inherit;
      }

      .crystal-fragment::before {
        background:
          linear-gradient(34deg, transparent 48%, rgba(235,255,255,.32) 49%, transparent 50%),
          linear-gradient(145deg, transparent 55%, rgba(var(--assembly-rgb),.28) 56%, transparent 57%);
      }

      .crystal-fragment::after {
        inset: 2px;
        box-shadow: inset 0 0 0 1px rgba(234,255,255,.16);
      }

      .crystal-card-shell.crystal-awaiting .crystal-fragment {
        opacity: .72;
        animation: crystal-fragment-drift 2.8s ease-in-out infinite alternate;
        animation-delay: var(--fragment-delay);
      }

      @keyframes crystal-fragment-drift {
        from {
          transform:
            translate(calc(-50% + var(--fragment-sx)), calc(-50% + var(--fragment-sy)))
            rotate(var(--fragment-rotate))
            scale(var(--fragment-idle-size));
          filter: brightness(.84);
        }
        to {
          transform:
            translate(calc(-50% + var(--fragment-sx) + 8px), calc(-50% + var(--fragment-sy) - 10px))
            rotate(calc(var(--fragment-rotate) + 9deg))
            scale(var(--fragment-drift-size));
          filter: brightness(1.16);
        }
      }

      @media (max-width: 900px) {
        .crystal-assembly-layer {
          inset: -18%;
        }

        .crystal-fragment {
          width: clamp(22px, 8vw, 46px);
        }
      }

      @media (max-width: 480px) {
        .crystal-assembly-layer {
          inset: -10%;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .crystal-assembly-layer {
          display: none !important;
        }

        .crystal-card-shell.crystal-awaiting .crystal-prism {
          opacity: 1 !important;
          visibility: visible;
          filter: inherit !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createFragments() {
    if (!shell || shell.querySelector(".crystal-assembly-layer")) {
      layer = shell?.querySelector(".crystal-assembly-layer") || null;
      fragments = layer ? [...layer.querySelectorAll(".crystal-fragment")] : [];
      return;
    }

    layer = document.createElement("div");
    layer.className = "crystal-assembly-layer";
    layer.setAttribute("aria-hidden", "true");

    FRAGMENTS.forEach((spec, index) => {
      const fragment = document.createElement("i");
      fragment.className = "crystal-fragment";
      fragment.style.setProperty("--fragment-x", `${spec.x}%`);
      fragment.style.setProperty("--fragment-y", `${spec.y}%`);
      fragment.style.setProperty("--fragment-sx", `${spec.sx}%`);
      fragment.style.setProperty("--fragment-sy", `${spec.sy}%`);
      fragment.style.setProperty("--fragment-rotate", `${spec.rotate}deg`);
      fragment.style.setProperty("--fragment-size", String(spec.size));
      fragment.style.setProperty("--fragment-idle-size", String(spec.size * 0.72));
      fragment.style.setProperty("--fragment-drift-size", String(spec.size * 0.78));
      fragment.style.setProperty("--fragment-delay", `${-index * 115}ms`);
      fragment.style.setProperty(
        "--fragment-shape",
        FRAGMENT_POLYGONS[index % FRAGMENT_POLYGONS.length],
      );
      fragment.dataset.index = String(index);
      layer.appendChild(fragment);
    });

    shell.appendChild(layer);
    fragments = [...layer.querySelectorAll(".crystal-fragment")];
  }

  function syncThemeColor() {
    if (!shell || !prism) return;
    currentShape = prism.dataset.crystalShape || currentShape || "wave";
    const rgb = (COLORS[currentShape] || COLORS.wave).join(",");
    shell.style.setProperty("--assembly-rgb", rgb);
  }

  function cancelAnimations() {
    activeAnimations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // A completed animation may already be detached.
      }
    });
    activeAnimations = [];
  }

  function settleImmediately() {
    cancelAnimations();
    if (!shell || !prism) return;
    shell.classList.remove("crystal-awaiting", "crystal-assembling");
    shell.classList.add("crystal-assembled");
    prism.style.removeProperty("opacity");
    prism.style.removeProperty("visibility");
    prism.style.removeProperty("filter");
    fragments.forEach((fragment) => {
      fragment.style.opacity = "0";
    });
    initialAssemblyPlayed = true;
  }

  function fragmentTransform(spec, scattered, shapePhase = 0) {
    const phase = shapePhase * 7;
    const x = scattered ? -50 + spec.sx + Math.sin(phase) * 18 : -50;
    const y = scattered ? -50 + spec.sy + Math.cos(phase) * 15 : -50;
    const rotation = scattered ? spec.rotate + shapePhase * 4 : spec.rotate * 0.12;
    const scale = scattered ? spec.size * 0.72 : spec.size;
    return `translate(${x}%, ${y}%) rotate(${rotation}deg) scale(${scale})`;
  }

  function playAssembly(mode = "switch") {
    if (!shell || !prism || !fragments.length) return;
    syncThemeColor();

    if (prefersReducedMotion() || motionPaused()) {
      settleImmediately();
      return;
    }

    generation += 1;
    const run = generation;
    cancelAnimations();
    clearTimeout(replayTimer);

    const shapePhase = Math.max(0, SHAPE_ORDER.indexOf(currentShape));
    const initial = mode === "initial";
    shell.classList.remove("crystal-awaiting", "crystal-assembled");
    shell.classList.add("crystal-assembling");
    prism.style.visibility = "visible";

    const prismFrames = initial
      ? [
          { opacity: 0, filter: "blur(6px) brightness(.58)", transform: "scale(.88)", offset: 0 },
          { opacity: 0.08, filter: "blur(4px) brightness(.7)", transform: "scale(.91)", offset: 0.42 },
          { opacity: 1, filter: "blur(0) brightness(1)", transform: "scale(1)", offset: 1 },
        ]
      : [
          { opacity: 1, filter: "blur(0) brightness(1)", transform: "scale(1)", offset: 0 },
          { opacity: 0.06, filter: "blur(6px) brightness(.55)", transform: "scale(.91)", offset: 0.23 },
          { opacity: 0.12, filter: "blur(4px) brightness(.7)", transform: "scale(.93)", offset: 0.52 },
          { opacity: 1, filter: "blur(0) brightness(1)", transform: "scale(1)", offset: 1 },
        ];

    const prismAnimation = prism.animate(prismFrames, {
      duration: initial ? 1180 : 1120,
      delay: initial ? 80 : 0,
      easing: "cubic-bezier(.18,.78,.18,1)",
      fill: "both",
    });
    activeAnimations.push(prismAnimation);

    fragments.forEach((fragment, index) => {
      const spec = FRAGMENTS[index];
      const scattered = fragmentTransform(spec, true, shapePhase + index * 0.17);
      const target = fragmentTransform(spec, false, shapePhase);
      const frames = initial
        ? [
            { opacity: 0.18, filter: "blur(2px) brightness(.74)", transform: scattered, offset: 0 },
            { opacity: 0.95, filter: "blur(0) brightness(1.25)", transform: scattered, offset: 0.14 },
            { opacity: 1, filter: "blur(0) brightness(1.4)", transform: target, offset: 0.76 },
            { opacity: 0, filter: "blur(0) brightness(1.1)", transform: `${target} scale(.86)`, offset: 1 },
          ]
        : [
            { opacity: 0, filter: "blur(0) brightness(1)", transform: target, offset: 0 },
            { opacity: 1, filter: "blur(0) brightness(1.34)", transform: target, offset: 0.08 },
            { opacity: 0.92, filter: "blur(1px) brightness(.94)", transform: scattered, offset: 0.25 },
            { opacity: 1, filter: "blur(0) brightness(1.42)", transform: target, offset: 0.78 },
            { opacity: 0, filter: "blur(0) brightness(1.05)", transform: `${target} scale(.84)`, offset: 1 },
          ];

      const animation = fragment.animate(frames, {
        duration: initial ? 880 + index * 25 : 940 + index * 18,
        delay: initial ? 170 + index * 32 : index * 18,
        easing: "cubic-bezier(.2,.76,.18,1)",
        fill: "both",
      });
      activeAnimations.push(animation);
    });

    const totalDuration = initial ? 1380 : 1220;
    replayTimer = window.setTimeout(() => {
      if (run !== generation) return;
      activeAnimations.forEach((animation) => {
        try {
          animation.cancel();
        } catch {
          // Ignore detached animations.
        }
      });
      activeAnimations = [];
      shell.classList.remove("crystal-assembling", "crystal-awaiting");
      shell.classList.add("crystal-assembled");
      prism.style.removeProperty("opacity");
      prism.style.removeProperty("visibility");
      prism.style.removeProperty("filter");
      initialAssemblyPlayed = true;
    }, totalDuration);
  }

  function scheduleAssembly(mode = "switch", delay = 0) {
    clearTimeout(replayTimer);
    replayTimer = window.setTimeout(() => playAssembly(mode), delay);
  }

  function setupThemeReplay() {
    if (!prism || !("MutationObserver" in window)) return;
    let lastShape = prism.dataset.crystalShape || "wave";
    new MutationObserver(() => {
      const nextShape = prism.dataset.crystalShape || "wave";
      syncThemeColor();
      if (nextShape === lastShape) return;
      lastShape = nextShape;
      if (initialAssemblyPlayed && passageVisible) scheduleAssembly("switch", 0);
    }).observe(prism, {
      attributes: true,
      attributeFilter: ["data-crystal-shape"],
    });

    document.querySelector("#crystal-theme-rail")?.addEventListener("click", () => {
      if (!passageVisible || !initialAssemblyPlayed) return;
      scheduleAssembly("switch", 0);
    });

    ["#crystal-reshuffle", "#randomize-all"].forEach((selector) => {
      document.querySelector(selector)?.addEventListener("click", () => {
        if (!initialAssemblyPlayed) return;
        scheduleAssembly("switch", 30);
      });
    });
  }

  function setupEntryAssembly() {
    if (!shell || !passage) return;

    if (prefersReducedMotion() || motionPaused()) {
      settleImmediately();
      return;
    }

    shell.classList.remove("crystal-assembled");
    shell.classList.add("crystal-awaiting");

    if (!("IntersectionObserver" in window)) {
      passageVisible = true;
      scheduleAssembly("initial", 280);
      return;
    }

    new IntersectionObserver(
      ([entry]) => {
        passageVisible = entry.isIntersecting;
        if (entry.isIntersecting && !initialAssemblyPlayed) {
          shell.classList.add("crystal-awaiting");
          scheduleAssembly("initial", 280);
        }
      },
      {
        rootMargin: "-8% 0px -8% 0px",
        threshold: [0.06, 0.2],
      },
    ).observe(passage);
  }

  function setupMotionToggle() {
    document.querySelector("#motion-toggle")?.addEventListener("click", () => {
      queueMicrotask(() => {
        if (motionPaused()) settleImmediately();
        else if (passageVisible) scheduleAssembly("switch", 80);
      });
    });
  }

  function init() {
    shell = document.querySelector("#crystal-card-shell");
    prism = shell?.querySelector(".crystal-prism") || null;
    passage = document.querySelector("#crystal-passage");
    if (!shell || !prism || !passage) return;

    injectStyles();
    createFragments();
    syncThemeColor();
    setupThemeReplay();
    setupEntryAssembly();
    setupMotionToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
