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

  const TAU = Math.PI * 2;
  const SHAPE_ORDER = Object.keys(COLORS);
  const ASSEMBLY_PROFILES = {
    wave: {
      id: "ripple",
      duration: 900,
      stagger: 22,
      direction: 1,
      prismStart: "translateZ(0) rotateX(-5deg) rotateY(8deg) scale(.94)",
    },
    orbit: {
      id: "orbit",
      duration: 960,
      stagger: 18,
      direction: 1,
      prismStart: "translateZ(0) rotateX(4deg) rotateY(-11deg) rotateZ(8deg) scale(.93)",
    },
    spiral: {
      id: "vortex",
      duration: 1020,
      stagger: 20,
      direction: 1,
      prismStart: "translateZ(0) rotateZ(-15deg) scale(.9)",
    },
    fractal: {
      id: "core-burst",
      duration: 880,
      stagger: 16,
      direction: -1,
      prismStart: "translateZ(0) rotateY(13deg) scale(.86)",
    },
    modular: {
      id: "lattice",
      duration: 920,
      stagger: 24,
      direction: 1,
      prismStart: "translateZ(0) rotateX(9deg) rotateZ(3deg) scale(.94)",
    },
    fourier: {
      id: "ribbon",
      duration: 940,
      stagger: 18,
      direction: -1,
      prismStart: "translateZ(0) rotateY(-8deg) rotateZ(-5deg) scale(.93)",
    },
    lorenz: {
      id: "butterfly",
      duration: 980,
      stagger: 20,
      direction: -1,
      prismStart: "translateZ(0) rotateY(12deg) rotateZ(4deg) scale(.92)",
    },
    cellular: {
      id: "cascade",
      duration: 860,
      stagger: 26,
      direction: 1,
      prismStart: "translateZ(0) rotateX(-10deg) scale(.95)",
    },
    ulam: {
      id: "constellation",
      duration: 1000,
      stagger: 15,
      direction: -1,
      prismStart: "translateZ(0) rotateY(-5deg) scale(.84)",
    },
    rose: {
      id: "bloom",
      duration: 960,
      stagger: 19,
      direction: 1,
      prismStart: "translateZ(0) rotateZ(-19deg) scale(.88)",
    },
  };

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
  let lastAssembledShape = "";
  let initialAssemblyPlayed = false;
  let passageVisible = false;
  let activeAnimations = [];
  let startTimer = 0;
  let settleTimer = 0;
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
        contain: layout paint;
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
        will-change: auto;
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
        will-change: transform, opacity;
      }

      .crystal-card-shell.crystal-assembling .crystal-fragment {
        will-change: transform, opacity;
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

  function clearRunTimers() {
    clearTimeout(startTimer);
    clearTimeout(settleTimer);
    startTimer = 0;
    settleTimer = 0;
  }

  function hideFragments() {
    fragments.forEach((fragment) => {
      fragment.style.opacity = "0";
    });
  }

  function stopRun() {
    generation += 1;
    clearRunTimers();
    cancelAnimations();
    shell?.classList.remove("crystal-awaiting", "crystal-assembling");
    hideFragments();
    prism?.style.removeProperty("opacity");
    prism?.style.removeProperty("visibility");
    prism?.style.removeProperty("filter");
    prism?.style.removeProperty("transform");
  }

  function settleImmediately(markInitial = true) {
    stopRun();
    if (!shell || !prism) return;
    syncThemeColor();
    shell.classList.add("crystal-assembled");
    prism.style.removeProperty("opacity");
    prism.style.removeProperty("visibility");
    prism.style.removeProperty("filter");
    prism.style.removeProperty("transform");
    hideFragments();
    shell.dataset.assemblyProfile =
      (ASSEMBLY_PROFILES[currentShape] || ASSEMBLY_PROFILES.wave).id;
    if (markInitial) {
      initialAssemblyPlayed = true;
      lastAssembledShape = currentShape;
    }
  }

  function revealAwaitingFragments() {
    fragments.forEach((fragment) => {
      fragment.style.removeProperty("opacity");
    });
  }

  function deterministic(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function poseTransform(pose) {
    const number = (value, fallback = 0) =>
      Number.isFinite(value) ? value : fallback;
    const x = number(pose.x).toFixed(2);
    const y = number(pose.y).toFixed(2);
    const z = number(pose.z).toFixed(2);
    const rotation = number(pose.rotation).toFixed(2);
    const scale = Math.max(0.08, number(pose.scale, 1)).toFixed(3);
    return `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotate(${rotation}deg) scale(${scale})`;
  }

  function finalPose(spec) {
    return {
      x: 0,
      y: 0,
      z: 0,
      rotation: spec.rotate * 0.12,
      scale: spec.size,
    };
  }

  function profileForShape(shape) {
    return ASSEMBLY_PROFILES[shape] || ASSEMBLY_PROFILES.wave;
  }

  function delayRank(profile, index, total, shapeIndex) {
    switch (profile.id) {
      case "ripple":
      case "butterfly":
        return Math.floor(index / 2);
      case "vortex":
        return (index * 5) % total;
      case "core-burst":
        return Math.abs(index - (total - 1) * 0.5);
      case "lattice":
      case "cascade":
        return Math.floor(index / 4) * 2 + (index % 4);
      case "constellation":
        return Math.floor(deterministic(shapeIndex * 31 + index * 17) * total);
      default:
        return index;
    }
  }

  function fragmentPoses(profile, spec, index, rect, shapeIndex) {
    const total = FRAGMENTS.length;
    const direction = profile.direction;
    const angle = index / total * TAU + shapeIndex * 0.37;
    const centerX = (50 - spec.x) / 100 * rect.width;
    const centerY = (50 - spec.y) / 100 * rect.height;
    const radiusX = Math.max(150, rect.width * 0.58);
    const radiusY = Math.max(125, rect.height * 0.46);
    const side = index % 2 === 0 ? -1 : 1;
    const baseRotation = spec.rotate;
    const baseScale = spec.size;
    const randomA = deterministic((shapeIndex + 1) * 97 + index * 19);
    const randomB = deterministic((shapeIndex + 1) * 53 + index * 29);
    let start;
    let middle;
    let near;

    switch (profile.id) {
      case "orbit":
        start = {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
          z: side * 24,
          rotation: baseRotation + direction * 150,
          scale: baseScale * 0.68,
        };
        middle = {
          x: centerX * 0.5 + Math.cos(angle + direction * 1.7) * radiusX * 0.42,
          y: centerY * 0.5 + Math.sin(angle + direction * 1.7) * radiusY * 0.42,
          z: -side * 12,
          rotation: baseRotation + direction * 72,
          scale: baseScale * 0.86,
        };
        near = {
          x: Math.cos(angle) * 11,
          y: Math.sin(angle) * 8,
          z: 4,
          rotation: baseRotation * 0.28,
          scale: baseScale * 1.04,
        };
        break;

      case "vortex":
        start = {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
          z: (randomA - 0.5) * 46,
          rotation: baseRotation + direction * 260,
          scale: baseScale * 0.48,
        };
        middle = {
          x: centerX * 0.34 + Math.cos(angle + direction * 3.4) * radiusX * 0.3,
          y: centerY * 0.34 + Math.sin(angle + direction * 3.4) * radiusY * 0.3,
          z: side * 10,
          rotation: baseRotation + direction * 130,
          scale: baseScale * 0.82,
        };
        near = {
          x: Math.cos(angle + direction * 5.3) * 12,
          y: Math.sin(angle + direction * 5.3) * 9,
          z: 3,
          rotation: baseRotation * 0.3,
          scale: baseScale * 1.03,
        };
        break;

      case "core-burst":
        start = {
          x: centerX,
          y: centerY,
          z: -34,
          rotation: baseRotation + direction * 180,
          scale: baseScale * 0.2,
        };
        middle = {
          x: -centerX * 0.16,
          y: -centerY * 0.16,
          z: 20,
          rotation: baseRotation - direction * 28,
          scale: baseScale * 1.12,
        };
        near = {
          x: centerX * 0.035,
          y: centerY * 0.035,
          z: 5,
          rotation: baseRotation * 0.2,
          scale: baseScale * 1.03,
        };
        break;

      case "lattice": {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const gridX = (column - 1.5) * rect.width * 0.14;
        const gridY = (row - 1) * rect.height * 0.17;
        start = {
          x: centerX + gridX,
          y: centerY + gridY,
          z: (column - 1.5) * 9,
          rotation: column % 2 ? 90 : -90,
          scale: baseScale * 0.56,
        };
        middle = {
          x: centerX * 0.28 + gridX * 0.34,
          y: centerY * 0.28 + gridY * 0.34,
          z: row * 5,
          rotation: baseRotation + (column - 1.5) * 18,
          scale: baseScale * 0.88,
        };
        near = {
          x: (column - 1.5) * 6,
          y: (row - 1) * 5,
          z: 3,
          rotation: baseRotation * 0.2,
          scale: baseScale * 1.02,
        };
        break;
      }

      case "ribbon":
        start = {
          x: side * rect.width * 0.72,
          y: Math.sin(angle * 3) * rect.height * 0.27,
          z: Math.cos(angle * 2) * 22,
          rotation: baseRotation - side * 118,
          scale: baseScale * 0.62,
        };
        middle = {
          x: side * rect.width * 0.23,
          y: Math.sin(angle * 3 + direction * 1.25) * rect.height * 0.14,
          z: -side * 8,
          rotation: baseRotation - side * 46,
          scale: baseScale * 0.88,
        };
        near = {
          x: -side * 8,
          y: Math.sin(angle * 2) * 6,
          z: 3,
          rotation: baseRotation * 0.2,
          scale: baseScale * 1.03,
        };
        break;

      case "butterfly": {
        const pair = Math.floor(index / 2);
        const pairAngle = pair / Math.max(1, Math.ceil(total / 2) - 1) * Math.PI;
        start = {
          x: centerX + side * (rect.width * 0.37 + Math.cos(pairAngle) * rect.width * 0.16),
          y: centerY + Math.sin(pairAngle * 2) * rect.height * 0.24,
          z: side * 28,
          rotation: baseRotation + side * 145,
          scale: baseScale * 0.58,
        };
        middle = {
          x: centerX * 0.24 - side * rect.width * 0.08,
          y: centerY * 0.24 + Math.sin(pairAngle * 2.4) * rect.height * 0.08,
          z: -side * 10,
          rotation: baseRotation - side * 36,
          scale: baseScale * 0.9,
        };
        near = {
          x: side * 8,
          y: Math.sin(pairAngle) * 5,
          z: 4,
          rotation: baseRotation * 0.22,
          scale: baseScale * 1.04,
        };
        break;
      }

      case "cascade": {
        const column = index % 4;
        const row = Math.floor(index / 4);
        start = {
          x: (column - 1.5) * 18,
          y: -rect.height * (0.7 + row * 0.13),
          z: row * 7,
          rotation: baseRotation + (column - 1.5) * 34,
          scale: baseScale * 0.72,
        };
        middle = {
          x: (column - 1.5) * 6,
          y: 19 + row * 2,
          z: 4,
          rotation: baseRotation * 0.2,
          scale: baseScale * 1.04,
        };
        near = {
          x: 0,
          y: -8,
          z: 2,
          rotation: baseRotation * 0.12,
          scale: baseScale * 0.99,
        };
        break;
      }

      case "constellation":
        start = {
          x: (randomA - 0.5) * rect.width * 1.42,
          y: (randomB - 0.5) * rect.height * 1.32,
          z: (randomA - 0.5) * 62,
          rotation: baseRotation + randomB * 260 - 130,
          scale: baseScale * (0.22 + randomA * 0.18),
        };
        middle = {
          x: (randomA - 0.5) * rect.width * 0.34,
          y: (randomB - 0.5) * rect.height * 0.3,
          z: (randomB - 0.5) * 18,
          rotation: baseRotation + randomA * 54 - 27,
          scale: baseScale * 0.82,
        };
        near = {
          x: (randomA - 0.5) * 10,
          y: (randomB - 0.5) * 8,
          z: 4,
          rotation: baseRotation * 0.2,
          scale: baseScale * 1.04,
        };
        break;

      case "bloom":
        start = {
          x: centerX + Math.cos(angle) * 24,
          y: centerY + Math.sin(angle) * 24,
          z: -20,
          rotation: baseRotation + direction * 210,
          scale: baseScale * 0.24,
        };
        middle = {
          x: centerX * 0.36 + Math.cos(angle + direction * 1.2) * radiusX * 0.25,
          y: centerY * 0.36 + Math.sin(angle + direction * 1.2) * radiusY * 0.25,
          z: 18,
          rotation: baseRotation + direction * 74,
          scale: baseScale * 0.88,
        };
        near = {
          x: -centerX * 0.08,
          y: -centerY * 0.08,
          z: 5,
          rotation: baseRotation * 0.18,
          scale: baseScale * 1.06,
        };
        break;

      case "ripple":
      default:
        start = {
          x: side * (rect.width * 0.72 + index % 3 * 16),
          y: Math.sin(angle * 2.2) * rect.height * 0.2,
          z: (index % 3 - 1) * 14,
          rotation: baseRotation + side * 126,
          scale: baseScale * 0.62,
        };
        middle = {
          x: side * rect.width * 0.22,
          y: Math.sin(angle * 2.2 + direction) * rect.height * 0.09,
          z: -side * 7,
          rotation: baseRotation + side * 42,
          scale: baseScale * 0.88,
        };
        near = {
          x: -side * 9,
          y: Math.sin(angle * 2) * 5,
          z: 3,
          rotation: baseRotation * 0.22,
          scale: baseScale * 1.04,
        };
        break;
    }

    return { start, middle, near };
  }

  function playAssembly(mode = "switch", run = generation) {
    if (
      !shell ||
      !prism ||
      !fragments.length ||
      run !== generation ||
      !passageVisible
    ) {
      return;
    }

    syncThemeColor();

    if (prefersReducedMotion() || motionPaused()) {
      settleImmediately();
      return;
    }

    if (typeof prism.animate !== "function") {
      settleImmediately();
      return;
    }

    const shape = currentShape;
    const shapeIndex = Math.max(0, SHAPE_ORDER.indexOf(shape));
    const profile = profileForShape(shape);
    const initial = mode === "initial";
    shell.classList.remove("crystal-awaiting", "crystal-assembled");
    shell.classList.add("crystal-assembling");
    shell.dataset.assemblyProfile = profile.id;
    prism.style.visibility = "visible";

    const restingPrism =
      "translateZ(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)";
    const prismFrames = initial
      ? [
          { opacity: 0, transform: profile.prismStart, offset: 0 },
          { opacity: 0.1, transform: profile.prismStart, offset: 0.38 },
          { opacity: 1, transform: restingPrism, offset: 1 },
        ]
      : [
          { opacity: 1, transform: restingPrism, offset: 0 },
          { opacity: 0.08, transform: profile.prismStart, offset: 0.24 },
          { opacity: 0.14, transform: profile.prismStart, offset: 0.5 },
          { opacity: 1, transform: restingPrism, offset: 1 },
        ];

    const prismAnimation = prism.animate(prismFrames, {
      duration: profile.duration + (initial ? 150 : 80),
      delay: initial ? 90 : 0,
      easing: "cubic-bezier(.18,.78,.18,1)",
      fill: "both",
    });
    activeAnimations.push(prismAnimation);

    const rect = shell.getBoundingClientRect();
    const compact = window.matchMedia("(max-width: 600px)").matches;
    const activeIndices = fragments
      .map((_, index) => index)
      .filter((index) => !compact || index % 3 !== 2);
    let maxDelay = 0;

    fragments.forEach((fragment, index) => {
      if (!activeIndices.includes(index)) {
        fragment.style.opacity = "0";
        return;
      }

      const spec = FRAGMENTS[index];
      const poses = fragmentPoses(profile, spec, index, rect, shapeIndex);
      const delay =
        (initial ? 120 : 0) +
        delayRank(profile, index, FRAGMENTS.length, shapeIndex) * profile.stagger;
      maxDelay = Math.max(maxDelay, delay);
      const frames = [
        {
          opacity: 0,
          transform: poseTransform(poses.start),
          offset: 0,
        },
        {
          opacity: 0.9,
          transform: poseTransform(poses.start),
          offset: 0.11,
        },
        {
          opacity: 0.96,
          transform: poseTransform(poses.middle),
          offset: 0.52,
        },
        {
          opacity: 1,
          transform: poseTransform(poses.near),
          offset: 0.84,
        },
        {
          opacity: 0,
          transform: poseTransform(finalPose(spec)),
          offset: 1,
        },
      ];

      const animation = fragment.animate(frames, {
        duration: profile.duration,
        delay,
        easing: "cubic-bezier(.2,.76,.18,1)",
        fill: "both",
      });
      activeAnimations.push(animation);
    });

    settleTimer = window.setTimeout(() => {
      if (run !== generation) return;
      settleTimer = 0;
      cancelAnimations();
      shell.classList.remove("crystal-assembling", "crystal-awaiting");
      shell.classList.add("crystal-assembled");
      prism.style.removeProperty("opacity");
      prism.style.removeProperty("visibility");
      prism.style.removeProperty("filter");
      prism.style.removeProperty("transform");
      hideFragments();
      initialAssemblyPlayed = true;
      lastAssembledShape = shape;
    }, profile.duration + maxDelay + 140);
  }

  function scheduleAssembly(mode = "switch", delay = 0) {
    if (!shell || !prism || !fragments.length) return;
    stopRun();
    const run = generation;
    shell.dataset.assemblyProfile = profileForShape(currentShape).id;

    if (mode === "initial") {
      shell.classList.remove("crystal-assembled");
      shell.classList.add("crystal-awaiting");
      revealAwaitingFragments();
    } else {
      shell.classList.remove("crystal-assembled");
      shell.classList.add("crystal-assembling");
    }

    startTimer = window.setTimeout(() => {
      startTimer = 0;
      playAssembly(mode, run);
    }, Math.max(0, delay));
  }

  function setupThemeReplay() {
    if (!prism || !("MutationObserver" in window)) return;
    let lastShape = prism.dataset.crystalShape || "wave";
    new MutationObserver(() => {
      const nextShape = prism.dataset.crystalShape || "wave";
      syncThemeColor();
      if (nextShape === lastShape) return;
      lastShape = nextShape;
      if (!passageVisible) return;
      if (prefersReducedMotion() || motionPaused()) {
        settleImmediately();
        return;
      }
      scheduleAssembly(initialAssemblyPlayed ? "switch" : "initial", 55);
    }).observe(prism, {
      attributes: true,
      attributeFilter: ["data-crystal-shape"],
    });
  }

  function setupEntryAssembly() {
    if (!shell || !passage) return;

    shell.classList.remove("crystal-assembled");
    shell.classList.add("crystal-awaiting");
    revealAwaitingFragments();

    const enterPassage = () => {
      if (prefersReducedMotion() || motionPaused()) {
        settleImmediately();
      } else if (!initialAssemblyPlayed) {
        scheduleAssembly("initial", 260);
      } else if (currentShape !== lastAssembledShape) {
        scheduleAssembly("switch", 70);
      }
    };

    const leavePassage = () => {
      if (!initialAssemblyPlayed) {
        stopRun();
        shell.classList.add("crystal-assembled");
      } else if (shell.classList.contains("crystal-assembling")) {
        settleImmediately();
      }
    };

    if (!("IntersectionObserver" in window)) {
      passageVisible = true;
      enterPassage();
      return;
    }

    new IntersectionObserver(
      ([entry]) => {
        const wasVisible = passageVisible;
        passageVisible = entry.isIntersecting;
        if (entry.isIntersecting && !wasVisible) {
          enterPassage();
        } else if (
          !entry.isIntersecting &&
          (wasVisible || !initialAssemblyPlayed)
        ) {
          leavePassage();
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

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const handleMotionPreference = (event) => {
      if (event.matches) {
        settleImmediately();
      } else if (passageVisible && !motionPaused()) {
        scheduleAssembly("switch", 80);
      }
    };

    if (typeof motionPreference.addEventListener === "function") {
      motionPreference.addEventListener("change", handleMotionPreference);
    } else {
      motionPreference.addListener(handleMotionPreference);
    }
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
