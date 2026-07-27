const installCrystalArchiveCompatibility = () => {
  if (!document.querySelector("#desi-crystal-compatibility")) {
    const style = document.createElement("style");
    style.id = "desi-crystal-compatibility";
    style.textContent = `
      #crystal-card-shell {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translate3d(-50%, -50%, 0) rotateY(0deg) scale(1) !important;
      }

      .crystal-theme-rail button {
        appearance: none;
        display: grid;
        grid-template-columns: 22px auto auto;
        align-items: center;
        justify-content: end;
        gap: 9px;
        min-width: 0;
        padding: 4px 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        letter-spacing: inherit;
        text-align: right;
        cursor: pointer;
        transition: color 180ms ease, transform 180ms ease;
      }

      .crystal-theme-rail button::before {
        content: "";
        width: 22px;
        height: 1px;
        background: rgba(170, 220, 228, 0.18);
        transition: width 180ms ease, background 180ms ease, box-shadow 180ms ease;
      }

      .crystal-theme-rail button > span {
        display: inline !important;
        color: rgba(120, 255, 230, 0.48);
        font: inherit;
        transform: none !important;
      }

      .crystal-theme-rail button > span::before {
        content: none !important;
        display: none !important;
      }

      .crystal-theme-rail button > small {
        color: inherit;
        font: inherit;
        font-size: inherit;
        letter-spacing: inherit;
      }

      .crystal-theme-rail button.is-active {
        grid-template-columns: 44px auto auto;
        color: var(--pearl);
        transform: translateX(-7px);
      }

      .crystal-theme-rail button.is-active::before {
        width: 44px;
        background: var(--aqua);
        box-shadow: 0 0 8px rgba(120, 255, 230, 0.42);
      }

      .crystal-theme-rail button:focus-visible {
        outline: 1px solid var(--aqua);
        outline-offset: 5px;
      }

      @media (max-width: 900px) {
        .crystal-theme-rail button {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto;
          justify-items: center;
          justify-content: stretch;
          gap: 2px;
          min-height: 44px;
          padding: 6px 5px;
          border: 1px solid rgba(143, 205, 216, 0.18);
          border-radius: 999px;
          background: rgba(4, 19, 28, 0.72);
          text-align: center;
        }

        .crystal-theme-rail button::before {
          display: none;
        }

        .crystal-theme-rail button > span {
          color: rgba(120, 255, 230, 0.58);
          font-size: 0.47rem;
        }

        .crystal-theme-rail button > small {
          font-size: 0.5rem;
        }

        .crystal-theme-rail button.is-active {
          grid-template-columns: 1fr;
          color: var(--pearl);
          border-color: rgba(120, 255, 230, 0.62);
          background: rgba(18, 72, 80, 0.55);
          box-shadow: 0 0 18px rgba(120, 255, 230, 0.13), inset 0 0 18px rgba(120, 255, 230, 0.06);
          transform: translateY(-3px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  const shell = document.querySelector("#crystal-card-shell");
  const prism = document.querySelector("#crystal-card-shell .crystal-prism");

  const revealAndSync = () => {
    if (!shell) return;
    shell.setAttribute("aria-hidden", "false");

    const rgb = prism?.style.getPropertyValue("--crystal-rgb").trim() || "120, 255, 230";
    shell.style.setProperty("--crystal-accent", `rgb(${rgb})`);
    shell.style.setProperty("--crystal-accent-soft", `rgba(${rgb}, 0.2)`);
  };

  revealAndSync();

  if (prism && "MutationObserver" in window) {
    const observer = new MutationObserver(revealAndSync);
    observer.observe(prism, {
      attributes: true,
      attributeFilter: ["style", "data-crystal-shape"],
    });
  }

  window.addEventListener("pageshow", revealAndSync, { passive: true });
};

import("./desi-ten-worlds.js?v=20260728-crystal-fix")
  .then(() => {
    const startCompatibilityPatch = () => {
      requestAnimationFrame(() => requestAnimationFrame(installCrystalArchiveCompatibility));
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startCompatibilityPatch, { once: true });
    } else {
      startCompatibilityPatch();
    }
  })
  .catch((error) => {
    console.error("DESI ten-worlds module failed to load:", error);
  });

import("./desi-visual-qa-final.js?v=20260728-visual-qa").catch((error) => {
  console.error("DESI visual QA corrections failed to load:", error);
});

import("./desi-crystal-assembly.js?v=20260728-shatter-assembly").catch((error) => {
  console.error("DESI crystal assembly animation failed to load:", error);
});

import("./desi-cinematic-aerial.js?v=20260728-cinematic-aerial").catch((error) => {
  console.error("DESI cinematic aesthetic layer failed to load:", error);
});

import("./desi-cinematic-motion-v2.js?v=20260728-motion-v2").catch((error) => {
  console.error("DESI cinematic motion direction v2 failed to load:", error);
});
