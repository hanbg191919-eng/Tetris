export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// 각 블록은 회전 전 기본 모양을 0과 1의 2차원 배열로 표현한다.
// 1은 채워진 칸이며 color는 흑백 화면에서 블록 종류를 구분하는 명도다.
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

// 2차원 배열을 전치한 뒤 각 열을 뒤집어 시계 방향으로 90도 회전한다.
export function rotate(shape) {
  return shape[0].map((_, column) => shape.map((row) => row[column]).reverse());
}

// 블록을 dx, dy만큼 옮기거나 nextShape으로 회전했을 때 겹치는지 검사한다.
// 위쪽 경계(boardY < 0)는 생성 직후 회전을 허용하기 위해 충돌에서 제외한다.
export function collides(board, piece, dx = 0, dy = 0, nextShape = piece.shape) {
  return nextShape.some((row, y) => row.some((filled, x) => {
    if (!filled) return false;
    const boardX = piece.x + x + dx;
    const boardY = piece.y + y + dy;
    return boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT ||
      (boardY >= 0 && board[boardY][boardX] !== null);
  }));
}

// 움직이는 블록을 복사된 게임판에 기록한다.
// 원본 board를 직접 바꾸지 않아 React의 불변 상태 규칙을 지킨다.
export function merge(board, piece) {
  const next = board.map((row) => [...row]);
  piece.shape.forEach((row, y) => row.forEach((filled, x) => {
    const boardY = piece.y + y;
    if (filled && boardY >= 0) next[boardY][piece.x + x] = piece.type;
  }));
  return next;
}

// 빈칸이 하나도 없는 행을 제거하고 같은 수의 빈 행을 위에 추가한다.
export function clearLines(board) {
  const kept = board.filter((row) => row.some((cell) => cell === null));
  const count = BOARD_HEIGHT - kept.length;
  return {
    count,
    board: [...Array.from({ length: count }, () => Array(BOARD_WIDTH).fill(null)), ...kept],
  };
}

// 기본 테트리스 점수표: 1/2/3/4줄 = 100/300/500/800 × 현재 레벨.
export function scoreFor(lines, level) {
  return ([0, 100, 300, 500, 800][lines] ?? 0) * level;
}

// 블록별 원본 shape가 회전 과정에서 바뀌지 않도록 배열을 복사해 생성한다.
export function spawnPiece(type) {
  const shape = PIECES[type].shape.map((row) => [...row]);
  return { type, shape, x: Math.floor((BOARD_WIDTH - shape[0].length) / 2), y: 0 };
}

// 충돌 직전까지 가상으로 내린 y좌표를 계산한다.
export function ghostY(board, piece) {
  let distance = 0;
  while (!collides(board, piece, 0, distance + 1)) distance += 1;
  return piece.y + distance;
}

// 화면 표시 전용 배열을 만들고 고스트를 먼저, 현재 블록을 나중에 칠한다.
// 그래서 두 위치가 겹칠 때 실제 블록이 고스트보다 우선 표시된다.
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
