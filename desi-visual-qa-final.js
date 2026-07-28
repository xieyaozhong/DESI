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

  const style = document.createElement("style");
  style.id = "desi-visual-qa-final-styles";
  style.textContent = `
    /* The content face stays readable; only the crystal body changes silhouette. */
    .crystal-prism[data-crystal-shape] .crystal-topic-face {
      clip-path: var(--crystal-topic-face) !important;
    }

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

    /* Fixed legacy facets did not follow the ten new silhouettes. */
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

    #crystal-topic-canvas-offscreen {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  `;
  document.head.appendChild(style);

  const shell = document.querySelector("#crystal-card-shell");
  const prism = document.querySelector(".crystal-prism");
  const rail = document.querySelector("#crystal-theme-rail");

  function syncTheme() {
    if (!shell || !prism) return;
    const shape = prism.dataset.crystalShape || "wave";
    const rgb = (COLORS[shape] || COLORS.wave).join(",");
    prism.style.setProperty("--crystal-rgb", rgb);
    shell.style.setProperty("--crystal-accent", `rgb(${rgb})`);
    shell.style.setProperty("--crystal-accent-soft", `rgba(${rgb}, .22)`);
    shell.style.setProperty("--crystal-facet-strength", ".28");
    shell.setAttribute("aria-hidden", "true");

    document.querySelectorAll("#crystal-theme-rail button").forEach((button) => {
      if (button.classList.contains("is-active")) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  }

  if (prism && "MutationObserver" in window) {
    new MutationObserver(syncTheme).observe(prism, {
      attributes: true,
      attributeFilter: ["data-crystal-shape", "style"],
    });
  }
  if (rail && "MutationObserver" in window) {
    new MutationObserver(syncTheme).observe(rail, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }
  syncTheme();

  /* Repair the stale-face edge case when a new random deck also begins at index zero. */
  document.querySelector("#randomize-all")?.addEventListener("click", () => {
    queueMicrotask(() => {
      document.querySelector("#crystal-theme-rail button")?.click();
      syncTheme();
    });
  });

  /* Preserve the centered transform during theme-click feedback. */
  if (shell && typeof shell.animate === "function") {
    const nativeAnimate = shell.animate.bind(shell);
    shell.animate = (_keyframes, options) =>
      nativeAnimate(
        [
          { filter: "brightness(.88) saturate(.9)", opacity: .72 },
          { filter: "brightness(1.08) saturate(1.08)", opacity: 1 },
          { filter: "brightness(1) saturate(1)", opacity: 1 },
        ],
        options,
      );
  }

  /* Stop the expensive archive preview renderer while the archive is off screen. */
  const passage = document.querySelector("#crystal-passage");
  const topicCanvas = document.querySelector("#crystal-topic-canvas");
  if (passage && topicCanvas && "IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        topicCanvas.id = entry.isIntersecting
          ? "crystal-topic-canvas"
          : "crystal-topic-canvas-offscreen";
      },
      { rootMargin: "35% 0px 35% 0px", threshold: 0 },
    ).observe(passage);
  }
})();
