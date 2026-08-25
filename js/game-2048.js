document.addEventListener("DOMContentLoaded", () => {
  const SIZE = 4;
  const STORAGE_BEST = "2048-best-score";

  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best-score");
  const messageEl = document.getElementById("game-message");
  const messageTextEl = document.getElementById("game-message-text");
  const keepGoingBtn = document.getElementById("keep-going-btn");
  const tryAgainBtn = document.getElementById("try-again-btn");
  const newGameBtn = document.getElementById("new-game-btn");
  const statusEl = document.getElementById("game-status");

  let grid = [];
  let score = 0;
  let best = Number(localStorage.getItem(STORAGE_BEST)) || 0;
  let won = false;
  let over = false;
  let keepPlaying = false;
  let lastNewPositions = [];
  let lastMergedPositions = [];

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function cloneGrid(g) {
    return g.map((row) => row.slice());
  }

  function gridsEqual(a, b) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  function getEmptyCells(g) {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (g[r][c] === 0) cells.push([r, c]);
      }
    }
    return cells;
  }

  function spawnTile(g) {
    const empties = getEmptyCells(g);
    if (empties.length === 0) return null;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    g[r][c] = Math.random() < 0.9 ? 2 : 4;
    return [r, c];
  }

  function slideAndMergeLine(line) {
    const values = line.filter((v) => v !== 0);
    const merged = [];
    let gained = 0;
    const mergedIndexes = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        const mergedValue = values[i] * 2;
        merged.push(mergedValue);
        gained += mergedValue;
        mergedIndexes.push(merged.length - 1);
        i++;
      } else {
        merged.push(values[i]);
      }
    }
    while (merged.length < SIZE) merged.push(0);
    return { line: merged, gained, mergedIndexes };
  }

  function moveLeft(g) {
    let gained = 0;
    const mergedPositions = [];
    for (let r = 0; r < SIZE; r++) {
      const { line, gained: rowGain, mergedIndexes } = slideAndMergeLine(g[r]);
      gained += rowGain;
      mergedIndexes.forEach((idx) => mergedPositions.push([r, idx]));
      g[r] = line;
    }
    return { gained, mergedPositions };
  }

  function moveRight(g) {
    let gained = 0;
    const mergedPositions = [];
    for (let r = 0; r < SIZE; r++) {
      const reversed = g[r].slice().reverse();
      const { line, gained: rowGain, mergedIndexes } = slideAndMergeLine(reversed);
      g[r] = line.slice().reverse();
      gained += rowGain;
      mergedIndexes.forEach((idx) => mergedPositions.push([r, SIZE - 1 - idx]));
    }
    return { gained, mergedPositions };
  }

  function moveUp(g) {
    let gained = 0;
    const mergedPositions = [];
    for (let c = 0; c < SIZE; c++) {
      const column = g.map((row) => row[c]);
      const { line, gained: colGain, mergedIndexes } = slideAndMergeLine(column);
      for (let r = 0; r < SIZE; r++) g[r][c] = line[r];
      gained += colGain;
      mergedIndexes.forEach((idx) => mergedPositions.push([idx, c]));
    }
    return { gained, mergedPositions };
  }

  function moveDown(g) {
    let gained = 0;
    const mergedPositions = [];
    for (let c = 0; c < SIZE; c++) {
      const column = g.map((row) => row[c]).reverse();
      const { line, gained: colGain, mergedIndexes } = slideAndMergeLine(column);
      const newColumn = line.slice().reverse();
      for (let r = 0; r < SIZE; r++) g[r][c] = newColumn[r];
      gained += colGain;
      mergedIndexes.forEach((idx) => mergedPositions.push([SIZE - 1 - idx, c]));
    }
    return { gained, mergedPositions };
  }

  const MOVES = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown };

  function canMove(g) {
    if (getEmptyCells(g).length > 0) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = g[r][c];
        if (c < SIZE - 1 && g[r][c + 1] === v) return true;
        if (r < SIZE - 1 && g[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function isSamePosition(pos, r, c) {
    return pos[0] === r && pos[1] === c;
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const value = grid[r][c];
        const cell = document.createElement("div");
        cell.className = "cell";
        if (value !== 0) {
          cell.classList.add("tile");
          cell.dataset.value = String(value);
          if (value > 2048) cell.classList.add("tile-super");
          cell.textContent = String(value);
          if (lastNewPositions.some((pos) => isSamePosition(pos, r, c))) {
            cell.classList.add("tile-new");
          }
          if (lastMergedPositions.some((pos) => isSamePosition(pos, r, c))) {
            cell.classList.add("tile-merged");
          }
        }
        boardEl.appendChild(cell);
      }
    }
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
  }

  function showMessage(text, isWin) {
    messageTextEl.textContent = text;
    keepGoingBtn.hidden = !isWin;
    messageEl.hidden = false;
    statusEl.textContent = text;
  }

  function hideMessage() {
    messageEl.hidden = true;
  }

  function doMove(direction) {
    if (over || (won && !keepPlaying)) return;

    const before = cloneGrid(grid);
    const { gained, mergedPositions } = MOVES[direction](grid);
    const moved = !gridsEqual(before, grid);
    if (!moved) return;

    score += gained;
    if (score > best) {
      best = score;
      localStorage.setItem(STORAGE_BEST, String(best));
    }

    const newPos = spawnTile(grid);
    lastNewPositions = newPos ? [newPos] : [];
    lastMergedPositions = mergedPositions;

    render();

    if (!won && grid.some((row) => row.includes(2048))) {
      won = true;
      showMessage("2048을 만들었습니다! 축하합니다.", true);
    } else if (!canMove(grid)) {
      over = true;
      showMessage("게임 오버! 더 이상 움직일 수 없습니다.", false);
    }
  }

  function newGame() {
    grid = emptyGrid();
    score = 0;
    won = false;
    over = false;
    keepPlaying = false;
    lastNewPositions = [];
    lastMergedPositions = [];
    spawnTile(grid);
    spawnTile(grid);
    hideMessage();
    render();
    statusEl.textContent = "새 게임을 시작합니다.";
  }

  const KEY_DIRECTIONS = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
  };

  window.addEventListener("keydown", (e) => {
    const direction = KEY_DIRECTIONS[e.key];
    if (!direction) return;
    e.preventDefault();
    doMove(direction);
  });

  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 24;

  boardEl.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    },
    { passive: true }
  );

  boardEl.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;
      if (absDx > absDy) {
        doMove(dx > 0 ? "right" : "left");
      } else {
        doMove(dy > 0 ? "down" : "up");
      }
    },
    { passive: true }
  );

  newGameBtn.addEventListener("click", newGame);
  tryAgainBtn.addEventListener("click", newGame);
  keepGoingBtn.addEventListener("click", () => {
    keepPlaying = true;
    hideMessage();
  });

  newGame();
});
