(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const TAU = Math.PI * 2;
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = {
    paused: reduceMotionQuery.matches,
    elapsed: 0,
    lastFrame: performance.now(),
    scrollProgress: 0,
    visible: new Set(["top"]),
  };

  function safeContext(canvas) {
    return canvas?.getContext("2d", { alpha: true }) || null;
  }

  function sizeCanvas(canvas, context, dprLimit = 2) {
    if (!canvas || !context) return { width: 1, height: 1, dpr: 1 };
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height, dpr };
  }

  function watchSize(element, callback) {
    if (!element) return;
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => callback());
      observer.observe(element);
    } else {
      window.addEventListener("resize", callback, { passive: true });
    }
  }

  function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) [x, y] = [y, x % y];
    return x || 1;
  }

  function announceCanvas(canvas, message) {
    if (canvas) canvas.setAttribute("aria-label", message);
  }

  function setupMotionControl() {
    const button = $("#motion-toggle");
    if (!button) return;
    const icon = $(".motion-icon", button);
    const label = $(".motion-label", button);

    const sync = () => {
      document.body.classList.toggle("motion-paused", state.paused);
      button.setAttribute("aria-pressed", String(state.paused));
      if (icon) icon.textContent = state.paused ? "▶" : "Ⅱ";
      if (label) label.textContent = state.paused ? "繼續動態" : "暫停動態";
      button.setAttribute("aria-label", state.paused ? "繼續背景動態" : "暫停背景動態");
    };

    button.addEventListener("click", () => {
      state.paused = !state.paused;
      sync();
    });

    const onPreferenceChange = (event) => {
      if (event.matches) {
        state.paused = true;
        sync();
      }
    };

    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener("change", onPreferenceChange);
    } else {
      reduceMotionQuery.addListener(onPreferenceChange);
    }

    sync();
  }

  function setupScrollSystems() {
    const progress = $("#scroll-progress");
    const navLinks = $$(".chapter-nav a");
    const sections = $$("main section[id]");
    let ticking = false;

    const update = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      state.scrollProgress = clamp(window.scrollY / maxScroll, 0, 1);
      if (progress) progress.style.transform = `scaleX(${state.scrollProgress})`;

      const activationLine = window.innerHeight * 0.44;
      let activeId = sections[0]?.id || "top";
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= activationLine) activeId = section.id;
        else break;
      }
      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${activeId}`;
        if (isActive) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    update();

    if ("IntersectionObserver" in window) {
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) state.visible.add(entry.target.id);
            else state.visible.delete(entry.target.id);
          });
        },
        { rootMargin: "-28% 0px -42% 0px", threshold: [0, 0.1, 0.35, 0.7] },
      );
      sections.forEach((section) => sectionObserver.observe(section));
    } else {
      sections.forEach((section) => state.visible.add(section.id));
    }

    const revealItems = $$(".reveal");
    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
      );
      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }
  }

  function createAmbientField() {
    const canvas = $("#ambient-canvas");
    const context = safeContext(canvas);
    if (!canvas || !context) return { draw: () => {} };

    let metrics = { width: 1, height: 1, dpr: 1 };
    let particles = [];
    let shardSeed = 0;
    let needsPaint = true;
    let lastPaintProgress = -1;

    const randomParticle = (fresh = false) => ({
      x: Math.random(),
      y: fresh ? Math.random() : Math.random() * -0.15,
      z: 0.15 + Math.random() * 0.85,
      size: 0.45 + Math.random() * 2.3,
      speed: 0.018 + Math.random() * 0.055,
      drift: (Math.random() - 0.5) * 0.018,
      pulse: Math.random() * TAU,
      kind: Math.random() > 0.84 ? "shard" : "point",
    });

    const resize = () => {
      metrics = sizeCanvas(canvas, context, 1.5);
      const targetCount = clamp(Math.round((metrics.width * metrics.height) / 13500), 45, 125);
      particles = Array.from({ length: targetCount }, () => randomParticle(true));
      needsPaint = true;
    };

    const resetParticle = (particle) => {
      Object.assign(particle, randomParticle(false));
    };

    const drawWireForm = (time) => {
      const { width, height } = metrics;
      const compact = width < 820;
      const cx = compact ? width * 0.5 : width * 0.73;
      const cy = compact ? height * 0.32 : height * 0.5;
      const radius = Math.min(width, height) * (compact ? 0.22 : 0.29);
      const chapter = clamp(state.scrollProgress * 5, 0, 4.999);
      const phase = Math.floor(chapter);
      const local = chapter - phase;
      const alpha = phase === 0 ? 0.2 : 0.075;

      context.save();
      context.translate(cx, cy);
      context.rotate(time * 0.000025 + state.scrollProgress * 0.8);
      context.globalCompositeOperation = "screen";
      context.strokeStyle = `rgba(112, 202, 255, ${alpha})`;
      context.lineWidth = 0.7;

      if (phase <= 1) {
        const rings = 8;
        for (let ring = 1; ring <= rings; ring += 1) {
          context.beginPath();
          const r = (radius * ring) / rings;
          context.ellipse(0, 0, r, r * (0.38 + local * 0.1), 0, 0, TAU);
          context.stroke();
        }
        for (let spoke = 0; spoke < 14; spoke += 1) {
          const angle = (spoke / 14) * TAU;
          context.beginPath();
          context.moveTo(Math.cos(angle) * radius * 0.08, Math.sin(angle) * radius * 0.03);
          context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.42);
          context.stroke();
        }
      } else if (phase === 2) {
        context.beginPath();
        for (let i = 0; i <= 520; i += 1) {
          const t = (i / 520) * TAU;
          const x = Math.sin(3 * t + time * 0.00018) * radius;
          const y = Math.sin(2 * t) * radius * 0.72;
          if (!i) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      } else if (phase === 3) {
        context.beginPath();
        for (let i = 0; i <= 420; i += 1) {
          const angle = (i / 420) * TAU * 6;
          const r = radius * 0.035 * Math.exp(0.075 * angle);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r * 0.82;
          if (!i) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      } else {
        const cells = 9;
        for (let row = -cells; row <= cells; row += 1) {
          context.beginPath();
          for (let col = -cells; col <= cells; col += 1) {
            const angle = Math.atan2(row, col);
            const dist = Math.hypot(col, row);
            const warp = Math.sin(angle * 3 + dist * 1.4 + shardSeed) * 3;
            const x = col * (radius / cells) + warp;
            const y = row * (radius / cells) * 0.65 + warp * 0.5;
            if (col === -cells) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.stroke();
        }
      }

      context.restore();
    };

    const draw = (time, delta) => {
      const scrollChanged = Math.abs(state.scrollProgress - lastPaintProgress) > 0.001;
      if (state.paused && !needsPaint && !scrollChanged) return;
      const { width, height } = metrics;
      context.clearRect(0, 0, width, height);
      shardSeed = time * 0.00008;

      const glow = context.createRadialGradient(
        width * 0.52,
        height * 0.46,
        0,
        width * 0.52,
        height * 0.46,
        Math.max(width, height) * 0.72,
      );
      glow.addColorStop(0, "rgba(11, 89, 116, 0.12)");
      glow.addColorStop(0.45, "rgba(4, 31, 45, 0.045)");
      glow.addColorStop(1, "rgba(1, 7, 13, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      drawWireForm(time);
      context.save();
      context.globalCompositeOperation = "screen";

      for (const particle of particles) {
        if (!state.paused) {
          particle.y += particle.speed * (delta / 1000) * (0.65 + particle.z);
          particle.x += particle.drift * (delta / 1000);
          particle.pulse += delta * 0.0014;
        }
        if (particle.y > 1.08 || particle.x < -0.1 || particle.x > 1.1) {
          resetParticle(particle);
        }

        const x = particle.x * width;
        const y = particle.y * height;
        const brightness = 0.28 + Math.sin(particle.pulse) * 0.1 + particle.z * 0.42;
        const size = particle.size * (0.65 + particle.z);

        if (particle.kind === "shard") {
          context.save();
          context.translate(x, y);
          context.rotate(particle.pulse * 0.16);
          context.strokeStyle = `rgba(119, 210, 241, ${brightness * 0.38})`;
          context.fillStyle = `rgba(90, 168, 197, ${brightness * 0.075})`;
          context.beginPath();
          context.moveTo(0, -size * 3.2);
          context.lineTo(size * 1.8, size * 0.5);
          context.lineTo(0, size * 3.5);
          context.lineTo(-size * 1.25, size);
          context.closePath();
          context.fill();
          context.stroke();
          context.restore();
        } else {
          const pointGlow = context.createRadialGradient(x, y, 0, x, y, size * 4);
          pointGlow.addColorStop(0, `rgba(216, 255, 255, ${brightness})`);
          pointGlow.addColorStop(0.18, `rgba(104, 220, 255, ${brightness * 0.68})`);
          pointGlow.addColorStop(1, "rgba(75, 190, 231, 0)");
          context.fillStyle = pointGlow;
          context.beginPath();
          context.arc(x, y, size * 4, 0, TAU);
          context.fill();
        }
      }

      const waterY = height * 0.76;
      for (let line = 0; line < 8; line += 1) {
        const y = waterY + line * 11;
        context.beginPath();
        for (let x = 0; x <= width; x += 12) {
          const wave =
            Math.sin(x * 0.018 + time * 0.00035 + line) * (2.2 + line * 0.18) +
            Math.sin(x * 0.006 - time * 0.0002) * 2;
          if (!x) context.moveTo(x, y + wave);
          else context.lineTo(x, y + wave);
        }
        context.strokeStyle = `rgba(62, 169, 210, ${0.055 - line * 0.004})`;
        context.lineWidth = 1;
        context.stroke();
      }
      context.restore();
      needsPaint = false;
      lastPaintProgress = state.scrollProgress;
    };

    resize();
    watchSize(canvas, resize);
    return { draw };
  }

  function createWaveLab() {
    const canvas = $("#wave-canvas");
    const context = safeContext(canvas);
    const distance = $("#wave-distance");
    const wavelength = $("#wave-length");
    const phase = $("#wave-phase");
    const distanceOut = $("#wave-distance-out");
    const wavelengthOut = $("#wave-length-out");
    const phaseOut = $("#wave-phase-out");
    if (!canvas || !context || !distance || !wavelength || !phase) {
      return { draw: () => {} };
    }

    const field = document.createElement("canvas");
    const fieldContext = field.getContext("2d");
    let metrics = { width: 1, height: 1, dpr: 1 };
    let dirty = true;
    let lastDraw = 0;

    const resize = () => {
      metrics = sizeCanvas(canvas, context);
      field.width = clamp(Math.round(metrics.width * 0.46), 180, 310);
      field.height = clamp(
        Math.round((field.width * metrics.height) / Math.max(1, metrics.width)),
        120,
        210,
      );
      dirty = true;
    };

    const sync = () => {
      const phasePi = Number(phase.value) / 100;
      if (distanceOut) distanceOut.value = distance.value;
      if (wavelengthOut) wavelengthOut.value = wavelength.value;
      if (phaseOut) phaseOut.value = `${phasePi.toFixed(2)}π`;
      phase.setAttribute("aria-valuetext", `${phasePi.toFixed(2)} π`);
      announceCanvas(
        canvas,
        `雙波源干涉圖。波源距離 ${distance.value}，波長 ${wavelength.value}，相位差 ${phasePi.toFixed(2)}π。`,
      );
      dirty = true;
    };

    [distance, wavelength, phase].forEach((input) => input.addEventListener("input", sync));

    const renderField = (time) => {
      if (!fieldContext) return;
      const width = field.width;
      const height = field.height;
      const image = fieldContext.createImageData(width, height);
      const pixels = image.data;
      const scale = width / Math.max(1, metrics.width);
      const separation = Number(distance.value) * scale;
      const lambda = Math.max(4, Number(wavelength.value) * scale);
      const sourceAX = width * 0.5 - separation * 0.5;
      const sourceBX = width * 0.5 + separation * 0.5;
      const sourceY = height * 0.5;
      const phaseShift = (Number(phase.value) / 100) * Math.PI;
      const temporal = state.paused ? 0 : time * 0.0022;
      const k = TAU / lambda;
      let pointer = 0;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const d1 = Math.hypot(x - sourceAX, y - sourceY);
          const d2 = Math.hypot(x - sourceBX, y - sourceY);
          const h =
            (Math.sin(k * d1 - temporal) + Math.sin(k * d2 - temporal + phaseShift)) * 0.5;
          const magnitude = Math.abs(h);
          const node = 1 - magnitude;
          const radialFade = clamp(
            1 - Math.hypot(x - width / 2, y - height / 2) / (Math.max(width, height) * 0.72),
            0.22,
            1,
          );

          if (h >= 0) {
            pixels[pointer] = 5 + 48 * magnitude;
            pixels[pointer + 1] = 28 + 190 * magnitude;
            pixels[pointer + 2] = 43 + 205 * magnitude;
          } else {
            pixels[pointer] = 19 + 133 * magnitude;
            pixels[pointer + 1] = 17 + 92 * magnitude;
            pixels[pointer + 2] = 43 + 185 * magnitude;
          }
          pixels[pointer] *= radialFade;
          pixels[pointer + 1] *= radialFade;
          pixels[pointer + 2] *= radialFade;
          pixels[pointer + 3] = 236 - node * 22;
          pointer += 4;
        }
      }
      fieldContext.putImageData(image, 0, 0);

      const { width: cssWidth, height: cssHeight } = metrics;
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.save();
      context.imageSmoothingEnabled = true;
      context.globalAlpha = 0.9;
      context.drawImage(field, 0, 0, cssWidth, cssHeight);
      context.globalCompositeOperation = "screen";

      const screenSeparation = Number(distance.value);
      const ax = cssWidth * 0.5 - screenSeparation * 0.5;
      const bx = cssWidth * 0.5 + screenSeparation * 0.5;
      const sy = cssHeight * 0.5;
      [ax, bx].forEach((x, index) => {
        const glow = context.createRadialGradient(x, sy, 0, x, sy, 28);
        glow.addColorStop(
          0,
          index ? "rgba(176, 139, 255, 0.95)" : "rgba(120, 255, 230, 0.95)",
        );
        glow.addColorStop(0.2, index ? "rgba(166, 140, 255, 0.45)" : "rgba(112, 202, 255, 0.42)");
        glow.addColorStop(1, "rgba(100, 210, 240, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, sy, 28, 0, TAU);
        context.fill();

        context.strokeStyle = index ? "rgba(166, 140, 255, 0.9)" : "rgba(120, 255, 230, 0.9)";
        context.lineWidth = 1;
        context.beginPath();
        if (index) {
          context.rect(x - 4, sy - 4, 8, 8);
        } else {
          context.arc(x, sy, 5, 0, TAU);
        }
        context.stroke();
      });
      context.restore();
    };

    const draw = (time) => {
      if (!dirty && (state.paused || time - lastDraw < 38)) return;
      renderField(time);
      dirty = false;
      lastDraw = time;
    };

    sync();
    resize();
    watchSize(canvas, resize);
    return { draw, sync };
  }

  function createOrbitLab() {
    const canvas = $("#orbit-canvas");
    const context = safeContext(canvas);
    const inputA = $("#orbit-a");
    const inputB = $("#orbit-b");
    const phase = $("#orbit-phase");
    const outputA = $("#orbit-a-out");
    const outputB = $("#orbit-b-out");
    const phaseOut = $("#orbit-phase-out");
    const ratio = $("#orbit-ratio");
    if (!canvas || !context || !inputA || !inputB || !phase) {
      return { draw: () => {} };
    }

    let metrics = { width: 1, height: 1, dpr: 1 };
    let dirty = true;
    const resize = () => {
      metrics = sizeCanvas(canvas, context);
      dirty = true;
    };

    const sync = () => {
      const a = Number(inputA.value);
      const b = Number(inputB.value);
      const divisor = gcd(a, b);
      if (outputA) outputA.value = String(a);
      if (outputB) outputB.value = String(b);
      if (phaseOut) phaseOut.value = `${phase.value}°`;
      phase.setAttribute("aria-valuetext", `${phase.value} 度`);
      if (ratio) ratio.textContent = `RATIO / ${a / divisor}:${b / divisor}`;
      announceCanvas(
        canvas,
        `李薩如曲線。水平頻率 ${a}，垂直頻率 ${b}，相位 ${phase.value} 度。`,
      );
      dirty = true;
    };

    [inputA, inputB, phase].forEach((input) => input.addEventListener("input", sync));

    $$("[data-orbit]").forEach((button) => {
      button.addEventListener("click", () => {
        const values = button.dataset.orbit.split(",").map(Number);
        inputA.value = String(values[0]);
        inputB.value = String(values[1]);
        phase.value = values[0] === 3 ? "90" : "45";
        sync();
      });
    });

    const draw = (time) => {
      if (state.paused && !dirty) return;
      const { width, height } = metrics;
      context.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const rx = width * 0.4;
      const ry = height * 0.38;

      context.save();
      context.strokeStyle = "rgba(166, 226, 235, 0.09)";
      context.lineWidth = 1;
      for (let i = 1; i < 8; i += 1) {
        const x = (width / 8) * i;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let i = 1; i < 6; i += 1) {
        const y = (height / 6) * i;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.strokeStyle = "rgba(174, 234, 241, 0.22)";
      context.beginPath();
      context.moveTo(0, cy);
      context.lineTo(width, cy);
      context.moveTo(cx, 0);
      context.lineTo(cx, height);
      context.stroke();

      const a = Number(inputA.value);
      const b = Number(inputB.value);
      const delta = (Number(phase.value) * Math.PI) / 180;
      const path = new Path2D();
      const points = 720;
      for (let i = 0; i <= points; i += 1) {
        const t = (i / points) * TAU;
        const x = cx + Math.sin(a * t + delta) * rx;
        const y = cy + Math.sin(b * t) * ry;
        if (!i) path.moveTo(x, y);
        else path.lineTo(x, y);
      }

      context.globalCompositeOperation = "screen";
      context.strokeStyle = "rgba(73, 196, 232, 0.12)";
      context.lineWidth = 10;
      context.stroke(path);
      const gradient = context.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
      gradient.addColorStop(0, "#78ffe6");
      gradient.addColorStop(0.5, "#70caff");
      gradient.addColorStop(1, "#a68cff");
      context.strokeStyle = gradient;
      context.lineWidth = 1.5;
      context.stroke(path);

      const playhead = state.paused ? 0.7 : time * 0.00042;
      const dotX = cx + Math.sin(a * playhead + delta) * rx;
      const dotY = cy + Math.sin(b * playhead) * ry;
      const dotGlow = context.createRadialGradient(dotX, dotY, 0, dotX, dotY, 24);
      dotGlow.addColorStop(0, "rgba(238, 255, 253, 1)");
      dotGlow.addColorStop(0.18, "rgba(120, 255, 230, 0.92)");
      dotGlow.addColorStop(1, "rgba(112, 202, 255, 0)");
      context.fillStyle = dotGlow;
      context.beginPath();
      context.arc(dotX, dotY, 24, 0, TAU);
      context.fill();
      context.fillStyle = "#ecfffb";
      context.beginPath();
      context.arc(dotX, dotY, 2.5, 0, TAU);
      context.fill();

      context.globalCompositeOperation = "source-over";
      context.fillStyle = "rgba(180, 220, 228, 0.45)";
      context.font = '9px "Cascadia Mono", Consolas, monospace';
      context.fillText("x(t)", width - 30, cy - 8);
      context.fillText("y(t)", cx + 8, 14);
      context.restore();
      dirty = false;
    };

    sync();
    resize();
    watchSize(canvas, resize);
    return { draw, sync };
  }

  function createSpiralLab() {
    const canvas = $("#spiral-canvas");
    const context = safeContext(canvas);
    const growth = $("#spiral-growth");
    const turns = $("#spiral-turns");
    const growthOut = $("#spiral-growth-out");
    const turnsOut = $("#spiral-turns-out");
    const goldenButton = $("#golden-spiral");
    if (!canvas || !context || !growth || !turns) return { draw: () => {} };

    let metrics = { width: 1, height: 1, dpr: 1 };
    let dirty = true;
    const resize = () => {
      metrics = sizeCanvas(canvas, context);
      dirty = true;
    };

    const sync = () => {
      const q = Number(growth.value) / 100;
      if (growthOut) growthOut.value = `${q.toFixed(2)}×`;
      if (turnsOut) turnsOut.value = turns.value;
      growth.setAttribute("aria-valuetext", `${q.toFixed(2)} 倍`);
      announceCanvas(
        canvas,
        `對數螺旋。每九十度放大 ${q.toFixed(2)} 倍，共 ${turns.value} 圈。`,
      );
      dirty = true;
    };

    [growth, turns].forEach((input) => input.addEventListener("input", sync));
    goldenButton?.addEventListener("click", () => {
      growth.value = "162";
      sync();
    });

    const draw = (time) => {
      if (state.paused && !dirty) return;
      const { width, height } = metrics;
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(width, height) * 0.42;
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(cx, cy);

      context.strokeStyle = "rgba(157, 221, 232, 0.1)";
      context.lineWidth = 1;
      for (let ring = 1; ring <= 5; ring += 1) {
        context.beginPath();
        context.arc(0, 0, (maxRadius * ring) / 5, 0, TAU);
        context.stroke();
      }
      for (let spoke = 0; spoke < 12; spoke += 1) {
        const angle = (spoke / 12) * TAU;
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(Math.cos(angle) * maxRadius, Math.sin(angle) * maxRadius);
        context.stroke();
      }

      const q = Number(growth.value) / 100;
      const totalTurns = Number(turns.value);
      const maxTheta = totalTurns * TAU;
      const b = q <= 1 ? 0 : (2 * Math.log(q)) / Math.PI;
      const rotation = state.paused ? -0.45 : -0.45 + Math.sin(time * 0.00013) * 0.05;
      const samples = Math.max(380, totalTurns * 100);
      const path = new Path2D();

      for (let i = 0; i <= samples; i += 1) {
        const theta = (i / samples) * maxTheta;
        const radius =
          b === 0 ? maxRadius * 0.72 : maxRadius * Math.exp(b * (theta - maxTheta));
        const angle = theta + rotation;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (!i) path.moveTo(x, y);
        else path.lineTo(x, y);
      }

      context.globalCompositeOperation = "screen";
      context.strokeStyle = "rgba(93, 202, 235, 0.13)";
      context.lineWidth = 11;
      context.stroke(path);
      const gradient = context.createLinearGradient(-maxRadius, 0, maxRadius, 0);
      gradient.addColorStop(0, "#a68cff");
      gradient.addColorStop(0.45, "#70caff");
      gradient.addColorStop(1, "#78ffe6");
      context.strokeStyle = gradient;
      context.lineWidth = 1.6;
      context.stroke(path);

      const quarterSteps = totalTurns * 4;
      for (let step = 0; step <= quarterSteps; step += 1) {
        const theta = (step / quarterSteps) * maxTheta;
        const radius =
          b === 0 ? maxRadius * 0.72 : maxRadius * Math.exp(b * (theta - maxTheta));
        if (radius < 5 && step < quarterSteps - 8) continue;
        const angle = theta + rotation;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        context.fillStyle =
          step % 4 === 0 ? "rgba(243, 216, 145, 0.92)" : "rgba(120, 255, 230, 0.55)";
        context.beginPath();
        context.arc(x, y, step % 4 === 0 ? 2.4 : 1.35, 0, TAU);
        context.fill();

        if (step >= quarterSteps - 2) {
          context.fillStyle = "rgba(215, 242, 241, 0.56)";
          context.font = '9px "Cascadia Mono", Consolas, monospace';
          context.fillText(`q^${step - quarterSteps}`, x + 7, y - 5);
        }
      }

      context.fillStyle = "rgba(236, 255, 251, 0.9)";
      context.beginPath();
      context.arc(0, 0, 2.2, 0, TAU);
      context.fill();
      context.restore();
      dirty = false;
    };

    sync();
    resize();
    watchSize(canvas, resize);
    return { draw, sync };
  }

  function createFractalLab() {
    const canvas = $("#fractal-canvas");
    const context = safeContext(canvas);
    const iterations = $("#fractal-iterations");
    const iterationsOut = $("#fractal-iterations-out");
    const coordinates = $("#fractal-coords");
    const status = $("#fractal-status");
    if (!canvas || !context || !iterations) {
      return { draw: () => {}, reset: () => {}, render: () => {} };
    }

    const view = { x: -0.75, y: 0, scale: 3.1 };
    const defaults = { x: -0.75, y: 0, scale: 3.1 };
    let metrics = { width: 1, height: 1, dpr: 1 };
    let renderToken = 0;
    let rendered = false;
    let started = false;
    let renderRequested = true;
    const buffer = document.createElement("canvas");
    const bufferContext = buffer.getContext("2d");

    const updateCoordinates = () => {
      const zoom = defaults.scale / view.scale;
      if (coordinates) {
        coordinates.textContent = `X ${view.x.toFixed(5)} / Y ${view.y.toFixed(5)} / Z ${zoom.toFixed(2)}`;
      }
      announceCanvas(
        canvas,
        `Mandelbrot 集合。中心座標 ${view.x.toFixed(5)} 加 ${view.y.toFixed(5)}i，放大 ${zoom.toFixed(2)} 倍，迭代 ${iterations.value} 次。`,
      );
    };

    const paintBuffer = () => {
      const { width, height } = metrics;
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.drawImage(buffer, 0, 0, width, height);
      context.save();
      context.strokeStyle = "rgba(222, 255, 250, 0.34)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(width / 2 - 7, height / 2);
      context.lineTo(width / 2 + 7, height / 2);
      context.moveTo(width / 2, height / 2 - 7);
      context.lineTo(width / 2, height / 2 + 7);
      context.stroke();
      context.restore();
    };

    const render = () => {
      if (!bufferContext) return;
      started = true;
      renderRequested = false;
      const token = ++renderToken;
      rendered = false;
      const renderWidth = clamp(Math.round(metrics.width * 0.72), 240, 540);
      const renderHeight = clamp(
        Math.round((renderWidth * metrics.height) / Math.max(1, metrics.width)),
        160,
        380,
      );
      buffer.width = renderWidth;
      buffer.height = renderHeight;
      const image = bufferContext.createImageData(renderWidth, renderHeight);
      const pixels = image.data;
      const maxIterations = Number(iterations.value);
      const aspect = renderHeight / renderWidth;
      const verticalScale = view.scale * aspect;
      let row = 0;

      if (status) status.textContent = "CALCULATING FIELD…";
      updateCoordinates();

      const processRows = () => {
        if (token !== renderToken) return;
        const stopRow = Math.min(renderHeight, row + 10);

        for (; row < stopRow; row += 1) {
          const cy = view.y + (row / (renderHeight - 1) - 0.5) * verticalScale;
          for (let col = 0; col < renderWidth; col += 1) {
            const cx = view.x + (col / (renderWidth - 1) - 0.5) * view.scale;
            let zx = 0;
            let zy = 0;
            let zx2 = 0;
            let zy2 = 0;
            let count = 0;

            while (zx2 + zy2 <= 4 && count < maxIterations) {
              zy = 2 * zx * zy + cy;
              zx = zx2 - zy2 + cx;
              zx2 = zx * zx;
              zy2 = zy * zy;
              count += 1;
            }

            const pointer = (row * renderWidth + col) * 4;
            if (count === maxIterations) {
              pixels[pointer] = 2;
              pixels[pointer + 1] = 9;
              pixels[pointer + 2] = 16;
            } else {
              const magnitude = Math.sqrt(zx2 + zy2);
              const smooth =
                count + 1 - Math.log(Math.max(1e-9, Math.log(Math.max(1.000001, magnitude)))) / Math.log(2);
              const normalized = clamp(smooth / maxIterations, 0, 1);
              const band = 0.5 + 0.5 * Math.cos(smooth * 0.48);
              const edge = Math.pow(normalized, 0.42);
              pixels[pointer] = Math.round(6 + 118 * edge * (0.35 + band * 0.65));
              pixels[pointer + 1] = Math.round(18 + 205 * edge);
              pixels[pointer + 2] = Math.round(31 + 218 * edge * (0.72 + band * 0.28));
            }
            pixels[pointer + 3] = 255;
          }
        }

        bufferContext.putImageData(image, 0, 0);
        paintBuffer();

        if (row < renderHeight) {
          requestAnimationFrame(processRows);
        } else {
          rendered = true;
          if (status) status.textContent = "FIELD READY";
        }
      };

      requestAnimationFrame(processRows);
    };

    const resize = () => {
      metrics = sizeCanvas(canvas, context);
      if (started) render();
      else {
        renderRequested = true;
        updateCoordinates();
      }
    };

    const zoom = (factor) => {
      view.scale = clamp(view.scale * factor, 0.000006, 8);
      render();
    };

    const pan = (dx, dy) => {
      const aspect = metrics.height / Math.max(1, metrics.width);
      view.x += dx * view.scale;
      view.y += dy * view.scale * aspect;
      render();
    };

    const reset = () => {
      Object.assign(view, defaults);
      render();
    };

    iterations.addEventListener("input", () => {
      if (iterationsOut) iterationsOut.value = iterations.value;
      if (started) render();
      else renderRequested = true;
    });

    $$("[data-fractal]").forEach((button) => {
      button.addEventListener("click", () => {
        switch (button.dataset.fractal) {
          case "zoom-in":
            zoom(0.58);
            break;
          case "zoom-out":
            zoom(1.72);
            break;
          case "reset":
            reset();
            break;
          case "cardioid":
            Object.assign(view, { x: -0.45, y: 0, scale: 1.65 });
            render();
            break;
          case "seahorse":
            Object.assign(view, { x: -0.7436439, y: 0.1318259, scale: 0.012 });
            render();
            break;
          default:
            break;
        }
      });
    });

    canvas.addEventListener("click", (event) => {
      const rect = canvas.getBoundingClientRect();
      const aspect = rect.height / Math.max(1, rect.width);
      view.x += (event.clientX - rect.left) / rect.width * view.scale - view.scale / 2;
      view.y +=
        ((event.clientY - rect.top) / rect.height - 0.5) * view.scale * aspect;
      view.scale *= 0.56;
      render();
    });

    canvas.addEventListener("keydown", (event) => {
      const key = event.key;
      const handled = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "_", "Home"].includes(
        key,
      );
      if (!handled) return;
      event.preventDefault();
      if (key === "ArrowLeft") pan(-0.12, 0);
      if (key === "ArrowRight") pan(0.12, 0);
      if (key === "ArrowUp") pan(0, -0.12);
      if (key === "ArrowDown") pan(0, 0.12);
      if (key === "+" || key === "=") zoom(0.58);
      if (key === "-" || key === "_") zoom(1.72);
      if (key === "Home") reset();
    });

    if (iterationsOut) iterationsOut.value = iterations.value;
    resize();
    watchSize(canvas, resize);

    return {
      draw: () => {
        if (!started && renderRequested) {
          render();
          return;
        }
        if (!rendered) paintBuffer();
      },
      reset,
      render,
    };
  }

  function setupGlobalActions(labs) {
    const values = {
      "wave-distance": "116",
      "wave-length": "48",
      "wave-phase": "0",
      "orbit-a": "3",
      "orbit-b": "2",
      "orbit-phase": "90",
      "spiral-growth": "128",
      "spiral-turns": "6",
      "fractal-iterations": "90",
    };

    const dispatchAll = () => {
      Object.entries(values).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };

    $("#randomize-all")?.addEventListener("click", () => {
      const randomValues = {
        "wave-distance": Math.round(55 + Math.random() * 130),
        "wave-length": Math.round(24 + Math.random() * 55),
        "wave-phase": Math.round(Math.random() * 200),
        "orbit-a": 1 + Math.floor(Math.random() * 7),
        "orbit-b": 1 + Math.floor(Math.random() * 7),
        "orbit-phase": Math.round(Math.random() * 360),
        "spiral-growth": Math.round(105 + Math.random() * 75),
        "spiral-turns": 3 + Math.floor(Math.random() * 6),
        "fractal-iterations": 70 + Math.floor(Math.random() * 8) * 10,
      };

      Object.entries(randomValues).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.value = String(value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      $("#wave")?.scrollIntoView({
        behavior: state.paused ? "auto" : "smooth",
        block: "start",
      });
    });

    $("#restart-all")?.addEventListener("click", () => {
      dispatchAll();
      labs.fractal.reset();
      window.scrollTo({ top: 0, behavior: state.paused ? "auto" : "smooth" });
    });

    const shareButton = $("[data-share-copy]");
    const shareStatus = $("#share-status");
    shareButton?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href.split("#")[0]);
        if (shareStatus) shareStatus.textContent = "探索網址已複製";
      } catch {
        if (shareStatus) shareStatus.textContent = "請從瀏覽器網址列複製網址";
      }
    });
  }

  function start() {
    setupMotionControl();
    setupScrollSystems();
    const ambient = createAmbientField();
    const wave = createWaveLab();
    const orbit = createOrbitLab();
    const spiral = createSpiralLab();
    const fractal = createFractalLab();
    const labs = { ambient, wave, orbit, spiral, fractal };
    setupGlobalActions(labs);

    const frame = (now) => {
      const delta = clamp(now - state.lastFrame, 0, 50);
      state.lastFrame = now;
      if (!state.paused) state.elapsed += delta;

      ambient.draw(state.elapsed, delta);
      if (state.visible.has("wave")) wave.draw(state.elapsed);
      if (state.visible.has("orbit")) orbit.draw(state.elapsed);
      if (state.visible.has("spiral")) spiral.draw(state.elapsed);
      if (state.visible.has("fractal")) fractal.draw(state.elapsed);

      if (state.paused) {
        window.setTimeout(() => requestAnimationFrame(frame), 220);
      } else {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
