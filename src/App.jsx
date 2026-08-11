import { BOARD_HEIGHT, BOARD_WIDTH, PIECES } from './game.js';
import { STATUS, useTetrisGame } from './hooks/useTetrisGame.js';

function Board({ cells }) {
  return (
    <div
      className="board"
      role="grid"
      aria-label={`${BOARD_WIDTH} x ${BOARD_HEIGHT} 테트리스 게임판`}
    >
      {cells.flat().map((cell, index) => (
        <span
          key={index}
          role="gridcell"
          className={`cell${cell ? ' occupied' : ''}`}
          style={cell ? { '--piece-color': PIECES[cell.type].color } : undefined}
        />
      ))}
    </div>
  );
}

export default function App() {
  const game = useTetrisGame();
  const isReady = game.status === STATUS.READY;
  const isGameOver = game.status === STATUS.GAME_OVER;

  return (
    <main className="game">
      <h1>TETRIS</h1>

      <div className="board-wrap">
        <Board cells={game.cells} />

        {(isReady || isGameOver) && (
          <div className="overlay">
            <button onClick={game.startGame}>
              {isGameOver ? '다시 시작' : '게임 시작'}
            </button>
          </div>
        )}
      </div>

      <p className="controls">
        ← → 이동 · ↑ 회전 · ↓ 내리기 · SPACE 바로 내리기
      </p>
    </main>
  );
}
