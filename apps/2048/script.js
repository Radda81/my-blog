(function () {
  'use strict';

  const SIZE = 4;
  const BEST_SCORE_KEY = 'game2048-best-score';

  let grid = [];
  let score = 0;
  let best = 0;
  let gameOver = false;
  let won = false;
  let keepPlayingAfterWin = false;

  const boardEl = document.getElementById('board');
  const gridCellsEl = document.getElementById('grid-cells');
  const tileLayerEl = document.getElementById('tile-layer');
  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('best-score');
  const overlayEl = document.getElementById('overlay');
  const overlayMessageEl = document.getElementById('overlay-message');
  const keepPlayingBtn = document.getElementById('keep-playing-btn');
  const restartBtn = document.getElementById('restart-btn');
  const newGameBtn = document.getElementById('new-game-btn');

  function createEmptyGrid() {
    const g = [];
    for (let r = 0; r < SIZE; r++) {
      g.push(new Array(SIZE).fill(0));
    }
    return g;
  }

  function spawnRandomTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slideAndMergeLine(line) {
    const values = line.filter((v) => v !== 0);
    let mergedScore = 0;
    const result = [];
    let i = 0;
    while (i < values.length) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const mergedValue = values[i] * 2;
        result.push(mergedValue);
        mergedScore += mergedValue;
        i += 2; // 병합된 타일은 같은 턴에 다시 병합되지 않음 (체인 병합 방지)
      } else {
        result.push(values[i]);
        i += 1;
      }
    }
    while (result.length < SIZE) result.push(0);
    return { line: result, scoreGained: mergedScore };
  }

  function cloneGrid(g) {
    return g.map((row) => row.slice());
  }

  function transpose(g) {
    const t = createEmptyGrid();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        t[c][r] = g[r][c];
      }
    }
    return t;
  }

  function reverseRows(g) {
    return g.map((row) => row.slice().reverse());
  }

  function slideGridLeft(g) {
    let totalScore = 0;
    const newGrid = g.map((row) => {
      const { line, scoreGained } = slideAndMergeLine(row);
      totalScore += scoreGained;
      return line;
    });
    return { grid: newGrid, scoreGained: totalScore };
  }

  function moveGrid(direction) {
    let working = cloneGrid(grid);
    let scoreGained = 0;

    if (direction === 'left') {
      const res = slideGridLeft(working);
      working = res.grid;
      scoreGained = res.scoreGained;
    } else if (direction === 'right') {
      working = reverseRows(working);
      const res = slideGridLeft(working);
      working = reverseRows(res.grid);
      scoreGained = res.scoreGained;
    } else if (direction === 'up') {
      working = transpose(working);
      const res = slideGridLeft(working);
      working = transpose(res.grid);
      scoreGained = res.scoreGained;
    } else if (direction === 'down') {
      working = transpose(working);
      working = reverseRows(working);
      const res = slideGridLeft(working);
      working = reverseRows(res.grid);
      working = transpose(working);
      scoreGained = res.scoreGained;
    }

    return { grid: working, scoreGained };
  }

  function move(direction) {
    if (gameOver) return;
    if (won && !keepPlayingAfterWin) return;

    const before = JSON.stringify(grid);
    const { grid: newGrid, scoreGained } = moveGrid(direction);
    const after = JSON.stringify(newGrid);

    if (before === after) {
      return; // 이동 불가: 타일 생성/점수 변화 없음
    }

    grid = newGrid;
    score += scoreGained;
    if (score > best) {
      best = score;
      saveBestScore();
    }

    spawnRandomTile();
    render();

    checkWinCondition();
    checkLoseCondition();
  }

  function checkWinCondition() {
    if (won || keepPlayingAfterWin) return;
    if (grid.some((row) => row.includes(2048))) {
      won = true;
      showOverlay('win');
    }
  }

  function checkLoseCondition() {
    if (won && !keepPlayingAfterWin) return;
    if (grid.some((row) => row.includes(0))) return;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (c + 1 < SIZE && grid[r][c + 1] === v) return;
        if (r + 1 < SIZE && grid[r + 1][c] === v) return;
      }
    }
    gameOver = true;
    showOverlay('lose');
  }

  function showOverlay(type) {
    if (type === 'win') {
      overlayMessageEl.textContent = '승리했습니다!';
      keepPlayingBtn.hidden = false;
    } else {
      overlayMessageEl.textContent = '게임 오버';
      keepPlayingBtn.hidden = true;
    }
    overlayEl.hidden = false;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
  }

  function loadBestScore() {
    try {
      const stored = localStorage.getItem(BEST_SCORE_KEY);
      const parsed = stored !== null ? parseInt(stored, 10) : 0;
      best = Number.isFinite(parsed) ? parsed : 0;
    } catch (e) {
      // localStorage 사용 불가 환경(예: 일부 file:// 보안 정책)에서도 게임은 계속 동작
      best = 0;
    }
  }

  function saveBestScore() {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(best));
    } catch (e) {
      // localStorage 사용 불가 환경(예: 일부 file:// 보안 정책)에서도 게임은 계속 동작
    }
  }

  function buildGridCellsBackground() {
    gridCellsEl.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      gridCellsEl.appendChild(cell);
    }
  }

  function render() {
    tileLayerEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const value = grid[r][c];
        if (value === 0) continue;
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.value = String(value);
        tile.style.gridRowStart = String(r + 1);
        tile.style.gridColumnStart = String(c + 1);
        tile.textContent = String(value);
        tileLayerEl.appendChild(tile);
      }
    }
    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(best);
  }

  function initGame() {
    grid = createEmptyGrid();
    score = 0;
    gameOver = false;
    won = false;
    keepPlayingAfterWin = false;
    hideOverlay();
    spawnRandomTile();
    spawnRandomTile();
    render();
  }

  // ---- 키보드 입력 ----
  const KEY_DIRECTION_MAP = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  };

  document.addEventListener('keydown', (e) => {
    const direction = KEY_DIRECTION_MAP[e.key];
    if (!direction) return;
    e.preventDefault();
    move(direction);
  });

  // ---- 터치 입력 ----
  const SWIPE_THRESHOLD = 30;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;

  boardEl.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return;
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  boardEl.addEventListener(
    'touchend',
    (e) => {
      if (!touchActive) return;
      touchActive = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

      let direction;
      if (absDx > absDy) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }
      move(direction);
    },
    { passive: true }
  );

  // ---- 버튼 ----
  newGameBtn.addEventListener('click', () => {
    initGame();
  });

  restartBtn.addEventListener('click', () => {
    initGame();
  });

  keepPlayingBtn.addEventListener('click', () => {
    keepPlayingAfterWin = true;
    hideOverlay();
  });

  // ---- 시작 ----
  buildGridCellsBackground();
  loadBestScore();
  initGame();
})();
