(function () {
  "use strict";

  var GRID_SIZE = 16;
  var EXPORT_SCALE = 20;

  var canvas = document.getElementById("editor-canvas");
  var ctx = canvas.getContext("2d");

  var palette = document.getElementById("palette");
  var customColorInput = document.getElementById("custom-color");
  var eraserBtn = document.getElementById("eraser-btn");
  var clearBtn = document.getElementById("clear-btn");
  var saveBtn = document.getElementById("save-btn");

  // grid[row][col] = color string | null (transparent)
  var grid = [];
  for (var r = 0; r < GRID_SIZE; r++) {
    grid.push(new Array(GRID_SIZE).fill(null));
  }

  var currentColor = "#000000";
  var currentTool = "draw"; // 'draw' | 'erase'
  var isDrawing = false;
  var lastRow = -1;
  var lastCol = -1;

  var displaySize = 0;
  var cellSize = 0;

  function setupCanvas() {
    var rect = canvas.getBoundingClientRect();
    displaySize = rect.width;
    var dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(displaySize * dpr);
    canvas.height = Math.round(displaySize * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    cellSize = displaySize / GRID_SIZE;

    render();
  }

  function drawCheckerboard(x, y, size) {
    var half = size / 2;
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(x, y, half, half);
    ctx.fillRect(x + half, y + half, half, half);
  }

  function render() {
    if (!displaySize) return;

    ctx.clearRect(0, 0, displaySize, displaySize);

    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        var x = col * cellSize;
        var y = row * cellSize;
        var color = grid[row][col];

        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          drawCheckerboard(x, y, cellSize);
        }
      }
    }

    // grid lines (editing canvas only)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;
    for (var i = 0; i <= GRID_SIZE; i++) {
      var pos = Math.round(i * cellSize) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, displaySize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(displaySize, pos);
      ctx.stroke();
    }
  }

  function getCellFromEvent(evt) {
    var rect = canvas.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var y = evt.clientY - rect.top;
    var col = Math.floor((x / rect.width) * GRID_SIZE);
    var row = Math.floor((y / rect.height) * GRID_SIZE);

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    return { row: row, col: col };
  }

  function paintCell(row, col) {
    var value = currentTool === "erase" ? null : currentColor;
    if (grid[row][col] === value) return;
    grid[row][col] = value;
    render();
  }

  function handlePointerDown(evt) {
    var cell = getCellFromEvent(evt);
    if (!cell) return;
    isDrawing = true;
    lastRow = cell.row;
    lastCol = cell.col;
    paintCell(cell.row, cell.col);
    canvas.setPointerCapture && canvas.setPointerCapture(evt.pointerId);
  }

  function handlePointerMove(evt) {
    if (!isDrawing) return;
    var cell = getCellFromEvent(evt);
    if (!cell) return;
    if (cell.row === lastRow && cell.col === lastCol) return;
    lastRow = cell.row;
    lastCol = cell.col;
    paintCell(cell.row, cell.col);
  }

  function stopDrawing() {
    isDrawing = false;
    lastRow = -1;
    lastCol = -1;
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointercancel", stopDrawing);
  canvas.addEventListener("pointerleave", stopDrawing);

  // Palette
  function setActiveSwatch(activeBtn) {
    var swatches = palette.querySelectorAll(".swatch");
    swatches.forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn === activeBtn ? "true" : "false");
    });
  }

  palette.addEventListener("click", function (evt) {
    var btn = evt.target.closest(".swatch");
    if (!btn) return;
    currentColor = btn.getAttribute("data-color");
    currentTool = "draw";
    setActiveSwatch(btn);
    eraserBtn.setAttribute("aria-pressed", "false");
  });

  customColorInput.addEventListener("input", function () {
    currentColor = customColorInput.value;
    currentTool = "draw";
    setActiveSwatch(null);
    eraserBtn.setAttribute("aria-pressed", "false");
  });

  // Eraser
  eraserBtn.addEventListener("click", function () {
    currentTool = currentTool === "erase" ? "draw" : "erase";
    eraserBtn.setAttribute("aria-pressed", currentTool === "erase" ? "true" : "false");
    if (currentTool === "erase") {
      setActiveSwatch(null);
    }
  });

  // Clear all
  clearBtn.addEventListener("click", function () {
    var confirmed = window.confirm("전체 지우시겠습니까?");
    if (!confirmed) return;
    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        grid[row][col] = null;
      }
    }
    render();
  });

  // Save as PNG
  saveBtn.addEventListener("click", function () {
    var exportCanvas = document.createElement("canvas");
    exportCanvas.width = GRID_SIZE * EXPORT_SCALE;
    exportCanvas.height = GRID_SIZE * EXPORT_SCALE;

    var exportCtx = exportCanvas.getContext("2d");
    exportCtx.imageSmoothingEnabled = false;

    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        var color = grid[row][col];
        if (!color) continue;
        exportCtx.fillStyle = color;
        exportCtx.fillRect(col * EXPORT_SCALE, row * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE);
      }
    }

    exportCanvas.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "pixel-art-" + Date.now() + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  });

  // Resize handling (keep backing store in sync with responsive CSS size)
  var resizeTimeout = null;
  window.addEventListener("resize", function () {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(setupCanvas, 100);
  });

  setupCanvas();
})();
