(() => {
  'use strict';

  const SIZE = 16;
  const idx = (r, c) => r * SIZE + c;

  const PRESET_COLORS = [
    '#000000', '#ffffff', '#7f7f7f', '#c3c3c3',
    '#ff0000', '#ff8000', '#ffe600', '#7ac74f',
    '#00a86b', '#00b7c3', '#0066ff', '#5b2a86',
    '#ff5fb6', '#8b5a2b', '#c69c6d', '#3b2f2f'
  ];

  // 데이터 모델: null = 미채색(투명)
  let pixels = new Array(SIZE * SIZE).fill(null);

  const canvas = document.getElementById('pixel-canvas');
  const ctx = canvas.getContext('2d');
  const palette = document.getElementById('palette');
  const eraserBtn = document.getElementById('eraser-btn');
  const customColorInput = document.getElementById('custom-color-input');
  const customColorLabel = document.getElementById('custom-color-label');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const exportBtn = document.getElementById('export-btn');

  let currentColor = PRESET_COLORS[0];

  // ---- 팔레트 렌더링 ----
  function renderPalette() {
    const swatchButtons = [];

    PRESET_COLORS.forEach((color) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.style.background = color;
      btn.dataset.color = color;
      btn.title = color;
      btn.setAttribute('aria-label', `색상 ${color}`);
      btn.addEventListener('click', () => {
        currentColor = color;
        setActiveSwatch(btn);
      });
      palette.insertBefore(btn, eraserBtn);
      swatchButtons.push(btn);
    });

    // 첫 번째 프리셋을 기본 활성 색상으로 표시
    setActiveSwatch(swatchButtons[0]);
  }

  function setActiveSwatch(activeEl) {
    palette.querySelectorAll('.swatch').forEach((el) => el.classList.remove('active'));
    customColorLabel.classList.remove('active');
    if (activeEl) activeEl.classList.add('active');
  }

  eraserBtn.addEventListener('click', () => {
    currentColor = null;
    setActiveSwatch(eraserBtn);
  });

  customColorInput.addEventListener('input', (e) => {
    currentColor = e.target.value;
    setActiveSwatch(customColorLabel);
  });

  // ---- 그리기 로직 ----
  function paintCell(r, c) {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    pixels[idx(r, c)] = currentColor;
    ctx.clearRect(c, r, 1, 1);
    if (currentColor) {
      ctx.fillStyle = currentColor;
      ctx.fillRect(c, r, 1, 1);
    }
  }

  // Bresenham 직선 알고리즘으로 두 칸 사이를 모두 채운다 (빠른 드래그 시 칸 누락 방지)
  function paintLine(r0, c0, r1, c1) {
    let x0 = c0, y0 = r0, x1 = c1, y1 = r1;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
      paintCell(y0, x0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const cellWidth = rect.width / SIZE;
    const cellHeight = rect.height / SIZE;
    const c = clamp(Math.floor((e.clientX - rect.left) / cellWidth), 0, SIZE - 1);
    const r = clamp(Math.floor((e.clientY - rect.top) / cellHeight), 0, SIZE - 1);
    return { r, c };
  }

  let isDrawing = false;
  let lastCell = null;

  canvas.addEventListener('pointerdown', (e) => {
    isDrawing = true;
    canvas.setPointerCapture(e.pointerId);
    const cell = cellFromEvent(e);
    paintCell(cell.r, cell.c);
    lastCell = cell;
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    const cell = cellFromEvent(e);
    if (lastCell) {
      paintLine(lastCell.r, lastCell.c, cell.r, cell.c);
    } else {
      paintCell(cell.r, cell.c);
    }
    lastCell = cell;
    e.preventDefault();
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
    canvas.addEventListener(type, () => {
      isDrawing = false;
      lastCell = null;
    });
  });

  // ---- 전체 지우기 ----
  clearAllBtn.addEventListener('click', () => {
    const confirmed = window.confirm('전체 그림을 지울까요? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmed) return;
    pixels = new Array(SIZE * SIZE).fill(null);
    ctx.clearRect(0, 0, SIZE, SIZE);
  });

  // ---- PNG 내보내기 ----
  exportBtn.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pixel-art.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  });

  // ---- 초기화 ----
  renderPalette();
})();
