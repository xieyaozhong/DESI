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

  const CRYSTAL_CENTER = [48.978, 46.353];
  const CRYSTAL_OUTLINE = [
    [23, 0],
    [78, 7],
    [100, 38],
    [83, 88],
    [54, 100],
    [11, 78],
    [0, 31],
  ];
  const CRYSTAL_INNER = [
    [24, 9],
    [73, 11],
    [92, 38],
    [78, 79],
    [54, 93],
    [15, 73],
    [7, 32],
  ];
  function polygonCentroid(points) {
    let crossSum = 0;
    let xSum = 0;
    let ySum = 0;

    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      const cross = point[0] * next[1] - next[0] * point[1];
      crossSum += cross;
      xSum += (point[0] + next[0]) * cross;
      ySum += (point[1] + next[1]) * cross;
    });

    if (Math.abs(crossSum) < 0.0001) {
      return [
        points.reduce((sum, point) => sum + point[0], 0) / points.length,
        points.reduce((sum, point) => sum + point[1], 0) / points.length,
      ];
    }

    return [
      xSum / (3 * crossSum),
      ySum / (3 * crossSum),
    ];
  }

  const FRAGMENTS = CRYSTAL_OUTLINE.flatMap((vertex, sector) => {
    const next = CRYSTAL_OUTLINE[(sector + 1) % CRYSTAL_OUTLINE.length];
    const inner = CRYSTAL_INNER[sector];
    const innerNext = CRYSTAL_INNER[(sector + 1) % CRYSTAL_INNER.length];

    return [
      [vertex, next, innerNext, inner],
      [CRYSTAL_CENTER, inner, innerNext],
    ].map((points, half) => {
      const [x, y] = polygonCentroid(points);
      const radialAngle = Math.atan2(
        y - CRYSTAL_CENTER[1],
        x - CRYSTAL_CENTER[0],
      );

      return {
        x,
        y,
        sector,
        half,
        kind: half ? "core" : "rim",
        rotate: radialAngle * 180 / Math.PI + (half ? 18 : -18),
        points: points
          .map(([pointX, pointY]) => `${pointX}% ${pointY}%`)
          .join(", "),
      };
    });
  });

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
  let cleanupTimer = 0;
  let contactTimer = 0;
  let pointerFrame = 0;
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
        inset: 0;
        pointer-events: none;
        opacity: 0;
        contain: layout;
        overflow: visible;
        perspective: 1500px;
        transition: opacity 120ms ease;
        transform-style: preserve-3d;
      }

      .crystal-card-shell.crystal-awaiting .crystal-assembly-layer,
      .crystal-card-shell.crystal-assembling .crystal-assembly-layer {
        opacity: 1;
      }

      .crystal-card-shell.crystal-awaiting .crystal-prism {
        opacity: 0 !important;
        visibility: hidden;
        filter: brightness(.62) !important;
      }

      .crystal-card-shell.crystal-assembled .crystal-assembly-layer {
        opacity: 0;
      }

      .crystal-fragment {
        position: absolute;
        z-index: var(--fragment-stack);
        inset: 0;
        opacity: 0;
        transform-box: border-box;
        transform-origin: var(--fragment-origin);
        transform-style: preserve-3d;
        will-change: auto;
      }

      .crystal-fragment__depth,
      .crystal-fragment__face {
        position: absolute;
        inset: 0;
        pointer-events: none;
        clip-path: var(--fragment-shape);
        backface-visibility: hidden;
      }

      .crystal-fragment__depth {
        background:
          linear-gradient(148deg, rgba(var(--assembly-rgb), .28), rgba(1, 8, 14, .98) 68%);
        opacity: .68;
        backface-visibility: visible;
        transform: translate3d(
          var(--assembly-depth-x, 15px),
          var(--assembly-depth-y, 20px),
          var(--assembly-depth-z, -38px)
        );
      }

      .crystal-fragment__face {
        background:
          linear-gradient(145deg, rgba(241,255,254,.42), transparent 17%),
          conic-gradient(
            from 132deg at 52% 48%,
            rgba(226,255,253,.44),
            rgba(var(--assembly-rgb),.15) 15%,
            rgba(21,67,83,.84) 31%,
            rgba(113,89,184,.36) 57%,
            rgba(1,9,15,.97) 77%,
            rgba(205,255,247,.38)
          );
        filter:
          drop-shadow(0 0 .8px rgba(226,255,253,.72))
          drop-shadow(0 0 13px rgba(var(--assembly-rgb), .13));
        transform: translateZ(2px);
      }

      .crystal-fragment__face::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(
            var(--fragment-light-angle),
            rgba(247,255,255,.18),
            transparent 32%,
            rgba(var(--assembly-rgb),.08) 72%,
            transparent
          );
        opacity: .74;
      }

      .crystal-card-shell.crystal-awaiting .crystal-fragment {
        opacity: .84;
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
            translate3d(
              var(--fragment-idle-x),
              var(--fragment-idle-y),
              var(--fragment-idle-z)
            )
            rotateX(var(--fragment-idle-rx))
            rotateY(var(--fragment-idle-ry))
            rotateZ(var(--fragment-idle-rz))
            scale(.76);
        }
        to {
          transform:
            translate3d(
              calc(var(--fragment-idle-x) + 8px),
              calc(var(--fragment-idle-y) - 10px),
              calc(var(--fragment-idle-z) + 8px)
            )
            rotateX(calc(var(--fragment-idle-rx) + 7deg))
            rotateY(calc(var(--fragment-idle-ry) - 8deg))
            rotateZ(calc(var(--fragment-idle-rz) + 6deg))
            scale(.8);
        }
      }

      @media (max-width: 900px) {
        .crystal-card-shell {
          --assembly-depth-x: 9px;
          --assembly-depth-y: 12px;
          --assembly-depth-z: -28px;
        }

        .crystal-fragment__face {
          filter: drop-shadow(0 0 .7px rgba(226,255,253,.68));
        }

        .crystal-fragment__depth {
          opacity: .56;
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
      const fragment = document.createElement("span");
      const depth = document.createElement("i");
      const face = document.createElement("i");
      const angle = Math.atan2(
        spec.y - CRYSTAL_CENTER[1],
        spec.x - CRYSTAL_CENTER[0],
      );
      const orbitX = Math.cos(angle) * (164 + spec.half * 26);
      const orbitY = Math.sin(angle) * (132 + spec.half * 20);
      const side = index % 2 === 0 ? -1 : 1;

      fragment.className = "crystal-fragment";
      fragment.classList.add(`crystal-fragment--${spec.kind}`);
      depth.className = "crystal-fragment__depth";
      face.className = "crystal-fragment__face";
      fragment.style.setProperty("--fragment-shape", `polygon(${spec.points})`);
      fragment.style.setProperty("--fragment-origin", `${spec.x}% ${spec.y}%`);
      fragment.style.setProperty("--fragment-idle-x", `${orbitX.toFixed(2)}px`);
      fragment.style.setProperty("--fragment-idle-y", `${orbitY.toFixed(2)}px`);
      fragment.style.setProperty("--fragment-idle-z", `${side * (18 + spec.sector * 3)}px`);
      fragment.style.setProperty("--fragment-idle-rx", `${side * (34 + spec.sector * 4)}deg`);
      fragment.style.setProperty("--fragment-idle-ry", `${-side * (48 + spec.half * 18)}deg`);
      fragment.style.setProperty("--fragment-idle-rz", `${spec.rotate.toFixed(2)}deg`);
      fragment.style.setProperty("--fragment-delay", `${-index * 115}ms`);
      fragment.style.setProperty("--fragment-stack", String(index + 1));
      fragment.style.setProperty("--fragment-light-angle", `${28 + index * 23}deg`);
      fragment.dataset.index = String(index);
      fragment.dataset.sector = String(spec.sector);
      fragment.dataset.kind = spec.kind;
      fragment.append(depth, face);
      layer.appendChild(fragment);
    });

    shell.appendChild(layer);
    fragments = [...layer.querySelectorAll(".crystal-fragment")];
    shell.dataset.assemblyPieces = String(fragments.length);
    shell.dataset.assemblyGeometry = "exact";
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
    clearTimeout(cleanupTimer);
    clearTimeout(contactTimer);
    startTimer = 0;
    settleTimer = 0;
    cleanupTimer = 0;
    contactTimer = 0;
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
    shell?.classList.remove("crystal-awaiting", "crystal-assembling", "crystal-contact");
    if (shell) shell.dataset.assemblyState = "idle";
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
    shell.dataset.assemblyState = "locked";
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
    shell.dispatchEvent(new CustomEvent("crystal:assembled", {
      detail: { shape: currentShape, profile: shell.dataset.assemblyProfile },
    }));
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
    const rotateX = number(pose.rotateX).toFixed(2);
    const rotateY = number(pose.rotateY).toFixed(2);
    const rotation = number(pose.rotation).toFixed(2);
    const scale = Math.max(0.08, number(pose.scale, 1)).toFixed(3);
    return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotation}deg) scale(${scale})`;
  }

  function finalPose() {
    return {
      x: 0,
      y: 0,
      z: 0,
      rotateX: 0,
      rotateY: 0,
      rotation: 0,
      scale: 1,
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
    const centerX = (CRYSTAL_CENTER[0] - spec.x) / 100 * rect.width;
    const centerY = (CRYSTAL_CENTER[1] - spec.y) / 100 * rect.height;
    const radiusX = Math.max(150, rect.width * 0.58);
    const radiusY = Math.max(125, rect.height * 0.46);
    const side = index % 2 === 0 ? -1 : 1;
    const baseRotation = spec.rotate;
    const baseScale = 1;
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

    start.rotateX = (randomA - 0.5) * 92;
    start.rotateY = side * (42 + randomB * 36);
    middle.rotateX = (randomB - 0.5) * 42;
    middle.rotateY = -side * (18 + randomA * 22);
    near.rotateX = side * 5;
    near.rotateY = -side * 6;

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
    shell.dataset.assemblyState = "assembling";
    prism.style.visibility = "visible";

    const restingPrism =
      "translateZ(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)";
    const rect = shell.getBoundingClientRect();
    const compact = window.matchMedia("(max-width: 600px)").matches;
    const staggerScale = compact ? 0.72 : 1;
    let maxDelay = 0;
    const fragmentRuns = fragments.map((fragment, index) => {
      const spec = FRAGMENTS[index];
      const poses = fragmentPoses(profile, spec, index, rect, shapeIndex);
      const delay =
        (initial ? 120 : 0) +
        delayRank(profile, index, FRAGMENTS.length, shapeIndex) *
          profile.stagger *
          staggerScale;
      maxDelay = Math.max(maxDelay, delay);
      return { delay, fragment, poses, spec };
    });
    const assemblyDuration = profile.duration + maxDelay;
    const lockHold = 60;
    const handoffDuration = 125;
    const prismDuration = assemblyDuration + lockHold + handoffDuration;
    const revealOffset = (assemblyDuration + lockHold) / prismDuration;
    const prismFrames = initial
      ? [
          { opacity: 0, transform: profile.prismStart, offset: 0 },
          { opacity: 0, transform: profile.prismStart, offset: revealOffset },
          {
            opacity: 0.46,
            transform: "translateZ(0) scale(.985)",
            offset: revealOffset + (1 - revealOffset) * 0.56,
          },
          { opacity: 1, transform: restingPrism, offset: 1 },
        ]
      : [
          { opacity: 0, transform: profile.prismStart, offset: 0 },
          { opacity: 0, transform: profile.prismStart, offset: revealOffset },
          {
            opacity: 0.46,
            transform: "translateZ(0) scale(.985)",
            offset: revealOffset + (1 - revealOffset) * 0.56,
          },
          { opacity: 1, transform: restingPrism, offset: 1 },
        ];

    const prismAnimation = prism.animate(prismFrames, {
      duration: prismDuration,
      easing: "linear",
      fill: "both",
    });
    activeAnimations.push(prismAnimation);

    if (layer?.animate) {
      const layerAnimation = layer.animate(
        [
          { opacity: 1, offset: 0 },
          { opacity: 1, offset: revealOffset },
          { opacity: 0, offset: 1 },
        ],
        { duration: prismDuration, easing: "linear", fill: "both" },
      );
      activeAnimations.push(layerAnimation);
    }

    fragmentRuns.forEach(({ delay, fragment, poses, spec }) => {
      const nearDistance = Math.hypot(poses.near.x, poses.near.y) || 1;
      const unitX = poses.near.x / nearDistance;
      const unitY = poses.near.y / nearDistance;
      const compressionDistance = spec.kind === "core" ? 2.3 : 1.5;
      const reboundDistance = spec.kind === "core" ? 5.5 : 3.5;
      const impact = {
        x: -unitX * compressionDistance,
        y: -unitY * compressionDistance,
        z: spec.kind === "core" ? -5 : -3,
        rotateX: -poses.near.rotateX * 0.08,
        rotateY: -poses.near.rotateY * 0.08,
        rotation: -poses.near.rotation * 0.06,
        scale: spec.kind === "core" ? 0.986 : 0.992,
      };
      const rebound = {
        x: unitX * reboundDistance,
        y: unitY * reboundDistance,
        z: spec.kind === "core" ? 8 : 5,
        rotateX: poses.near.rotateX * 0.12,
        rotateY: poses.near.rotateY * 0.12,
        rotation: poses.near.rotation * 0.1,
        scale: spec.kind === "core" ? 1.009 : 1.006,
      };
      const frames = [
        {
          opacity: 0,
          transform: poseTransform(poses.start),
          easing: "cubic-bezier(.16,.78,.2,1)",
          offset: 0,
        },
        {
          opacity: 1,
          transform: poseTransform(poses.start),
          easing: "cubic-bezier(.18,.82,.2,1)",
          offset: 0.09,
        },
        {
          opacity: 1,
          transform: poseTransform(poses.middle),
          easing: "cubic-bezier(.18,.88,.2,1)",
          offset: 0.58,
        },
        {
          opacity: 1,
          transform: poseTransform(poses.near),
          easing: "cubic-bezier(.5,.02,.78,.32)",
          offset: 0.78,
        },
        {
          opacity: 1,
          transform: poseTransform(finalPose()),
          easing: "cubic-bezier(.2,.72,.3,1)",
          offset: 0.86,
        },
        {
          opacity: 1,
          transform: poseTransform(impact),
          easing: "cubic-bezier(.16,.84,.28,1)",
          offset: 0.9,
        },
        {
          opacity: 1,
          transform: poseTransform(rebound),
          easing: "cubic-bezier(.22,.72,.2,1)",
          offset: 0.95,
        },
        {
          opacity: 1,
          transform: poseTransform(finalPose()),
          offset: 0.985,
        },
        {
          opacity: 1,
          transform: poseTransform(finalPose()),
          offset: 1,
        },
      ];

      const animation = fragment.animate(frames, {
        duration: profile.duration,
        delay,
        easing: "linear",
        fill: "both",
      });
      activeAnimations.push(animation);
    });

    settleTimer = window.setTimeout(() => {
      if (run !== generation) return;
      settleTimer = 0;
      shell.classList.remove("crystal-assembling", "crystal-awaiting");
      shell.classList.add("crystal-assembled");
      shell.classList.add("crystal-contact");
      shell.dataset.assemblyState = "locked";
      prism.style.removeProperty("opacity");
      prism.style.removeProperty("visibility");
      prism.style.removeProperty("filter");
      prism.style.removeProperty("transform");
      initialAssemblyPlayed = true;
      lastAssembledShape = shape;
      shell.dispatchEvent(new CustomEvent("crystal:assembled", {
        detail: { shape, profile: profile.id },
      }));
      contactTimer = window.setTimeout(() => {
        if (run === generation) shell.classList.remove("crystal-contact");
        contactTimer = 0;
      }, 150);
      cleanupTimer = window.setTimeout(() => {
        if (run !== generation) return;
        cleanupTimer = 0;
        cancelAnimations();
        hideFragments();
      }, 60);
    }, prismDuration + 20);
  }

  function scheduleAssembly(mode = "switch", delay = 0) {
    if (!shell || !prism || !fragments.length) return;
    stopRun();
    const run = generation;
    shell.dataset.assemblyProfile = profileForShape(currentShape).id;
    shell.dataset.assemblyState = mode === "initial" ? "scattered" : "gathering";

    if (mode === "initial") {
      shell.classList.remove("crystal-assembled");
      shell.classList.add("crystal-awaiting");
      revealAwaitingFragments();
    } else {
      shell.classList.remove("crystal-assembled");
      shell.classList.add("crystal-assembling");
      prism.style.opacity = "0";
      prism.style.visibility = "visible";
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
        if (motionPaused()) {
          shell?.style.removeProperty("--crystal-pointer-x");
          shell?.style.removeProperty("--crystal-pointer-y");
          shell?.removeAttribute("data-facing");
          settleImmediately();
        }
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

  function setupFinePointerTilt() {
    if (!shell || !passage || !window.matchMedia("(pointer: fine)").matches) return;
    let targetX = 0;
    let targetY = 0;

    const resetTilt = () => {
      targetX = 0;
      targetY = 0;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        shell.style.removeProperty("--crystal-pointer-x");
        shell.style.removeProperty("--crystal-pointer-y");
        shell.removeAttribute("data-facing");
      });
    };

    const paintTilt = () => {
      pointerFrame = 0;
      if (!passageVisible || motionPaused() || prefersReducedMotion()) return;
      shell.style.setProperty("--crystal-pointer-x", `${(targetX * 2.2).toFixed(2)}deg`);
      shell.style.setProperty("--crystal-pointer-y", `${(-targetY * 1.5).toFixed(2)}deg`);
      if (targetX > .08) shell.dataset.facing = "right";
      else if (targetX < -.08) shell.dataset.facing = "left";
      else shell.removeAttribute("data-facing");
    };

    passage.addEventListener("pointermove", (event) => {
      if (!passageVisible || motionPaused() || prefersReducedMotion()) return;
      const rect = passage.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / Math.min(rect.height, innerHeight) * 2 - 1));
      if (!pointerFrame) pointerFrame = requestAnimationFrame(paintTilt);
    }, { passive: true });
    passage.addEventListener("pointerleave", resetTilt, { passive: true });
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
    setupFinePointerTilt();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
