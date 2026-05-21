/**
 * Today Todo - Frontend Application
 * Daily screensaver with sky gradient, timeline, clock, and todo management.
 */

(function () {
  'use strict';

  // ===== State =====
  let currentDateStr = '';
  let todosData = { date: '', items: [], raw: '' };

  // ===== DOM Elements =====
  const skyBg = document.getElementById('sky-bg');
  const dateText = document.getElementById('date-text');
  const timeText = document.getElementById('time-text');
  const todoList = document.getElementById('todo-list');
  const todoEmpty = document.getElementById('todo-empty');
  const editBtn = document.getElementById('edit-btn');
  const editModal = document.getElementById('edit-modal');
  const editTextarea = document.getElementById('edit-textarea');
  const modalClose = document.getElementById('modal-close');
  const modalCancel = document.getElementById('modal-cancel');
  const modalSave = document.getElementById('modal-save');
  const fullscreenHint = document.getElementById('fullscreen-hint');
  const timelineElapsed = document.getElementById('timeline-elapsed');
  const timelineNowDot = document.getElementById('timeline-now-dot');
  const timelineLabels = document.getElementById('timeline-labels');
  const timelineTicks = document.getElementById('timeline-ticks');
  const clockCanvas = document.getElementById('clock-canvas');
  const clockCtx = clockCanvas.getContext('2d');
  const particlesContainer = document.getElementById('particles');

  // ===== Utility Functions =====

  /**
   * Get today's date string in YYYY-MM-DD format.
   * @returns {string}
   */
  function getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Format date for display.
   * @param {Date} date
   * @returns {string} e.g. "2025年1月15日 星期三"
   */
  function formatDateDisplay(date) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = weekdays[date.getDay()];
    return `${y}年${m}月${d}日 ${w}`;
  }

  /**
   * Format time for display.
   * @param {Date} date
   * @returns {string} e.g. "14:30:05"
   */
  function formatTimeDisplay(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /**
   * Linear interpolation between two values.
   * @param {number} a - Start value
   * @param {number} b - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number}
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Interpolate between two [r, g, b] colors.
   * @param {number[]} c1 - [r, g, b]
   * @param {number[]} c2 - [r, g, b]
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number[]}
   */
  function lerpColor(c1, c2, t) {
    return [
      Math.round(lerp(c1[0], c2[0], t)),
      Math.round(lerp(c1[1], c2[1], t)),
      Math.round(lerp(c1[2], c2[2], t))
    ];
  }

  /**
   * Convert [r, g, b] to CSS rgb string.
   * @param {number[]} c - [r, g, b]
   * @returns {string}
   */
  function rgbStr(c) {
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }

  // ===== Sky Gradient Background =====

  /**
   * Sky color keyframes: [hour, topColor, bottomColor]
   * Colors are [r, g, b] arrays.
   */
  const skyKeyframes = [
    { hour: 0,    top: [8, 10, 28],     bottom: [12, 15, 40] },
    { hour: 4,    top: [8, 10, 28],     bottom: [12, 15, 40] },
    { hour: 5,    top: [20, 20, 50],    bottom: [40, 30, 60] },
    { hour: 6,    top: [60, 50, 80],    bottom: [200, 120, 100] },
    { hour: 7,    top: [100, 150, 210], bottom: [230, 170, 130] },
    { hour: 8,    top: [120, 180, 235], bottom: [180, 210, 240] },
    { hour: 12,   top: [100, 170, 230], bottom: [160, 200, 240] },
    { hour: 15,   top: [110, 170, 220], bottom: [200, 190, 180] },
    { hour: 17,   top: [140, 130, 170], bottom: [220, 140, 90] },
    { hour: 18,   top: [80, 60, 120],   bottom: [200, 100, 60] },
    { hour: 19.5, top: [30, 25, 70],    bottom: [60, 40, 80] },
    { hour: 20.5, top: [15, 15, 45],    bottom: [20, 20, 55] },
    { hour: 24,   top: [8, 10, 28],     bottom: [12, 15, 40] }
  ];

  /**
   * Get the interpolated sky colors for the current time.
   * @param {number} hours - Current time as decimal hours (0-24)
   * @returns {{ topColor: number[], bottomColor: number[], isDaytime: boolean }}
   */
  function getSkyColors(hours) {
    let prev = skyKeyframes[0];
    let next = skyKeyframes[1];

    for (let i = 0; i < skyKeyframes.length - 1; i++) {
      if (hours >= skyKeyframes[i].hour && hours < skyKeyframes[i + 1].hour) {
        prev = skyKeyframes[i];
        next = skyKeyframes[i + 1];
        break;
      }
    }

    const range = next.hour - prev.hour;
    const t = range > 0 ? (hours - prev.hour) / range : 0;
    const topColor = lerpColor(prev.top, next.top, t);
    const bottomColor = lerpColor(prev.bottom, next.bottom, t);

    // Determine if it's daytime based on brightness
    const avgBrightness = (topColor[0] + topColor[1] + topColor[2]) / 3;
    const isDaytime = avgBrightness > 80;

    return { topColor, bottomColor, isDaytime };
  }

  /**
   * Update the sky gradient background.
   */
  function updateSkyBackground() {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const { topColor, bottomColor, isDaytime } = getSkyColors(hours);

    skyBg.style.background = `linear-gradient(to bottom, ${rgbStr(topColor)}, ${rgbStr(bottomColor)})`;

    if (isDaytime) {
      document.body.classList.add('day-mode');
    } else {
      document.body.classList.remove('day-mode');
    }
  }

  // ===== Floating Particles =====

  /**
   * Create floating particles for ambient effect.
   */
  function createParticles() {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = Math.random() * 4 + 2;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = (Math.random() * 100 + 100) + '%';
      particle.style.animationDuration = (Math.random() * 20 + 15) + 's';
      particle.style.animationDelay = (Math.random() * 20) + 's';
      particlesContainer.appendChild(particle);
    }
  }

  // ===== Date & Time Display =====

  /**
   * Update the date and time text.
   */
  function updateDateTime() {
    const now = new Date();
    dateText.textContent = formatDateDisplay(now);
    timeText.textContent = formatTimeDisplay(now);
  }

  // ===== 24-Hour Timeline =====

  /**
   * Build the timeline labels (every 3 hours) and tick marks (every hour).
   */
  function buildTimelineLabels() {
    timelineLabels.innerHTML = '';
    timelineTicks.innerHTML = '';

    for (let h = 0; h <= 24; h++) {
      const pct = (h / 24) * 100;

      // Tick mark (every hour)
      const tick = document.createElement('div');
      tick.className = 'timeline-tick' + (h % 3 === 0 ? ' major' : '');
      tick.style.top = pct + '%';
      timelineTicks.appendChild(tick);

      // Label (every 3 hours)
      if (h % 3 === 0) {
        const label = document.createElement('div');
        label.className = 'timeline-label';
        label.dataset.hour = h;
        label.textContent = String(h).padStart(2, '0');
        label.style.top = pct + '%';
        timelineLabels.appendChild(label);
      }
    }
  }

  /**
   * Update the timeline to reflect current time.
   */
  function updateTimeline() {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const pct = (hours / 24) * 100;

    timelineElapsed.style.height = pct + '%';
    timelineNowDot.style.top = pct + '%';

    // Highlight current hour label
    const currentHour = now.getHours();
    const labels = timelineLabels.querySelectorAll('.timeline-label');
    labels.forEach(function (label) {
      const h = parseInt(label.dataset.hour, 10);
      if (h === Math.floor(currentHour / 3) * 3) {
        label.classList.add('current-hour');
      } else {
        label.classList.remove('current-hour');
      }
    });
  }

  // ===== Analog Clock =====

  /**
   * Draw the analog clock on canvas.
   */
  function drawClock() {
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();

    const dpr = window.devicePixelRatio || 1;
    const displaySize = 160;
    clockCanvas.width = displaySize * dpr;
    clockCanvas.height = displaySize * dpr;
    clockCanvas.style.width = displaySize + 'px';
    clockCanvas.style.height = displaySize + 'px';
    clockCtx.scale(dpr, dpr);

    const cx = displaySize / 2;
    const cy = displaySize / 2;
    const radius = Math.max(1, displaySize / 2 - 10);

    // Determine colors based on day/night mode
    const isDay = document.body.classList.contains('day-mode');
    const faceColor = isDay ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.05)';
    const borderColor = isDay ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
    const tickColor = isDay ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
    const majorTickColor = isDay ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';
    const numberColor = isDay ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
    const hourHandColor = isDay ? 'rgba(30,30,50,0.8)' : 'rgba(255,255,255,0.85)';
    const minuteHandColor = isDay ? 'rgba(30,30,50,0.65)' : 'rgba(255,255,255,0.65)';
    const secondHandColor = isDay ? 'rgba(42,100,150,0.8)' : 'rgba(126,184,218,0.9)';
    const centerDotColor = isDay ? 'rgba(42,100,150,1)' : 'rgba(126,184,218,1)';

    // Clear
    clockCtx.clearRect(0, 0, displaySize, displaySize);

    // Face
    clockCtx.beginPath();
    clockCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    clockCtx.fillStyle = faceColor;
    clockCtx.fill();
    clockCtx.strokeStyle = borderColor;
    clockCtx.lineWidth = 1.5;
    clockCtx.stroke();

    // Tick marks
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % 5 === 0;
      const innerR = isMajor ? radius - 12 : radius - 6;
      const outerR = radius - 2;

      clockCtx.beginPath();
      clockCtx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      clockCtx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      clockCtx.strokeStyle = isMajor ? majorTickColor : tickColor;
      clockCtx.lineWidth = isMajor ? 1.8 : 0.8;
      clockCtx.stroke();
    }

    // Numbers
    clockCtx.font = '300 12px "Noto Sans SC", "PingFang SC", sans-serif';
    clockCtx.fillStyle = numberColor;
    clockCtx.textAlign = 'center';
    clockCtx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const numR = radius - 24;
      const x = cx + Math.cos(angle) * numR;
      const y = cy + Math.sin(angle) * numR;
      clockCtx.fillText(String(i), x, y);
    }

    // Hour hand
    const hourAngle = ((h + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    drawHand(clockCtx, cx, cy, hourAngle, radius * 0.48, 3.5, hourHandColor);

    // Minute hand
    const minuteAngle = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
    drawHand(clockCtx, cx, cy, minuteAngle, radius * 0.68, 2.2, minuteHandColor);

    // Second hand — tick second-by-second (no millisecond interpolation)
    const secondAngle = (s / 60) * Math.PI * 2 - Math.PI / 2;
    drawHand(clockCtx, cx, cy, secondAngle, radius * 0.78, 1, secondHandColor);

    // Center dot
    clockCtx.beginPath();
    clockCtx.arc(cx, cy, 3, 0, Math.PI * 2);
    clockCtx.fillStyle = centerDotColor;
    clockCtx.fill();
  }

  /**
   * Draw a clock hand.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - Center x
   * @param {number} cy - Center y
   * @param {number} angle - Angle in radians
   * @param {number} length - Hand length
   * @param {number} width - Hand width
   * @param {string} color - Hand color
   */
  function drawHand(ctx, cx, cy, angle, length, width, color) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ===== Todo List =====

  /**
   * Fetch today's todos from the API.
   * @returns {Promise<void>}
   */
  async function fetchTodos() {
    try {
      const resp = await fetch('/api/todos?date=' + currentDateStr);
      if (!resp.ok) throw new Error('Failed to fetch todos');
      todosData = await resp.json();
      renderTodos();
    } catch (err) {
      console.error('Error fetching todos:', err);
    }
  }

  /**
   * Render the todo list in the DOM.
   */
  function renderTodos() {
    todoList.innerHTML = '';

    if (!todosData.items || todosData.items.length === 0) {
      todoEmpty.style.display = 'block';
      return;
    }

    todoEmpty.style.display = 'none';

    todosData.items.forEach(function (item, index) {
      const li = document.createElement('li');
      if (item.checked) {
        li.classList.add('completed');
      }

      // Checkbox
      const checkbox = document.createElement('span');
      checkbox.className = 'todo-checkbox' + (item.checked ? ' checked' : '');
      checkbox.textContent = item.checked ? '✓' : '';

      // Parse time prefix from text
      const text = item.text;
      const timeMatch = text.match(/^(\d{1,2}:\d{2})\s+(.+)/);

      // Time label
      const timeSpan = document.createElement('span');
      timeSpan.className = 'todo-time';
      timeSpan.textContent = timeMatch ? timeMatch[1] : '';

      // Text content
      const textSpan = document.createElement('span');
      textSpan.className = 'todo-text';
      textSpan.textContent = timeMatch ? timeMatch[2] : text;

      li.appendChild(checkbox);
      li.appendChild(timeSpan);
      li.appendChild(textSpan);

      // Click to toggle
      li.addEventListener('click', function () {
        toggleTodo(index);
      });

      todoList.appendChild(li);
    });
  }

  /**
   * Toggle a todo item's completion status.
   * @param {number} index - Item index
   */
  async function toggleTodo(index) {
    try {
      const resp = await fetch('/api/todos/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: currentDateStr, index: index })
      });
      if (!resp.ok) throw new Error('Failed to toggle todo');
      todosData = await resp.json();
      renderTodos();
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  }

  // ===== Edit Modal =====

  /**
   * Open the edit modal.
   */
  function openEditModal() {
    editTextarea.value = todosData.raw || '';
    editModal.style.display = 'flex';
    // Focus textarea after animation
    setTimeout(function () {
      editTextarea.focus();
    }, 100);
  }

  /**
   * Close the edit modal.
   */
  function closeEditModal() {
    editModal.style.display = 'none';
  }

  /**
   * Save the edited markdown content.
   */
  async function saveTodos() {
    const raw = editTextarea.value;
    try {
      const resp = await fetch('/api/todos/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: currentDateStr, raw: raw })
      });
      if (!resp.ok) throw new Error('Failed to save todos');
      todosData = await resp.json();
      renderTodos();
      closeEditModal();
    } catch (err) {
      console.error('Error saving todos:', err);
    }
  }

  // ===== Fullscreen Handling =====

  /**
   * Show fullscreen hint when in fullscreen mode.
   */
  function handleFullscreenChange() {
    if (document.fullscreenElement) {
      fullscreenHint.style.display = 'block';
      setTimeout(function () {
        fullscreenHint.style.display = 'none';
      }, 3000);
    } else {
      fullscreenHint.style.display = 'none';
    }
  }

  // ===== Animation Loop =====

  let lastSkyUpdate = 0;
  let lastTimelineUpdate = 0;
  const SKY_UPDATE_INTERVAL = 2000;    // Update sky every 2s
  const TIMELINE_UPDATE_INTERVAL = 1000; // Update timeline every 1s

  /**
   * Main animation loop using requestAnimationFrame.
   * @param {number} timestamp - Animation timestamp
   */
  function animate(timestamp) {
    // Update date/time every frame (for seconds)
    updateDateTime();

    // Draw clock every frame (smooth second hand)
    drawClock();

    // Update sky background at interval
    if (timestamp - lastSkyUpdate > SKY_UPDATE_INTERVAL) {
      updateSkyBackground();
      lastSkyUpdate = timestamp;
    }

    // Update timeline at interval
    if (timestamp - lastTimelineUpdate > TIMELINE_UPDATE_INTERVAL) {
      updateTimeline();
      lastTimelineUpdate = timestamp;
    }

    requestAnimationFrame(animate);
  }

  // ===== Event Listeners =====

  function setupEventListeners() {
    // Edit button
    editBtn.addEventListener('click', openEditModal);

    // Modal close
    modalClose.addEventListener('click', closeEditModal);
    modalCancel.addEventListener('click', closeEditModal);
    modalSave.addEventListener('click', saveTodos);

    // Click outside modal to close
    editModal.addEventListener('click', function (e) {
      if (e.target === editModal) {
        closeEditModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      // ESC to close modal or show fullscreen hint
      if (e.key === 'Escape') {
        if (editModal.style.display === 'flex') {
          closeEditModal();
        } else if (document.fullscreenElement) {
          fullscreenHint.style.display = 'block';
          setTimeout(function () {
            fullscreenHint.style.display = 'none';
          }, 3000);
        }
      }
      // Ctrl+Enter to save in modal
      if (e.key === 'Enter' && e.ctrlKey && editModal.style.display === 'flex') {
        saveTodos();
      }
    });

    // Fullscreen change
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // F11 - prevent default and use Fullscreen API instead
    document.addEventListener('keydown', function (e) {
      if (e.key === 'F11') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(function () {
            // Fallback: browser will handle F11 natively
          });
        } else {
          document.exitFullscreen();
        }
      }
    });
  }

  // ===== Initialization =====

  function init() {
    currentDateStr = getTodayStr();

    // Build timeline labels
    buildTimelineLabels();

    // Create floating particles
    createParticles();

    // Initial renders
    updateDateTime();
    updateSkyBackground();
    updateTimeline();
    drawClock();

    // Fetch todos
    fetchTodos();

    // Setup event listeners
    setupEventListeners();

    // Start animation loop
    requestAnimationFrame(animate);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
