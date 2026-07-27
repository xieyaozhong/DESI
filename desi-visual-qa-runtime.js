(() => {
  "use strict";

  function init() {
    const style = document.createElement("style");
    style.id = "desi-visual-qa-runtime-styles";
    style.textContent = `
      #crystal-topic-canvas-offscreen {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
    `;
    document.head.appendChild(style);

    const shell = document.querySelector("#crystal-card-shell");
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
