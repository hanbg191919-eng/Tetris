import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  boardWithPiece,
  clearLines,
  collides,
  createBag,
  createBoard,
  merge,
  rotate,
  spawnPiece,
} from '../game.js';

export const STATUS = {
  READY: 'ready',
  PLAYING: 'playing',
  GAME_OVER: 'gameover',
};

function takeNext(sourceQueue) {
  const nextQueue = [...sourceQueue];
  if (nextQueue.length === 0) nextQueue.push(...createBag());

  return {
    nextPiece: spawnPiece(nextQueue.shift()),
    nextQueue,
  };
}

export function useTetrisGame() {
  // board에는 멈춘 블록만 두고 움직이는 블록은 piece로 따로 관리한다.
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState(null);
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState(STATUS.READY);

  // 타이머와 키보드 이벤트에서 최신 상태를 읽기 위해 사용한다.
  const stateRef = useRef({});
  stateRef.current = { board, piece, queue };

  const startGame = useCallback(() => {
    const { nextPiece, nextQueue } = takeNext(createBag());

    setBoard(createBoard());
    setPiece(nextPiece);
    setQueue(nextQueue);
    setStatus(STATUS.PLAYING);
  }, []);

  // 더 내려갈 수 없으면 블록을 고정하고 완성된 줄을 지운다.
  const lockPiece = useCallback((pieceToLock) => {
    const current = stateRef.current;
    const targetPiece = pieceToLock ?? current.piece;
    if (!targetPiece) return;

    const mergedBoard = merge(current.board, targetPiece);
    const { board: clearedBoard } = clearLines(mergedBoard);
    const { nextPiece, nextQueue } = takeNext(current.queue);

    setBoard(clearedBoard);

    if (collides(clearedBoard, nextPiece)) {
      setPiece(null);
      setStatus(STATUS.GAME_OVER);
      return;
    }

    setPiece(nextPiece);
    setQueue(nextQueue);
  }, []);

  const move = useCallback((dx, dy) => {
    const { board: currentBoard, piece: currentPiece } = stateRef.current;
    if (!currentPiece || collides(currentBoard, currentPiece, dx, dy)) return false;

    setPiece({
      ...currentPiece,
      x: currentPiece.x + dx,
      y: currentPiece.y + dy,
    });
    return true;
  }, []);

  const drop = useCallback(() => {
    if (!move(0, 1)) lockPiece();
  }, [lockPiece, move]);

  const hardDrop = useCallback(() => {
    const { board: currentBoard, piece: currentPiece } = stateRef.current;
    if (!currentPiece) return;

    let distance = 0;
    while (!collides(currentBoard, currentPiece, 0, distance + 1)) distance += 1;

    lockPiece({ ...currentPiece, y: currentPiece.y + distance });
  }, [lockPiece]);

  const turn = useCallback(() => {
    const { board: currentBoard, piece: currentPiece } = stateRef.current;
    if (!currentPiece) return;

    const nextShape = rotate(currentPiece.shape);

    // 벽에 걸리면 좌우로 조금 옮겨서 회전해 본다.
    for (const offsetX of [0, -1, 1, -2, 2]) {
      if (!collides(currentBoard, currentPiece, offsetX, 0, nextShape)) {
        setPiece({ ...currentPiece, x: currentPiece.x + offsetX, shape: nextShape });
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (status !== STATUS.PLAYING) return undefined;

    const timer = window.setInterval(drop, 700);
    return () => window.clearInterval(timer);
  }, [drop, status]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (status !== STATUS.PLAYING) return;

      const keyActions = {
        ArrowLeft: () => move(-1, 0),
        ArrowRight: () => move(1, 0),
        ArrowDown: drop,
        ArrowUp: turn,
        ' ': hardDrop,
      };

      if (keyActions[event.key]) {
        event.preventDefault();
        keyActions[event.key]();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drop, hardDrop, move, status, turn]);

  const cells = useMemo(() => (
    piece ? boardWithPiece(board, piece) : board.map((row) => [...row])
  ), [board, piece]);

  return { cells, startGame, status };
}
