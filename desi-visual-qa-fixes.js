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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function injectStyles() {
    if (document.querySelector("#desi-visual-qa-styles")) return;
    const style = document.createElement("style");
    style.id = "desi-visual-qa-styles";
    style.textContent = `
      /* Keep the information face readable while the outer crystal changes silhouette. */
      .crystal-prism[data-crystal-shape] .crystal-topic-face {
        clip-path: var(--crystal-topic-face) !important;
      }

      /* Safer, distinct outer silhouettes that still contain the information face. */
      .crystal-prism[data-crystal-shape="wave"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="wave"] .crystal-shard-depth {
        clip-path: polygon(7% 2%, 80% 3%, 100% 26%, 94% 88%, 72% 100%, 6% 93%, 0 22%) !important;
      }
      .crystal-prism[data-crystal-shape="orbit"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="orbit"] .crystal-shard-depth {
        clip-path: polygon(12% 3%, 88% 3%, 100% 24%, 96% 82%, 75% 100%, 12% 96%, 0 72%, 3% 18%) !important;
      }
      .crystal-prism[data-crystal-shape="spiral"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="spiral"] .crystal-shard-depth {
        clip-path: polygon(18% 0, 83% 6%, 100% 32%, 89% 91%, 67% 100%, 6% 88%, 0 25%) !important;
      }
      .crystal-prism[data-crystal-shape="fractal"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="fractal"] .crystal-shard-depth {
        clip-path: polygon(9% 0, 46% 5%, 63% 0, 88% 7%, 100% 29%, 91% 51%, 100% 81%, 75% 100%, 45% 94%, 21% 100%, 4% 84%, 0 25%) !important;
      }
      .crystal-prism[data-crystal-shape="modular"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="modular"] .crystal-shard-depth {
        clip-path: polygon(6% 4%, 90% 0, 100% 28%, 91% 50%, 100% 91%, 70% 96%, 55% 100%, 7% 91%, 0 31%) !important;
      }
      .crystal-prism[data-crystal-shape="fourier"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="fourier"] .crystal-shard-depth {
        clip-path: polygon(12% 0, 67% 3%, 82% 0, 100% 27%, 94% 59%, 100% 88%, 74% 100%, 45% 96%, 18% 100%, 0 75%, 5% 21%) !important;
      }
      .crystal-prism[data-crystal-shape="lorenz"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="lorenz"] .crystal-shard-depth {
        clip-path: polygon(7% 2%, 50% 10%, 93% 2%, 100% 24%, 89% 50%, 100% 80%, 75% 100%, 50% 92%, 25% 100%, 0 80%, 11% 50%, 0 24%) !important;
      }
      .crystal-prism[data-crystal-shape="cellular"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="cellular"] .crystal-shard-depth {
        clip-path: polygon(8% 0, 92% 0, 92% 8%, 100% 8%, 100% 92%, 92% 92%, 92% 100%, 8% 100%, 8% 92%, 0 92%, 0 8%, 8% 8%) !important;
      }
      .crystal-prism[data-crystal-shape="ulam"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="ulam"] .crystal-shard-depth {
        clip-path: polygon(50% 0, 62% 5%, 86% 2%, 94% 18%, 100% 40%, 95% 50%, 100% 79%, 82% 96%, 61% 94%, 50% 100%, 39% 94%, 17% 96%, 0 79%, 5% 50%, 0 25%, 14% 3%, 38% 5%) !important;
      }
      .crystal-prism[data-crystal-shape="rose"] .crystal-shard-body,
      .crystal-prism[data-crystal-shape="rose"] .crystal-shard-depth {
        clip-path: polygon(50% 0, 61% 5%, 75% 2%, 84% 12%, 96% 16%, 94% 30%, 100% 43%, 96% 55%, 100% 72%, 88% 82%, 82% 96%, 66% 94%, 50% 100%, 35% 94%, 18% 96%, 12% 82%, 0 72%, 4% 55%, 0 43%, 6% 30%, 4% 16%, 16% 12%, 25% 2%, 39% 5%) !important;
      }

      /* The former fixed facets used the original outline and leaked outside new shapes. */
      .crystal-prism[data-crystal-shape] .crystal-shard-facet,
      .crystal-prism[data-crystal-shape] .crystal-edge-network {
        display: none !important;
      }
      .crystal-prism[data-crystal-shape] .crystal-shard-body::before,
      .crystal-prism[data-crystal-shape] .crystal-shard-body::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        clip-path: inherit;
      }
      .crystal-prism[data-crystal-shape] .crystal-shard-body::before {
        background:
          linear-gradient(28deg, transparent 47.5%, rgba(230,255,255,.22) 48%, transparent 48.7%),
          linear-gradient(151deg, transparent 56%, rgba(var(--crystal-rgb),.22) 56.5%, transparent 57.2%);
        mix-blend-mode: screen;
      }
      .crystal-prism[data-crystal-shape] .crystal-shard-body::after {
        inset: 1px;
        box-shadow: inset 0 0 0 1px rgba(225,255,253,.34), inset 0 0 54px rgba(var(--crystal-rgb),.08);
      }

      /* The original shell starts at opacity 0 and depended on removed scroll code. */
      .crystal-card-shell {
        opacity: 1;
        transform: translate3d(-50%, -50%, 0) rotateY(0deg) scale(1);
      }

      /* Reset the dynamically generated rail buttons to the intended HUD style. */
      .crystal-theme-rail button {
        appearance: none;
        width: 100%;
        min-width: 0;
        padding: 4px 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        letter-spacing: inherit;
        text-align: right;
        cursor: pointer;
        transition: color 180ms ease, transform 180ms ease, opacity 180ms ease;
      }
      .crystal-theme-rail button span {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 9px;
      }
      .crystal-theme-rail button span::before {
        content: "";
        width: 22px;
        height: 1px;
        background: rgba(170,220,228,.18);
        transition: width 180ms ease, background 180ms ease, box-shadow 180ms ease;
      }
      .crystal-theme-rail button small {
        display: block;
        margin-top: 2px;
        color: currentColor;
        font-size: .44rem;
        opacity: .72;
      }
      .crystal-theme-rail button:hover,
      .crystal-theme-rail button:focus-visible,
      .crystal-theme-rail button.is-active {
        color: var(--pearl);
      }
      .crystal-theme-rail button.is-active {
        transform: translateX(-7px);
      }
      .crystal-theme-rail button.is-active span::before {
        width: 44px;
        background: var(--crystal-accent, var(--aqua));
        box-shadow: 0 0 8px var(--crystal-accent-soft, rgba(120,255,230,.42));
      }

      @media (max-width: 900px) {
        .crystal-theme-rail button {
          text-align: center;
        }
        .crystal-theme-rail button span {
          display: grid;
          justify-items: center;
          justify-content: center;
          gap: 4px;
        }
        .crystal-theme-rail button span::before {
          width: 100%;
          min-width: 28px;
          order: 2;
        }
        .crystal-theme-rail button.is-active {
          transform: translateY(-4px);
        }
        .crystal-theme-rail button.is-active span::before {
          width: 100%;
        }
      }

      @media (max-width: 480px) {
        .crystal-theme-rail button small {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncCrystalTheme() {
    const prism = document.querySelector(".crystal-prism");
    const shell = document.querySelector("#crystal-card-shell");
    if (!prism || !shell) return;
    const shape = prism.dataset.crystalShape || "wave";
    const color = COLORS[shape] || COLORS.wave;
    const rgb = color.join(",");
    shell.style.setProperty("--crystal-accent", `rgb(${rgb})`);
    shell.style.setProperty("--crystal-accent-soft", `rgba(${rgb}, .22)`);
    shell.style.setProperty("--crystal-facet-strength", ".28");
    prism.style.setProperty("--crystal-rgb", rgb);

    document.querySelectorAll("#crystal-theme-rail button").forEach((button) => {
      const active = button.classList.contains("is-active");
      if (active) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  }

  function setupThemeObservers() {
    const prism = document.querySelector(".crystal-prism");
    const rail = document.querySelector("#crystal-theme-rail");
    if (prism) {
      new MutationObserver(syncCrystalTheme).observe(prism, {
        attributes: true,
        attributeFilter: ["data-crystal-shape"],
      });
    }
    if (rail) {
      new MutationObserver(syncCrystalTheme).observe(rail, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    syncCrystalTheme();
  }

  function setupCrystalPose() {
    const section = document.querySelector("#crystal-passage");
    const shell = document.querySelector("#crystal-card-shell");
    if (!section || !shell) return;
    let scheduled = false;

    const update = () => {
      scheduled = false;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const paused = document.body.classList.contains("motion-paused");
      if (reduced || paused) {
        shell.style.opacity = "1";
        shell.style.transform = "translate3d(-50%, -50%, 0) rotateY(0deg) scale(1)";
        return;
      }
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / travel, 0, 1);
      const arrival = clamp((window.innerHeight - rect.top) / (window.innerHeight * 0.72), 0, 1);
      const rotateY = (1 - arrival) * 38 + Math.sin(progress * Math.PI * 6) * 2.2;
      const rotateX = Math.cos(progress * Math.PI * 4) * 1.4;
      const scale = 0.86 + arrival * 0.14;
      shell.style.opacity = String(0.22 + arrival * 0.78);
      shell.style.transform = `translate3d(-50%, -50%, 0) rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    document.querySelector("#motion-toggle")?.addEventListener("click", schedule);
    update();
  }

  function setupRandomizeRepair() {
    document.querySelector("#randomize-all")?.addEventListener("click", () => {
      queueMicrotask(() => {
        document.querySelector("#crystal-theme-rail button")?.click();
        syncCrystalTheme();
      });
    });
  }

  function setupOffscreenCanvasGuard() {
    const section = document.querySelector("#crystal-passage");
    const canvas = document.querySelector("#crystal-topic-canvas");
    if (!section || !canvas || !("IntersectionObserver" in window)) return;
    const activeId = "crystal-topic-canvas";
    const parkedId = "crystal-topic-canvas-offscreen";
    new IntersectionObserver(
      ([entry]) => {
        canvas.id = entry.isIntersecting ? activeId : parkedId;
      },
      { rootMargin: "35% 0px 35% 0px", threshold: 0 },
    ).observe(section);
  }

  function init() {
    injectStyles();
    setupThemeObservers();
    setupCrystalPose();
    setupRandomizeRepair();
    setupOffscreenCanvasGuard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
