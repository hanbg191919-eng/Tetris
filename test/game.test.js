import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_HEIGHT, BOARD_WIDTH, clearLines, collides, createBag, createBoard, rotate, spawnPiece } from '../src/game.js';

test('보드는 10 x 20 빈 칸으로 생성된다', () => {
  const board = createBoard();
  assert.equal(board.length, BOARD_HEIGHT);
  assert.ok(board.every((row) => row.length === BOARD_WIDTH && row.every((cell) => cell === null)));
});

test('7-bag에는 일곱 종류가 한 번씩 들어간다', () => {
  assert.deepEqual([...createBag(() => 0.5)].sort(), ['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
});

test('회전은 행과 열을 바꾼다', () => {
  assert.deepEqual(rotate([[1, 0], [1, 1], [0, 1]]), [[0, 1, 1], [1, 1, 0]]);
});

test('바닥과 벽을 충돌로 판단한다', () => {
  const board = createBoard();
  assert.equal(collides(board, { ...spawnPiece('O'), x: -1 }), true);
  assert.equal(collides(board, { ...spawnPiece('O'), y: 18 }, 0, 1), true);
});

test('완성된 줄을 삭제하고 빈 줄을 위에 채운다', () => {
  const board = createBoard();
  board[19] = Array(10).fill('I');
  const result = clearLines(board);
  assert.equal(result.count, 1);
  assert.ok(result.board[0].every((cell) => cell === null));
});
