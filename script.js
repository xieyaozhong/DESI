const installCrystalArchiveCompatibility = () => {
  if (!document.querySelector("#desi-crystal-compatibility")) {
    const style = document.createElement("style");
    style.id = "desi-crystal-compatibility";
    style.textContent = `
      #crystal-card-shell {
        opacity: 1 !important;
        visibility: visible !important;
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
    shell.setAttribute("aria-hidden", "true");

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

const loadModule = (path, label) =>
  import(path).catch((error) => {
    console.error(`${label} failed to load:`, error);
    return null;
  });

const tenWorldsModule = loadModule(
  "./desi-ten-worlds.js?v=20260809-portfolio-r16",
  "DESI ten-worlds module",
);
const visualQaModule = loadModule(
  "./desi-visual-qa-final.js?v=20260809-portfolio-r16",
  "DESI visual QA corrections",
);
const crystalAssemblyModule = loadModule(
  "./desi-crystal-assembly.js?v=20260809-portfolio-r16",
  "DESI crystal assembly animation",
);
const directorV4Module = loadModule(
  "./desi-director-v4.js?v=20260809-portfolio-r16",
  "DESI unified WebGL cinematic director v4",
);
const directorV6Module = loadModule(
  "./desi-director-v6.js?v=20260809-portfolio-r16",
  "DESI cinematic aesthetic director v6",
);

tenWorldsModule.then(() => {
  const startCompatibilityPatch = () => {
    requestAnimationFrame(() => requestAnimationFrame(installCrystalArchiveCompatibility));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCompatibilityPatch, { once: true });
  } else {
    startCompatibilityPatch();
  }
});

const installCrystalCinemaStyles = () => {
  const existing = document.querySelector("link[data-desi-crystal-cinema]");
  const alignHashTarget = () => {
    if (!location.hash) return;
    let id = "";
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      id = location.hash.slice(1);
    }
    const target = document.getElementById(id);
    if (!target) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (id === "crystal-passage") {
          window.scrollTo({
            top: window.scrollY + target.getBoundingClientRect().top,
            behavior: "instant",
          });
          return;
        }
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }),
    );
  };
  if (existing) {
    alignHashTarget();
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./desi-crystal-cinema.css?v=20260809-portfolio-r16";
  link.dataset.desiCrystalCinema = "true";
  link.addEventListener("load", alignHashTarget, { once: true });
  document.head.appendChild(link);
};

Promise.allSettled([
  tenWorldsModule,
  visualQaModule,
  crystalAssemblyModule,
  directorV4Module,
  directorV6Module,
]).then(() => {
  const startFinalStyleLayer = () => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(installCrystalCinemaStyles),
      ),
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startFinalStyleLayer, { once: true });
  } else {
    startFinalStyleLayer();
  }
});
