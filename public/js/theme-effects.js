// ── Theme Visual Effects Engine ──
// Each theme gets a unique canvas-based background effect.
// Speed is controllable via a slider (saved per-theme in localStorage).

(function () {
  'use strict';

  let activeEffect = null;
  let effectCanvas = null;
  let effectCtx = null;
  let effectRAF = null;
  let _effectResizeHandler = null;
  let currentSpeed = 1.0;

  // ═══════════════════════════════════════════════════════════
  //  SPEED CONTROL
  // ═══════════════════════════════════════════════════════════

  function getSpeedKey(theme) {
    return 'themeEffectSpeed_' + theme;
  }

  function getSavedSpeed(theme) {
    const val = localStorage.getItem(getSpeedKey(theme));
    return val !== null ? parseFloat(val) : 1.0;
  }

  function saveSpeed(theme, speed) {
    localStorage.setItem(getSpeedKey(theme), speed.toString());
  }

  function buildSpeedSlider(theme) {
    let container = document.getElementById('effectSpeedContainer');
    if (container) container.remove();

    container = document.createElement('div');
    container.id = 'effectSpeedContainer';
    container.className = 'effect-speed-container';

    const label = document.createElement('span');
    label.className = 'effect-speed-label';
    label.textContent = '⚡';
    label.title = 'Effect speed';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0.1';
    slider.max = '3';
    slider.step = '0.1';
    slider.value = getSavedSpeed(theme).toString();
    slider.className = 'effect-speed-slider';
    slider.title = 'Effect speed';

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      currentSpeed = v;
      saveSpeed(theme, v);
    });

    container.appendChild(label);
    container.appendChild(slider);

    // Insert next to the theme switcher
    const themeLangItem = document.querySelector('.nav-item-theme-lang');
    if (themeLangItem) {
      themeLangItem.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
  }

  function removeSpeedSlider() {
    const c = document.getElementById('effectSpeedContainer');
    if (c) c.remove();
  }

  // ═══════════════════════════════════════════════════════════
  //  CANVAS SETUP / TEARDOWN
  // ═══════════════════════════════════════════════════════════

  function createCanvas(id, opacity) {
    const c = document.createElement('canvas');
    c.id = id;
    c.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-2;pointer-events:none;opacity:${opacity};`;
    document.body.prepend(c);
    return c;
  }

  function setupCanvas(id, opacity) {
    destroyEffect();

    effectCanvas = createCanvas(id, opacity);
    effectCtx = effectCanvas.getContext('2d');

    function onResize() {
      effectCanvas.width = window.innerWidth;
      effectCanvas.height = window.innerHeight;
    }
    _effectResizeHandler = onResize;
    onResize();
    window.addEventListener('resize', _effectResizeHandler);

    return { canvas: effectCanvas, ctx: effectCtx };
  }

  function destroyEffect() {
    if (effectRAF) {
      cancelAnimationFrame(effectRAF);
      effectRAF = null;
    }
    if (effectCanvas) {
      effectCanvas.remove();
      effectCanvas = null;
      effectCtx = null;
    }
    if (_effectResizeHandler) {
      window.removeEventListener('resize', _effectResizeHandler);
      _effectResizeHandler = null;
    }
    activeEffect = null;
  }

  // ═══════════════════════════════════════════════════════════
  //  1. MATRIX GREEN — Digital Rain (bright, proper font rendering)
  // ═══════════════════════════════════════════════════════════

  const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]|/\\=+*&@#$%';
  const M_FONT = 18;

  function startMatrix() {
    const { canvas, ctx } = setupCanvas('matrixRainCanvas', 0.35);
    let drops = [];
    // Store the character and brightness for each column so we can re-render
    // the static state when speed=0 without turning chars into squares.
    let charGrid = [];

    function resetDrops() {
      const cols = Math.floor(canvas.width / M_FONT);
      const rows = Math.ceil(canvas.height / M_FONT) + 2;
      drops = Array.from({ length: cols }, (_, i) =>
        drops[i] !== undefined ? drops[i] : Math.random() * -50
      );
      // Init char grid if needed
      if (charGrid.length !== cols) {
        charGrid = Array.from({ length: cols }, () =>
          Array.from({ length: rows }, () => ({
            char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
            alpha: 0
          }))
        );
      }
    }

    const origResize = _effectResizeHandler;
    _effectResizeHandler = () => { origResize(); resetDrops(); };
    window.removeEventListener('resize', origResize);
    window.addEventListener('resize', _effectResizeHandler);
    resetDrops();

    let frameCount = 0;

    function draw() {
      frameCount++;
      const cols = Math.floor(canvas.width / M_FONT);
      const rows = Math.ceil(canvas.height / M_FONT) + 2;

      // Full clear and redraw approach — avoids the "squares" artifact
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold ' + M_FONT + 'px "Courier New", monospace';
      ctx.textBaseline = 'top';

      for (let i = 0; i < cols; i++) {
        const headRow = Math.floor(drops[i] || 0);

        for (let r = 0; r < rows; r++) {
          if (!charGrid[i] || !charGrid[i][r]) continue;
          const cell = charGrid[i][r];

          // Distance from the drop head
          const dist = headRow - r;
          if (dist < 0 || dist > 28) {
            cell.alpha = 0;
            continue;
          }

          // Head chars are bright white-green, trail fades out
          if (dist === 0) {
            cell.alpha = 1.0;
            cell.char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          } else if (dist < 3) {
            cell.alpha = 0.9 - dist * 0.1;
          } else {
            cell.alpha = Math.max(0, 0.7 - dist * 0.025);
          }

          // Randomly flicker some characters in the trail
          if (dist > 0 && dist < 20 && Math.random() < 0.02) {
            cell.char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          }

          if (cell.alpha <= 0) continue;

          const x = i * M_FONT;
          const y = r * M_FONT;

          if (dist === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 12;
          } else if (dist < 3) {
            ctx.fillStyle = '#80ffa0';
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 6;
          } else {
            ctx.fillStyle = '#00ff41';
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }

          ctx.globalAlpha = cell.alpha;
          ctx.fillText(cell.char, x, y);
        }

        // Advance the drop
        if (currentSpeed > 0) {
          drops[i] = (drops[i] || 0) + currentSpeed * 0.6;
          if (drops[i] * M_FONT > canvas.height + 28 * M_FONT && Math.random() > 0.96) {
            drops[i] = Math.random() * -15;
          }
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      effectRAF = requestAnimationFrame(draw);
    }
    draw();
    activeEffect = 'matrix-green';
  }

  // ═══════════════════════════════════════════════════════════
  //  2. CYBERPUNK PURPLE — Data stream / neon rain + glitch blocks
  // ═══════════════════════════════════════════════════════════

  function startCyberpunk() {
    const { canvas, ctx } = setupCanvas('cyberpunkFxCanvas', 0.55);
    const colors = ['#ff1f5a', '#00e5ff', '#b895e6', '#ff78cc', '#ffe02e'];

    // Neon rain columns (vertical data streams)
    const streams = [];
    const STREAM_CHARS = '01<>/{}[]|#@$%&*+=~^';
    const S_FONT = 14;
    const streamCols = Math.floor(canvas.width / (S_FONT * 3));

    for (let i = 0; i < streamCols; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      streams.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        speed: 1 + Math.random() * 3,
        chars: Array.from({ length: 5 + Math.floor(Math.random() * 12) }, () =>
          STREAM_CHARS[Math.floor(Math.random() * STREAM_CHARS.length)]
        ),
        color: color,
        alpha: 0.3 + Math.random() * 0.4
      });
    }

    // Glitch blocks that flash randomly
    const glitchBlocks = [];
    function spawnGlitch() {
      glitchBlocks.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        w: 20 + Math.random() * 200,
        h: 2 + Math.random() * 8,
        life: 0.3 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.3 + Math.random() * 0.5
      });
    }

    // Floating circuit traces
    const circuits = [];
    for (let i = 0; i < 8; i++) {
      const pts = [];
      let cx = Math.random() * canvas.width;
      let cy = Math.random() * canvas.height;
      const segments = 4 + Math.floor(Math.random() * 6);
      for (let j = 0; j < segments; j++) {
        pts.push({ x: cx, y: cy });
        if (Math.random() > 0.5) cx += (Math.random() - 0.5) * 150;
        else cy += (Math.random() - 0.5) * 150;
      }
      circuits.push({
        points: pts,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.1 + Math.random() * 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Circuit board traces ──
      for (const c of circuits) {
        c.pulse += c.pulseSpeed * currentSpeed;
        const a = c.alpha * (0.5 + 0.5 * Math.sin(c.pulse));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let j = 0; j < c.points.length; j++) {
          if (j === 0) ctx.moveTo(c.points[j].x, c.points[j].y);
          else ctx.lineTo(c.points[j].x, c.points[j].y);
        }
        ctx.stroke();
        // Node dots
        for (const p of c.points) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = c.color;
          ctx.fill();
        }
        ctx.restore();
      }

      // ── Data streams (vertical neon rain) ──
      ctx.font = S_FONT + 'px monospace';
      ctx.textBaseline = 'top';
      for (const s of streams) {
        s.y += s.speed * currentSpeed;
        if (s.y > canvas.height + 50) {
          s.y = Math.random() * -300 - 50;
          s.x = Math.random() * canvas.width;
        }

        for (let j = 0; j < s.chars.length; j++) {
          const cy = s.y + j * S_FONT;
          if (cy < -S_FONT || cy > canvas.height + S_FONT) continue;

          // Flicker random chars
          if (Math.random() < 0.03) {
            s.chars[j] = STREAM_CHARS[Math.floor(Math.random() * STREAM_CHARS.length)];
          }

          const distFromHead = j / s.chars.length;
          ctx.save();
          ctx.globalAlpha = s.alpha * (1 - distFromHead * 0.7);
          ctx.fillStyle = j === 0 ? '#ffffff' : s.color;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = j === 0 ? 14 : 4;
          ctx.fillText(s.chars[j], s.x, cy);
          ctx.restore();
        }
      }

      // ── Glitch blocks ──
      if (Math.random() < 0.06 * currentSpeed && glitchBlocks.length < 8) spawnGlitch();
      for (let i = glitchBlocks.length - 1; i >= 0; i--) {
        const g = glitchBlocks[i];
        g.life -= 0.016;
        if (g.life <= 0) { glitchBlocks.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = g.alpha * g.life;
        ctx.fillStyle = g.color;
        ctx.shadowColor = g.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(g.x, g.y, g.w, g.h);
        // Chromatic split
        ctx.globalAlpha = g.alpha * g.life * 0.4;
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(g.x + 2, g.y - 1, g.w, g.h);
        ctx.fillStyle = '#ff1f5a';
        ctx.fillRect(g.x - 2, g.y + 1, g.w, g.h);
        ctx.restore();
      }

      effectRAF = requestAnimationFrame(draw);
    }
    draw();
    activeEffect = 'cyberpunk-purple';
  }

  // ═══════════════════════════════════════════════════════════
  //  3. DARK — Nebula + bright starfield + shooting stars
  // ═══════════════════════════════════════════════════════════

  function startStarfield() {
    const { canvas, ctx } = setupCanvas('starfieldCanvas', 1.0);
    const stars = [];
    const STAR_COUNT = 300;

    for (let i = 0; i < STAR_COUNT; i++) {
      const isBright = Math.random() > 0.7;
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: isBright ? (1.0 + Math.random() * 2.5) : (0.4 + Math.random() * 1.0),
        baseAlpha: isBright ? (0.6 + Math.random() * 0.4) : (0.3 + Math.random() * 0.5),
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.04,
        color: Math.random() > 0.85 ? '#c4b5fd' : (Math.random() > 0.7 ? '#93c5fd' : '#ffffff'),
        drift: (Math.random() - 0.5) * 0.08
      });
    }

    // Nebula clouds
    const nebulae = [];
    const nebulaColors = [
      { r: 91, g: 138, b: 245 },  // blue
      { r: 124, g: 108, b: 240 }, // purple
      { r: 52, g: 211, b: 153 },  // teal
      { r: 240, g: 112, b: 112 }, // warm red
    ];
    for (let i = 0; i < 5; i++) {
      const nc = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
      nebulae.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        rx: 100 + Math.random() * 250,
        ry: 60 + Math.random() * 150,
        color: nc,
        alpha: 0.03 + Math.random() * 0.06,
        drift: (Math.random() - 0.5) * 0.1,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.003 + Math.random() * 0.005
      });
    }

    // Shooting stars
    const shootingStars = [];
    function spawnShootingStar() {
      shootingStars.push({
        x: Math.random() * canvas.width * 0.8,
        y: Math.random() * canvas.height * 0.3,
        vx: 6 + Math.random() * 10,
        vy: 3 + Math.random() * 5,
        life: 1.0,
        decay: 0.012 + Math.random() * 0.015,
        len: 50 + Math.random() * 100
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Nebula clouds ──
      for (const n of nebulae) {
        n.phase += n.pulseSpeed * currentSpeed;
        n.x += n.drift * currentSpeed;
        if (n.x < -n.rx) n.x = canvas.width + n.rx;
        if (n.x > canvas.width + n.rx) n.x = -n.rx;

        const pulseAlpha = n.alpha * (0.7 + 0.3 * Math.sin(n.phase));
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, Math.max(n.rx, n.ry));
        grad.addColorStop(0, `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${pulseAlpha})`);
        grad.addColorStop(0.5, `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${pulseAlpha * 0.3})`);
        grad.addColorStop(1, 'transparent');

        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(n.x, n.y, n.rx, n.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Stars ──
      for (const s of stars) {
        s.phase += s.twinkleSpeed * currentSpeed;
        s.x += s.drift * currentSpeed;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;

        const alpha = s.baseAlpha * (0.4 + 0.6 * Math.sin(s.phase));
        if (alpha < 0.05) continue;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;

        // Glow
        if (s.r > 1.5) {
          ctx.shadowColor = s.color;
          ctx.shadowBlur = s.r * 6;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        // Cross rays for very bright stars
        if (s.r > 2.0 && alpha > 0.5) {
          ctx.globalAlpha = alpha * 0.4;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.8;
          const rayLen = s.r * 5;
          ctx.beginPath();
          ctx.moveTo(s.x - rayLen, s.y);
          ctx.lineTo(s.x + rayLen, s.y);
          ctx.moveTo(s.x, s.y - rayLen);
          ctx.lineTo(s.x, s.y + rayLen);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Shooting stars ──
      if (Math.random() < 0.006 * currentSpeed && shootingStars.length < 3) {
        spawnShootingStar();
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx * currentSpeed;
        ss.y += ss.vy * currentSpeed;
        ss.life -= ss.decay * currentSpeed;
        if (ss.life <= 0) { shootingStars.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = ss.life;
        const tailX = ss.x - ss.len * (ss.vx / 10);
        const tailY = ss.y - ss.len * (ss.vy / 10);
        const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, 'rgba(147, 197, 253, 0.6)');
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#93c5fd';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Head glow
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      }

      effectRAF = requestAnimationFrame(draw);
    }
    draw();
    activeEffect = 'dark';
  }

  // ═══════════════════════════════════════════════════════════
  //  4. LIGHT — Sunlight rays, golden dust motes, lens flares
  // ═══════════════════════════════════════════════════════════

  function startBokeh() {
    const { canvas, ctx } = setupCanvas('bokehCanvas', 0.8);

    // ── Dust motes ──
    const motes = [];
    const MOTE_COUNT = 70;
    const moteColors = ['#c9a84c', '#e8b960', '#d4a03c', '#f0c860', '#b8942e'];
    for (let i = 0; i < MOTE_COUNT; i++) {
      motes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1.5 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.05 - Math.random() * 0.2,
        alpha: 0.15 + Math.random() * 0.4,
        color: moteColors[Math.floor(Math.random() * moteColors.length)],
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02
      });
    }

    // ── Larger bokeh circles ──
    const bokehs = [];
    const bokehColors = ['#3566d5', '#6c5ce7', '#e8b960', '#34d399', '#f0c860', '#ff9ecd'];
    for (let i = 0; i < 25; i++) {
      bokehs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 15 + Math.random() * 50,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.05 - Math.random() * 0.15,
        alpha: 0.04 + Math.random() * 0.08,
        color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.005 + Math.random() * 0.01
      });
    }

    // ── Sunlight ray from top-right ──
    const rayCount = 6;
    const rays = [];
    const rayOriginX = canvas.width * 0.85;
    const rayOriginY = -30;
    for (let i = 0; i < rayCount; i++) {
      rays.push({
        angle: (Math.PI / 2.5) + (i / rayCount) * (Math.PI / 4),
        width: 40 + Math.random() * 80,
        length: Math.max(canvas.width, canvas.height) * 1.2,
        alpha: 0.02 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.003 + Math.random() * 0.005
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width;
      const H = canvas.height;

      // ── Sun rays ──
      for (const r of rays) {
        r.phase += r.pulseSpeed * currentSpeed;
        const a = r.alpha * (0.6 + 0.4 * Math.sin(r.phase));

        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(rayOriginX, rayOriginY);
        ctx.rotate(r.angle);

        const grad = ctx.createLinearGradient(0, 0, r.length, 0);
        grad.addColorStop(0, 'rgba(232, 185, 96, 0.5)');
        grad.addColorStop(0.3, 'rgba(232, 185, 96, 0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -r.width / 2);
        ctx.lineTo(r.length, -r.width * 1.5);
        ctx.lineTo(r.length, r.width * 1.5);
        ctx.lineTo(0, r.width / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ── Bokeh circles ──
      for (const b of bokehs) {
        b.phase += b.pulseSpeed * currentSpeed;
        b.x += b.vx * currentSpeed;
        b.y += b.vy * currentSpeed;
        if (b.y < -b.r * 2) { b.y = H + b.r * 2; b.x = Math.random() * W; }
        if (b.x < -b.r * 2) b.x = W + b.r;
        if (b.x > W + b.r * 2) b.x = -b.r;

        const alpha = b.alpha * (0.5 + 0.5 * Math.sin(b.phase));
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, b.color);
        grad.addColorStop(0.7, b.color + '40');
        grad.addColorStop(1, 'transparent');

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Dust motes ──
      for (const m of motes) {
        m.phase += m.pulseSpeed * currentSpeed;
        m.x += m.vx * currentSpeed;
        m.y += m.vy * currentSpeed;
        if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
        if (m.x < -10) m.x = W + 10;
        if (m.x > W + 10) m.x = -10;

        const alpha = m.alpha * (0.5 + 0.5 * Math.sin(m.phase));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = m.color;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = m.r * 3;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      effectRAF = requestAnimationFrame(draw);
    }
    draw();
    activeEffect = 'light';
  }

  // ═══════════════════════════════════════════════════════════
  //  5. RETRO 90s VAPORWAVE — Big neon sun, grid, palm silhouettes
  // ═══════════════════════════════════════════════════════════

  function startVaporwave() {
    const { canvas, ctx } = setupCanvas('vaporwaveCanvas', 0.65);

    let gridOffset = 0;

    // Palm tree silhouettes
    function drawPalm(x, baseY, height, lean) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#0a0020';

      // Trunk
      ctx.beginPath();
      ctx.moveTo(x - 4, baseY);
      ctx.quadraticCurveTo(x + lean * 0.3, baseY - height * 0.5, x + lean, baseY - height);
      ctx.quadraticCurveTo(x + lean * 0.3 + 6, baseY - height * 0.5, x + 6, baseY);
      ctx.closePath();
      ctx.fill();

      // Fronds
      const topX = x + lean;
      const topY = baseY - height;
      const fronds = [
        { angle: -0.3, len: height * 0.5, curve: -30 },
        { angle: -0.8, len: height * 0.55, curve: -40 },
        { angle: -1.3, len: height * 0.4, curve: -25 },
        { angle: 0.2, len: height * 0.5, curve: 30 },
        { angle: 0.7, len: height * 0.55, curve: 40 },
        { angle: 1.2, len: height * 0.4, curve: 25 },
        { angle: -0.05, len: height * 0.35, curve: -10 },
        { angle: 0.05, len: height * 0.35, curve: 10 }
      ];

      for (const f of fronds) {
        const endX = topX + Math.cos(f.angle - Math.PI / 2) * f.len;
        const endY = topY + Math.sin(f.angle - Math.PI / 2) * f.len * 0.4 + f.len * 0.3;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(topX + f.curve, topY - 10, endX, endY);
        ctx.quadraticCurveTo(topX + f.curve + 3, topY - 5, topX, topY + 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Floating geometric shapes
    const shapes = [];
    const shapeColors = ['#00d4ff', '#ff78cc', '#ffee66', '#00ffa0', '#b967ff'];
    for (let i = 0; i < 20; i++) {
      shapes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.55,
        size: 8 + Math.random() * 25,
        type: Math.floor(Math.random() * 3),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        alpha: 0.15 + Math.random() * 0.25,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        color: shapeColors[Math.floor(Math.random() * shapeColors.length)]
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width;
      const H = canvas.height;
      const horizonY = H * 0.6;

      // ── Sky gradient ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, 'rgba(21, 10, 40, 0.4)');
      skyGrad.addColorStop(0.5, 'rgba(60, 20, 100, 0.3)');
      skyGrad.addColorStop(1, 'rgba(255, 100, 150, 0.15)');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizonY);

      // ── Big Sun ──
      const sunR = Math.min(W, H) * 0.18;
      const sunCY = horizonY - sunR * 0.3;

      // Sun outer glow
      const outerGlow = ctx.createRadialGradient(W / 2, sunCY, sunR * 0.5, W / 2, sunCY, sunR * 2.5);
      outerGlow.addColorStop(0, 'rgba(255, 120, 204, 0.15)');
      outerGlow.addColorStop(0.5, 'rgba(255, 80, 100, 0.05)');
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, W, H);

      // Sun body
      const sunGrad = ctx.createLinearGradient(W / 2, sunCY - sunR, W / 2, sunCY + sunR);
      sunGrad.addColorStop(0, '#ff78cc');
      sunGrad.addColorStop(0.4, '#ffaa55');
      sunGrad.addColorStop(0.7, '#ff6644');
      sunGrad.addColorStop(1, '#ff3333');

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = sunGrad;
      ctx.shadowColor = '#ff78cc';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(W / 2, sunCY, sunR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sun horizontal lines cutout
      ctx.globalCompositeOperation = 'destination-out';
      let cutY = sunCY + sunR * 0.1;
      let gap = 2;
      while (cutY < sunCY + sunR) {
        gap += 1.5;
        const lineH = gap * 0.5;
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(W / 2 - sunR - 5, cutY, sunR * 2 + 10, lineH);
        cutY += gap + lineH;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // ── Perspective Grid ──
      gridOffset += 1.0 * currentSpeed;
      if (gridOffset > 50) gridOffset -= 50;

      // Ground gradient
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      groundGrad.addColorStop(0, 'rgba(50, 10, 80, 0.3)');
      groundGrad.addColorStop(1, 'rgba(10, 0, 30, 0.4)');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      ctx.save();
      ctx.strokeStyle = '#b967ff';

      // Horizontal grid lines
      const lineCount = 25;
      for (let i = 0; i < lineCount; i++) {
        const t = (i + gridOffset / 50) / lineCount;
        const yy = horizonY + (H - horizonY) * (t * t);
        const lineAlpha = 0.1 + t * 0.35;
        ctx.globalAlpha = lineAlpha;
        ctx.lineWidth = 0.5 + t * 1.5;
        ctx.shadowColor = '#b967ff';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(W, yy);
        ctx.stroke();
      }

      // Vertical converging lines
      const vanishX = W / 2;
      const vLines = 20;
      ctx.lineWidth = 1;
      for (let i = -vLines; i <= vLines; i++) {
        const bottomX = vanishX + i * (W / (vLines * 1.1));
        const lineAlpha = 0.15 + Math.abs(i) / vLines * 0.15;
        ctx.globalAlpha = lineAlpha;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(vanishX, horizonY);
        ctx.lineTo(bottomX, H);
        ctx.stroke();
      }
      ctx.restore();

      // ── Palm trees ──
      drawPalm(W * 0.08, horizonY + 10, H * 0.35, -25);
      drawPalm(W * 0.92, horizonY + 10, H * 0.32, 20);
      if (W > 800) {
        drawPalm(W * 0.18, horizonY + 5, H * 0.22, -15);
        drawPalm(W * 0.85, horizonY + 5, H * 0.25, 12);
      }

      // ── Floating shapes ──
      for (const s of shapes) {
        s.rotation += s.rotSpeed * currentSpeed;
        s.x += s.vx * currentSpeed;
        s.y += s.vy * currentSpeed;

        if (s.x < -30) s.x = W + 30;
        if (s.x > W + 30) s.x = -30;
        if (s.y < -30) s.y = horizonY * 0.6;
        if (s.y > horizonY * 0.65) s.y = -30;

        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 10;

        if (s.type === 0) {
          ctx.beginPath();
          ctx.moveTo(0, -s.size);
          ctx.lineTo(-s.size * 0.866, s.size * 0.5);
          ctx.lineTo(s.size * 0.866, s.size * 0.5);
          ctx.closePath();
          ctx.stroke();
        } else if (s.type === 1) {
          ctx.beginPath();
          ctx.moveTo(0, -s.size);
          ctx.lineTo(s.size * 0.6, 0);
          ctx.lineTo(0, s.size);
          ctx.lineTo(-s.size * 0.6, 0);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, s.size * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      effectRAF = requestAnimationFrame(draw);
    }
    draw();
    activeEffect = 'retro-90s-vaporwave';
  }

  // ═══════════════════════════════════════════════════════════
  //  6. VAMPIRE — Crimson particles, dripping blood, moon, bats
  // ═══════════════════════════════════════════════════════════

  function startVampire() {
    const { canvas, ctx } = setupCanvas('vampireCanvas', 0.7);

    // ── Moon ──
    const moonX = canvas.width * 0.8;
    const moonY = canvas.height * 0.15;
    const moonR = Math.min(canvas.width, canvas.height) * 0.06;

    // ── Blood drips from top edge ──
    const drips = [];
    const maxDrips = 20;
    function spawnDrip() {
      drips.push({
        x: Math.random() * canvas.width,
        y: 0,
        speed: 0.8 + Math.random() * 2.0,
        length: 30 + Math.random() * 120,
        width: 1.5 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.5,
        headSize: 2 + Math.random() * 3
      });
    }

    // ── Floating crimson embers/particles ──
    const embers = [];
    for (let i = 0; i < 45; i++) {
      embers.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.6,
        alpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.03,
        color: Math.random() > 0.5 ? '#cc2020' : '#8b1a1a'
      });
    }

    // ── Fog layers ──
    const fogLayers = [];
    for (let i = 0; i < 6; i++) {
      fogLayers.push({
        x: Math.random() * canvas.width - canvas.width * 0.25,
        y: canvas.height * (0.55 + Math.random() * 0.4),
        w: 250 + Math.random() * 500,
        h: 50 + Math.random() * 100,
        speed: 0.2 + Math.random() * 0.5,
        alpha: 0.06 + Math.random() * 0.1,
        direction: Math.random() > 0.5 ? 1 : -1
      });
    }

    // ── Bats ──
    const bats = [];
    function spawnBat() {
      const fromLeft = Math.random() > 0.5;
      bats.push({
        x: fromLeft ? -40 : canvas.width + 40,
        y: 20 + Math.random() * canvas.height * 0.35,
        speed: (1.5 + Math.random() * 3) * (fromLeft ? 1 : -1),
        size: 10 + Math.random() * 18,
        wingPhase: 0,
        wingSpeed: 0.1 + Math.random() * 0.08,
        alpha: 0.3 + Math.random() * 0.4,
        vy: (Math.random() - 0.5) * 0.8
      });
    }

    function drawBat(x, y, size, wingPhase, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#1a0808';
      ctx.translate(x, y);
      const wing = Math.sin(wingPhase) * 0.6;

      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.25, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, -size * 0.12);
      ctx.lineTo(-size * 0.15, -size * 0.3);
      ctx.lineTo(-size * 0.02, -size * 0.15);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(size * 0.1, -size * 0.12);
      ctx.lineTo(size * 0.15, -size * 0.3);
      ctx.lineTo(size * 0.02, -size * 0.15);
      ctx.fill();

      // Left wing
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, 0);
      ctx.quadraticCurveTo(-size * 0.6, -size * (0.5 + wing), -size, -size * 0.15 * wing);
      ctx.quadraticCurveTo(-size * 0.7, size * 0.1, -size * 0.4, size * 0.05);
      ctx.quadraticCurveTo(-size * 0.3, size * 0.08, -size * 0.15, size * 0.02);
      ctx.fill();

      // Right wing
      ctx.beginPath();
      ctx.moveTo(size * 0.15, 0);
      ctx.quadraticCurveTo(size * 0.6, -size * (0.5 + wing), size, -size * 0.15 * wing);
      ctx.quadraticCurveTo(size * 0.7, size * 0.1, size * 0.4, size * 0.05);
      ctx.quadraticCurveTo(size * 0.3, size * 0.08, size * 0.15, size * 0.02);
      ctx.fill();

      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width;
      const H = canvas.height;

      // ── Dark vignette ──
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, 'rgba(10, 0, 0, 0.3)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // ── Moon ──
      ctx.save();
      ctx.globalAlpha = 0.25;
      // Moon glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 4);
      moonGlow.addColorStop(0, 'rgba(200, 180, 160, 0.15)');
      moonGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = moonGlow;
      ctx.fillRect(0, 0, W, H);

      // Moon body
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#d4c8b8';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
      // Crescent shadow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#1a1010';
      ctx.beginPath();
      ctx.arc(moonX + moonR * 0.4, moonY - moonR * 0.1, moonR * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Fog ──
      for (const f of fogLayers) {
        f.x += f.speed * f.direction * currentSpeed;
        if (f.x > W + 100) f.x = -f.w;
        if (f.x < -f.w - 100) f.x = W;

        const grad = ctx.createRadialGradient(
          f.x + f.w / 2, f.y + f.h / 2, 0,
          f.x + f.w / 2, f.y + f.h / 2, f.w / 2
        );
        grad.addColorStop(0, `rgba(80, 20, 20, ${f.alpha})`);
        grad.addColorStop(0.6, `rgba(40, 10, 10, ${f.alpha * 0.5})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(f.x, f.y, f.w, f.h);
      }

      // ── Blood drips ──
      if (drips.length < maxDrips && Math.random() < 0.03 * currentSpeed) spawnDrip();
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        d.y += d.speed * currentSpeed;

        ctx.save();
        ctx.globalAlpha = d.alpha;

        // Drip trail
        const grad = ctx.createLinearGradient(d.x, d.y - d.length, d.x, d.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, 'rgba(160, 20, 20, 0.6)');
        grad.addColorStop(1, '#cc2020');
        ctx.strokeStyle = grad;
        ctx.lineWidth = d.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#ff3030';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - d.length);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();

        // Drip head (bulge)
        ctx.fillStyle = '#cc2020';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.headSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (d.y - d.length > H + 20) drips.splice(i, 1);
      }

      // ── Floating embers ──
      for (const e of embers) {
        e.phase += e.pulseSpeed * currentSpeed;
        e.x += e.vx * currentSpeed;
        e.y += e.vy * currentSpeed;

        if (e.y < -10) { e.y = H + 10; e.x = Math.random() * W; }
        if (e.x < -10) e.x = W + 10;
        if (e.x > W + 10) e.x = -10;

        const alpha = e.alpha * (0.5 + 0.5 * Math.sin(e.phase));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = e.color;
        ctx.shadowColor = '#ff2020';
        ctx.shadowBlur = e.r * 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Bats ──
      if (Math.random() < 0.004 * currentSpeed && bats.length < 4) spawnBat();
      for (let i = bats.length - 1; i >= 0; i--) {
        const b = bats[i];
        b.x += b.speed * currentSpeed;
        b.y += b.vy * currentSpeed;
        b.wingPhase += b.wingSpeed * currentSpeed;
        drawBat(b.x, b.y, b.size, b.wingPhase, b.alpha);
        if (b.x > W + 80 || b.x < -80) bats.splice(i, 1);
      }

      effectRAF = requestAnimationFrame(draw);
    }
    draw();
    activeEffect = 'vampire';
  }

  // ═══════════════════════════════════════════════════════════
  //  THEME EFFECT DISPATCHER
  // ═══════════════════════════════════════════════════════════

  const EFFECTS = {
    'matrix-green': startMatrix,
    'cyberpunk-purple': startCyberpunk,
    'dark': startStarfield,
    'light': startBokeh,
    'retro-90s-vaporwave': startVaporwave,
    'vampire': startVampire
  };

  function switchEffect(theme) {
    destroyEffect();
    removeSpeedSlider();

    currentSpeed = getSavedSpeed(theme);

    const fn = EFFECTS[theme];
    if (fn) {
      fn();
      buildSpeedSlider(theme);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════

  window.themeEffects = {
    switch: switchEffect,
    destroy: () => { destroyEffect(); removeSpeedSlider(); },
    getSpeed: () => currentSpeed,
    setSpeed: (v) => { currentSpeed = v; }
  };

  // Auto-start on load
  document.addEventListener('DOMContentLoaded', () => {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    switchEffect(theme);
  });

})();
