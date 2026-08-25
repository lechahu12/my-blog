(function () {
  "use strict";

  const SIZE = 4;
  const BEST_SCORE_KEY = "2048-best-score";
  const SWIPE_THRESHOLD = 30;

  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const restartBtn = document.getElementById("restart-btn");
  const overlayEl = document.getElementById("overlay");
  const overlayMessageEl = document.getElementById("overlay-message");
  const overlayContinueBtn = document.getElementById("overlay-continue-btn");
  const overlayRestartBtn = document.getElementById("overlay-restart-btn");

  let board = [];
  let score = 0;
  let bestScore = 0;
  let hasWon = false;
  let keepPlayingAfterWin = false;
  let gameOver = false;

  function createEmptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function getEmptyCells(b) {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  }

  function addRandomTile(b) {
    const empty = getEmptyCells(b);
    if (empty.length === 0) return null;
    const pos = empty[Math.floor(Math.random() * empty.length)];
    b[pos.r][pos.c] = Math.random() < 0.9 ? 2 : 4;
    return pos;
  }

  function loadBestScore() {
    try {
      const stored = localStorage.getItem(BEST_SCORE_KEY);
      const parsed = parseInt(stored, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(value));
    } catch (e) {
      /* localStorage unavailable, ignore */
    }
  }

  function updateScoreDisplay() {
    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(bestScore);
  }

  function addScore(amount) {
    score += amount;
    if (score > bestScore) {
      bestScore = score;
      saveBestScore(bestScore);
    }
    updateScoreDisplay();
  }

  // Compresses a line (array of SIZE numbers) toward the front, merging
  // equal neighbors once each. Returns { line, mergedFlags, gained, changed }.
  function slideLine(line) {
    const nonZero = line.filter((v) => v !== 0);
    const result = [];
    const mergedFlags = [];
    let gained = 0;
    let i = 0;
    while (i < nonZero.length) {
      const current = nonZero[i];
      const next = nonZero[i + 1];
      if (next !== undefined && next === current) {
        const merged = current * 2;
        result.push(merged);
        mergedFlags.push(true);
        gained += merged;
        i += 2;
      } else {
        result.push(current);
        mergedFlags.push(false);
        i += 1;
      }
    }
    while (result.length < SIZE) {
      result.push(0);
      mergedFlags.push(false);
    }
    const changed = result.some((v, idx) => v !== line[idx]);
    return { line: result, mergedFlags, gained, changed };
  }

  function getColumn(b, c) {
    const col = [];
    for (let r = 0; r < SIZE; r++) col.push(b[r][c]);
    return col;
  }

  function setColumn(b, c, col) {
    for (let r = 0; r < SIZE; r++) b[r][c] = col[r];
  }

  function move(direction) {
    if (gameOver) return;

    let changed = false;
    let gainedTotal = 0;
    const mergedCells = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

    if (direction === "left" || direction === "right") {
      for (let r = 0; r < SIZE; r++) {
        let row = board[r].slice();
        if (direction === "right") row = row.reverse();
        const { line, mergedFlags, gained, changed: rowChanged } = slideLine(row);
        let finalLine = line;
        let finalFlags = mergedFlags;
        if (direction === "right") {
          finalLine = line.slice().reverse();
          finalFlags = mergedFlags.slice().reverse();
        }
        if (rowChanged) changed = true;
        gainedTotal += gained;
        board[r] = finalLine;
        for (let c = 0; c < SIZE; c++) mergedCells[r][c] = finalFlags[c];
      }
    } else {
      for (let c = 0; c < SIZE; c++) {
        let col = getColumn(board, c);
        if (direction === "down") col = col.reverse();
        const { line, mergedFlags, gained, changed: colChanged } = slideLine(col);
        let finalLine = line;
        let finalFlags = mergedFlags;
        if (direction === "down") {
          finalLine = line.slice().reverse();
          finalFlags = mergedFlags.slice().reverse();
        }
        if (colChanged) changed = true;
        gainedTotal += gained;
        setColumn(board, c, finalLine);
        for (let r = 0; r < SIZE; r++) mergedCells[r][c] = finalFlags[r];
      }
    }

    if (!changed) return;

    if (gainedTotal > 0) addScore(gainedTotal);
    const newTilePos = addRandomTile(board);
    render(mergedCells, newTilePos ? [newTilePos] : []);

    if (!hasWon && boardHasValue(board, 2048)) {
      hasWon = true;
      if (!keepPlayingAfterWin) {
        showOverlay("You Win!", true);
        return;
      }
    }

    if (!canMove(board)) {
      gameOver = true;
      showOverlay("Game Over", false);
    }
  }

  function boardHasValue(b, value) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === value) return true;
      }
    }
    return false;
  }

  function canMove(b) {
    if (getEmptyCells(b).length > 0) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = b[r][c];
        if (c + 1 < SIZE && b[r][c + 1] === v) return true;
        if (r + 1 < SIZE && b[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function showOverlay(message, isWin) {
    overlayMessageEl.textContent = message;
    overlayContinueBtn.classList.toggle("hidden", !isWin);
    overlayEl.classList.remove("hidden");
  }

  function hideOverlay() {
    overlayEl.classList.add("hidden");
  }

  function render(mergedCells, newTiles) {
    mergedCells = mergedCells || [];
    newTiles = newTiles || [];
    boardEl.innerHTML = "";

    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      boardEl.appendChild(cell);
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const value = board[r][c];
        if (value === 0) continue;
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.textContent = String(value);
        tile.style.gridColumn = String(c + 1);
        tile.style.gridRow = String(r + 1);
        if (value <= 2048) {
          tile.setAttribute("data-value", String(value));
        } else {
          tile.setAttribute("data-super", "true");
        }
        if (mergedCells[r] && mergedCells[r][c]) {
          tile.classList.add("merged");
        }
        if (newTiles.some((p) => p && p.r === r && p.c === c)) {
          tile.classList.add("tile-new");
        }
        boardEl.appendChild(tile);
      }
    }
  }

  function startGame() {
    board = createEmptyBoard();
    score = 0;
    hasWon = false;
    keepPlayingAfterWin = false;
    gameOver = false;
    const t1 = addRandomTile(board);
    const t2 = addRandomTile(board);
    updateScoreDisplay();
    hideOverlay();
    render([], [t1, t2].filter(Boolean));
  }

  const KEY_DIRECTIONS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  document.addEventListener("keydown", (e) => {
    const direction = KEY_DIRECTIONS[e.key];
    if (!direction) return;
    e.preventDefault();
    move(direction);
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;

  boardEl.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  boardEl.addEventListener(
    "touchend",
    (e) => {
      if (!touchActive) return;
      touchActive = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

      if (absDx > absDy) {
        move(dx > 0 ? "right" : "left");
      } else {
        move(dy > 0 ? "down" : "up");
      }
    },
    { passive: true }
  );

  restartBtn.addEventListener("click", startGame);
  overlayRestartBtn.addEventListener("click", startGame);
  overlayContinueBtn.addEventListener("click", () => {
    keepPlayingAfterWin = true;
    hideOverlay();
  });

  bestScore = loadBestScore();
  startGame();
})();
