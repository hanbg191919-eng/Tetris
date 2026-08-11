export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// 블록 기본 모양. 1이 채워진 칸이다.
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

// 블록 7개를 한 묶음으로 섞는다.
export function createBag(random = Math.random) {
  const bag = Object.keys(PIECES);
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

// 시계 방향으로 90도 회전
export function rotate(shape) {
  return shape[0].map((_, column) => shape.map((row) => row[column]).reverse());
}

// 이동하거나 회전한 위치가 벽, 바닥, 다른 블록과 겹치는지 확인한다.
export function collides(board, piece, dx = 0, dy = 0, nextShape = piece.shape) {
  return nextShape.some((row, y) => row.some((filled, x) => {
    if (!filled) return false;
    const boardX = piece.x + x + dx;
    const boardY = piece.y + y + dy;
    return boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT ||
      (boardY >= 0 && board[boardY][boardX] !== null);
  }));
}

// 현재 블록을 게임판에 고정한다. 원본 판은 건드리지 않는다.
export function merge(board, piece) {
  const next = board.map((row) => [...row]);
  piece.shape.forEach((row, y) => row.forEach((filled, x) => {
    const boardY = piece.y + y;
    if (filled && boardY >= 0) next[boardY][piece.x + x] = piece.type;
  }));
  return next;
}

// 완성된 줄을 지우고 위에 빈 줄을 채운다.
export function clearLines(board) {
  const kept = board.filter((row) => row.some((cell) => cell === null));
  const count = BOARD_HEIGHT - kept.length;
  return {
    count,
    board: [...Array.from({ length: count }, () => Array(BOARD_WIDTH).fill(null)), ...kept],
  };
}

// 지운 줄 수에 따른 기본 점수
// 새 블록은 게임판 가운데에서 시작한다.
export function spawnPiece(type) {
  const shape = PIECES[type].shape.map((row) => [...row]);
  return { type, shape, x: Math.floor((BOARD_WIDTH - shape[0].length) / 2), y: 0 };
}

// 고정된 판 위에 현재 블록을 얹어 화면용 배열을 만든다.
export function boardWithPiece(board, piece) {
  const display = board.map((row) => row.map((type) => type ? { type, ghost: false } : null));
  piece.shape.forEach((row, y) => row.forEach((filled, x) => {
    const py = piece.y + y;
    if (filled && py >= 0 && display[py]?.[piece.x + x] == null) {
      display[py][piece.x + x] = { type: piece.type };
    }
  }));
  return display;
}
