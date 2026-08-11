export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const PIECES = {
  I: { color: '#f4f4f4', shape: [[1, 1, 1, 1]] },
  J: { color: '#d8d8d8', shape: [[1, 0, 0], [1, 1, 1]] },
  L: { color: '#bdbdbd', shape: [[0, 0, 1], [1, 1, 1]] },
  O: { color: '#ffffff', shape: [[1, 1], [1, 1]] },
  S: { color: '#a3a3a3', shape: [[0, 1, 1], [1, 1, 0]] },
  T: { color: '#898989', shape: [[0, 1, 0], [1, 1, 1]] },
  Z: { color: '#6f6f6f', shape: [[1, 1, 0], [0, 1, 1]] },
};

export const createBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

// 7-bag: 일곱 블록을 한 번씩 섞어서 편향된 연속 출현을 방지한다.
export function createBag(random = Math.random) {
  const bag = Object.keys(PIECES);
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function rotate(shape) {
  return shape[0].map((_, column) => shape.map((row) => row[column]).reverse());
}

export function collides(board, piece, dx = 0, dy = 0, nextShape = piece.shape) {
  return nextShape.some((row, y) => row.some((filled, x) => {
    if (!filled) return false;
    const boardX = piece.x + x + dx;
    const boardY = piece.y + y + dy;
    return boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT ||
      (boardY >= 0 && board[boardY][boardX] !== null);
  }));
}

export function merge(board, piece) {
  const next = board.map((row) => [...row]);
  piece.shape.forEach((row, y) => row.forEach((filled, x) => {
    const boardY = piece.y + y;
    if (filled && boardY >= 0) next[boardY][piece.x + x] = piece.type;
  }));
  return next;
}

export function clearLines(board) {
  const kept = board.filter((row) => row.some((cell) => cell === null));
  const count = BOARD_HEIGHT - kept.length;
  return {
    count,
    board: [...Array.from({ length: count }, () => Array(BOARD_WIDTH).fill(null)), ...kept],
  };
}

export function scoreFor(lines, level) {
  return ([0, 100, 300, 500, 800][lines] ?? 0) * level;
}

export function spawnPiece(type) {
  const shape = PIECES[type].shape.map((row) => [...row]);
  return { type, shape, x: Math.floor((BOARD_WIDTH - shape[0].length) / 2), y: 0 };
}

export function ghostY(board, piece) {
  let distance = 0;
  while (!collides(board, piece, 0, distance + 1)) distance += 1;
  return piece.y + distance;
}

export function boardWithPiece(board, piece) {
  const display = board.map((row) => row.map((type) => type ? { type, ghost: false } : null));
  const gy = ghostY(board, piece);
  const paint = (atY, ghost) => piece.shape.forEach((row, y) => row.forEach((filled, x) => {
    const py = atY + y;
    if (filled && py >= 0 && display[py]?.[piece.x + x] == null) {
      display[py][piece.x + x] = { type: piece.type, ghost };
    }
  }));
  paint(gy, true);
  paint(piece.y, false);
  return display;
}
