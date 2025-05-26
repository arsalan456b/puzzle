const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('dropZone');
const piecesContainer = document.getElementById('piecesContainer');
const boardContainer = document.getElementById('boardContainer');
const toggleShadowBtn = document.getElementById('toggleShadowBtn');
const timerSpan = document.getElementById('timer');
const movesSpan = document.getElementById('moves');
const themeSelect = document.getElementById('themeSelect');
const sizeSelect = document.getElementById('sizeSelect');
const snapSound = document.getElementById('snapSound');

const PUZZLE_SIZE = 400; // Фиксированный размер пазла в px

let ROWS = parseInt(sizeSelect.value);
let COLS = ROWS;
let PIECE_SIZE = PUZZLE_SIZE / ROWS;

let pieces = [];
let timerInterval = null;
let timeSeconds = 0;
let movesCount = 0;
let shadowImage = null;
let shadowVisible = false;
let imageSrcGlobal = null;

// --- Тема ---
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
  localStorage.setItem('puzzleTheme', theme);
}

themeSelect.value = localStorage.getItem('puzzleTheme') || 'light';
applyTheme(themeSelect.value);

themeSelect.addEventListener('change', () => {
  applyTheme(themeSelect.value);
});

// --- Таймер ---
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timeSeconds++;
    timerSpan.textContent = formatTime(timeSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  timeSeconds = 0;
  timerSpan.textContent = '00:00';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// --- Счетчик ходов ---
function incrementMoves() {
  movesCount++;
  movesSpan.textContent = movesCount;
}

function resetMoves() {
  movesCount = 0;
  movesSpan.textContent = '0';
}

// --- Создание пазла ---
imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    imageSrcGlobal = event.target.result;
    createPuzzle(imageSrcGlobal);
  };
  reader.readAsDataURL(file);
});

// Drag & Drop загрузка
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    const file = e.dataTransfer.files[0];
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(event) {
        imageSrcGlobal = event.target.result;
        createPuzzle(imageSrcGlobal);
      };
      reader.readAsDataURL(file);
    }
  }
});

// --- Изменение размера пазла ---
sizeSelect.addEventListener('change', () => {
  ROWS = parseInt(sizeSelect.value);
  COLS = ROWS;
  PIECE_SIZE = PUZZLE_SIZE / ROWS;
  if (imageSrcGlobal) {
    createPuzzle(imageSrcGlobal);
  }
});

function createPuzzle(imageSrc) {
  piecesContainer.innerHTML = '';
  boardContainer.innerHTML = '';
  pieces = [];
  resetTimer();
  resetMoves();
  toggleShadowBtn.disabled = false;
  shadowVisible = false;
  removeShadowImage();

  createShadowImage(imageSrc);

  // Настраиваем сетку boardContainer под новый размер
  boardContainer.style.gridTemplateColumns = `repeat(${COLS}, ${PIECE_SIZE}px)`;
  boardContainer.style.gridTemplateRows = `repeat(${ROWS}, ${PIECE_SIZE}px)`;

  // Создаем ячейки на доске
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.style.width = PIECE_SIZE + 'px';
      cell.style.height = PIECE_SIZE + 'px';
      cell.addEventListener('dragover', onDragOver);
      cell.addEventListener('drop', onDropOnCell);
      boardContainer.appendChild(cell);
    }
  }

  // Создаем кусочки и размещаем в piecesContainer хаотично
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const piece = document.createElement('div');
      piece.classList.add('piece');
      piece.style.width = PIECE_SIZE + 'px';
      piece.style.height = PIECE_SIZE + 'px';

      piece.style.backgroundImage = `url(${imageSrc})`;
      piece.style.backgroundPosition = `-${col * PIECE_SIZE}px -${row * PIECE_SIZE}px`;
      piece.style.backgroundSize = `${PUZZLE_SIZE}px ${PUZZLE_SIZE}px`;

      piece.dataset.correctRow = row;
      piece.dataset.correctCol = col;
      piece.dataset.id = `piece-${row}-${col}`;

      piece.setAttribute('draggable', 'true');

      piece.addEventListener('dragstart', onDragStart);
      piece.addEventListener('dragend', onDragEnd);

      piecesContainer.appendChild(piece);

      // Задаём случайную позицию внутри piecesContainer
      const maxLeft = piecesContainer.clientWidth - PIECE_SIZE;
      const maxTop = piecesContainer.clientHeight - PIECE_SIZE;
      piece.style.position = 'absolute';
      piece.style.left = Math.random() * maxLeft + 'px';
      piece.style.top = Math.random() * maxTop + 'px';

      pieces.push(piece);
    }
  }

  // Разрешаем дроп на контейнер с кусочками
  piecesContainer.addEventListener('dragover', onDragOver);
  piecesContainer.addEventListener('drop', onDropOnPiecesContainer);
}

// --- Drag and Drop handlers ---
let draggedPiece = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function onDragStart(e) {
  draggedPiece = e.target;
  e.dataTransfer.setData('text/plain', draggedPiece.dataset.id);
  e.dataTransfer.effectAllowed = 'move';

  const rect = draggedPiece.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;

  setTimeout(() => {
    draggedPiece.classList.add('dragging');
  }, 0);

  startTimer();
}

function onDragEnd(e) {
  if (draggedPiece) {
    draggedPiece.classList.remove('dragging');

    if (draggedPiece.parentElement === piecesContainer) {
      const containerRect = piecesContainer.getBoundingClientRect();
      let newLeft = e.clientX - containerRect.left - dragOffsetX;
      let newTop = e.clientY - containerRect.top - dragOffsetY;

      newLeft = Math.max(0, Math.min(newLeft, piecesContainer.clientWidth - PIECE_SIZE));
      newTop = Math.max(0, Math.min(newTop, piecesContainer.clientHeight - PIECE_SIZE));

      draggedPiece.style.left = newLeft + 'px';
      draggedPiece.style.top = newTop + 'px';
    }

    draggedPiece = null;
  }
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDropOnCell(e) {
  e.preventDefault();
  const cell = e.currentTarget;
  if (cell.hasChildNodes()) return;

  const id = e.dataTransfer.getData('text/plain');
  const piece = pieces.find(p => p.dataset.id === id);
  if (!piece) return;

  const cellRow = parseInt(cell.dataset.row, 10);
  const cellCol = parseInt(cell.dataset.col, 10);
  const pieceRow = parseInt(piece.dataset.correctRow, 10);
  const pieceCol = parseInt(piece.dataset.correctCol, 10);

  if (cellRow === pieceRow && cellCol === pieceCol) {
    if (piece.parentNode) piece.parentNode.removeChild(piece);

    cell.appendChild(piece);
    piece.style.position = 'relative';
    piece.style.left = '0';
    piece.style.top = '0';
    piece.classList.add('correct');
    piece.style.borderColor = 'var(--highlight)';
    piece.style.boxShadow = '0 0 15px var(--highlight)';
    piece.style.cursor = 'default';

    incrementMoves();

    snapSound.currentTime = 0;
    snapSound.play();
    animateSnap(piece);

    checkWin();
  } else {
    piece.classList.add('shake');
    setTimeout(() => piece.classList.remove('shake'), 500);
  }
}

function onDropOnPiecesContainer(e) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  const piece = pieces.find(p => p.dataset.id === id);
  if (!piece) return;

  if (piece.parentElement === piecesContainer) return;

  if (piece.parentNode) piece.parentNode.removeChild(piece);

  piecesContainer.appendChild(piece);
  piece.style.position = 'absolute';
  piece.style.borderColor = '#bbb';
  piece.style.boxShadow = 'none';
  piece.style.cursor = 'grab';
  piece.classList.remove('correct');

  const maxLeft = piecesContainer.clientWidth - PIECE_SIZE;
  const maxTop = piecesContainer.clientHeight - PIECE_SIZE;
  piece.style.left = Math.random() * maxLeft + 'px';
  piece.style.top = Math.random() * maxTop + 'px';

  incrementMoves();

  checkWin();
}

// --- Режим "Тень" ---
toggleShadowBtn.addEventListener('click', () => {
  shadowVisible = !shadowVisible;
  if (shadowVisible) {
    showShadowImage();
    toggleShadowBtn.textContent = 'Выключить "Тень" 👤';
  } else {
    hideShadowImage();
    toggleShadowBtn.textContent = 'Режим "Тень" 👤';
  }
});

function createShadowImage(src) {
  removeShadowImage();
  shadowImage = document.createElement('img');
  shadowImage.id = 'puzzleShadow';
  shadowImage.src = src;
  shadowImage.style.position = 'absolute';
  shadowImage.style.top = boardContainer.offsetTop + 'px';
  shadowImage.style.left = boardContainer.offsetLeft + 'px';
  shadowImage.style.width = PUZZLE_SIZE + 'px';
  shadowImage.style.height = PUZZLE_SIZE + 'px';
  shadowImage.style.opacity = '0.15';
  shadowImage.style.pointerEvents = 'none';
  shadowImage.style.borderRadius = '16px';
  shadowImage.style.transition = 'opacity 0.3s';
  shadowImage.style.zIndex = '0';
  boardContainer.parentElement.appendChild(shadowImage);
  hideShadowImage();
}

function showShadowImage() {
  if (shadowImage) shadowImage.style.opacity = '0.15';
}

function hideShadowImage() {
  if (shadowImage) shadowImage.style.opacity = '0';
}

function removeShadowImage() {
  if (shadowImage && shadowImage.parentNode) {
    shadowImage.parentNode.removeChild(shadowImage);
    shadowImage = null;
  }
}

function animateSnap(piece) {
  piece.animate([
    { transform: 'scale(1.15)' },
    { transform: 'scale(1)' }
  ], { duration: 200, easing: 'ease-out' });
}

function checkWin() {
  const correctCount = pieces.filter(p => p.classList.contains('correct')).length;
  if (correctCount === pieces.length) {
    stopTimer();
    setTimeout(() => alert(`Поздравляем! Пазл собран за ${formatTime(timeSeconds)} и ${movesCount} ходов! 🎉`), 100);
  }
}
