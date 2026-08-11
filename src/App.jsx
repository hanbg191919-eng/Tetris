import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BOARD_HEIGHT, BOARD_WIDTH, PIECES, boardWithPiece, clearLines, collides,
  createBag, createBoard, merge, rotate, scoreFor, spawnPiece,
} from './game.js';

const RANKING_KEY = 'tetris-plus-ranking';

function Icon({ name }) {
  return <i className={`fa fa-${name}`} aria-hidden="true" />;
}

function Preview({ type, label }) {
  const shape = type ? PIECES[type].shape : [];
  return <section className="side-card">
    <h2>{label}</h2>
    <div className="preview" aria-label={`${label} ${type ?? '없음'}`}>
      {shape.map((row, y) => row.map((filled, x) =>
        <span key={`${x}-${y}`} className={filled ? 'mini filled' : 'mini'}
          style={filled ? { '--piece-color': PIECES[type].color } : undefined} />))}
    </div>
    <strong className="piece-name">{type ?? '—'}</strong>
  </section>;
}

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Board({ cells }) {
  return <div className="board" role="grid" aria-label={`${BOARD_WIDTH} x ${BOARD_HEIGHT} 테트리스 게임판`}>
    {cells.flat().map((cell, index) => <span key={index} role="gridcell"
      className={`cell${cell ? ' occupied' : ''}${cell?.ghost ? ' ghost' : ''}`}
      style={cell ? { '--piece-color': PIECES[cell.type].color } : undefined} />)}
  </div>;
}

function loadRanking() {
  try { return JSON.parse(localStorage.getItem(RANKING_KEY)) ?? []; } catch { return []; }
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState(null);
  const [queue, setQueue] = useState([]);
  const [hold, setHold] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [nickname, setNickname] = useState('PLAYER');
  const [ranking, setRanking] = useState(loadRanking);
  const [soundOn, setSoundOn] = useState(true);
  const stateRef = useRef({});

  const level = Math.floor(lines / 10) + 1;
  stateRef.current = { board, piece, queue, hold, canHold, score, lines, level, screen };

  const takeNext = useCallback((sourceQueue) => {
    let nextQueue = [...sourceQueue];
    if (nextQueue.length < 5) nextQueue.push(...createBag());
    const type = nextQueue.shift();
    return { nextPiece: spawnPiece(type), nextQueue };
  }, []);

  const startGame = useCallback(() => {
    const firstBag = createBag();
    const { nextPiece, nextQueue } = takeNext(firstBag);
    setBoard(createBoard()); setPiece(nextPiece); setQueue(nextQueue);
    setHold(null); setCanHold(true); setScore(0); setLines(0); setScreen('playing');
  }, [takeNext]);

  const finishGame = useCallback((finalScore, finalLines) => {
    const entry = { name: nickname.trim().slice(0, 8) || 'PLAYER', score: finalScore, lines: finalLines, date: Date.now() };
    const nextRanking = [...loadRanking(), entry].sort((a, b) => b.score - a.score || a.date - b.date).slice(0, 10);
    localStorage.setItem(RANKING_KEY, JSON.stringify(nextRanking));
    setRanking(nextRanking); setScreen('gameover');
  }, [nickname]);

  const lockPiece = useCallback(() => {
    const current = stateRef.current;
    if (!current.piece) return;
    const merged = merge(current.board, current.piece);
    const result = clearLines(merged);
    const gained = scoreFor(result.count, current.level);
    const nextScore = current.score + gained;
    const nextLines = current.lines + result.count;
    const { nextPiece, nextQueue } = takeNext(current.queue);
    if (collides(result.board, nextPiece)) {
      setBoard(result.board); setScore(nextScore); setLines(nextLines);
      finishGame(nextScore, nextLines); return;
    }
    setBoard(result.board); setPiece(nextPiece); setQueue(nextQueue);
    setScore(nextScore); setLines(nextLines); setCanHold(true);
  }, [finishGame, takeNext]);

  const move = useCallback((dx, dy) => {
    const { board: b, piece: p } = stateRef.current;
    if (!p || collides(b, p, dx, dy)) return false;
    setPiece({ ...p, x: p.x + dx, y: p.y + dy });
    return true;
  }, []);

  const drop = useCallback(() => { if (!move(0, 1)) lockPiece(); }, [lockPiece, move]);

  const hardDrop = useCallback(() => {
    const { board: b, piece: p, score: currentScore } = stateRef.current;
    if (!p) return;
    let distance = 0;
    while (!collides(b, p, 0, distance + 1)) distance += 1;
    setPiece({ ...p, y: p.y + distance });
    setScore(currentScore + distance * 2);
    stateRef.current.piece = { ...p, y: p.y + distance };
    stateRef.current.score = currentScore + distance * 2;
    lockPiece();
  }, [lockPiece]);

  const turn = useCallback(() => {
    const { board: b, piece: p } = stateRef.current;
    if (!p) return;
    const shape = rotate(p.shape);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(b, p, kick, 0, shape)) { setPiece({ ...p, x: p.x + kick, shape }); return; }
    }
  }, []);

  const holdPiece = useCallback(() => {
    const current = stateRef.current;
    if (!current.piece || !current.canHold) return;
    if (current.hold) {
      const swapped = spawnPiece(current.hold);
      setHold(current.piece.type); setPiece(swapped);
      if (collides(current.board, swapped)) finishGame(current.score, current.lines);
    } else {
      const { nextPiece, nextQueue } = takeNext(current.queue);
      setHold(current.piece.type); setPiece(nextPiece); setQueue(nextQueue);
    }
    setCanHold(false);
  }, [finishGame, takeNext]);

  useEffect(() => {
    if (screen !== 'playing') return undefined;
    const timer = window.setInterval(drop, Math.max(110, 850 - (level - 1) * 65));
    return () => window.clearInterval(timer);
  }, [drop, level, screen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'c', 'C', 'p', 'P', 'Escape'].includes(event.key)) event.preventDefault();
      if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        if (screen === 'playing') setScreen('paused'); else if (screen === 'paused') setScreen('playing');
        return;
      }
      if (screen !== 'playing') return;
      if (event.key === 'ArrowLeft') move(-1, 0);
      if (event.key === 'ArrowRight') move(1, 0);
      if (event.key === 'ArrowDown') { if (move(0, 1)) setScore((value) => value + 1); else lockPiece(); }
      if (event.key === 'ArrowUp') turn();
      if (event.key === ' ') hardDrop();
      if (event.key.toLowerCase() === 'c') holdPiece();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hardDrop, holdPiece, lockPiece, move, screen, turn]);

  const shownBoard = piece ? boardWithPiece(board, piece) : board.map((row) => row.map((type) => type ? { type } : null));

  if (screen === 'home' || screen === 'ranking' || screen === 'settings') {
    return <main className="shell home-shell">
      <div className="brand"><span className="brand-kicker">ITEM &amp; SKILL</span><h1>TETRIS <em>+</em></h1><p>가장 익숙한 규칙, 더 또렷한 플레이.</p></div>
      {screen === 'home' && <div className="menu-card">
        <label>닉네임<input value={nickname} maxLength={8} onChange={(e) => setNickname(e.target.value)} /></label>
        <button className="primary" onClick={startGame}><Icon name="play" />게임 시작</button>
        <button onClick={() => setScreen('ranking')}><Icon name="trophy" />랭킹 보기</button>
        <button onClick={() => setScreen('settings')}><Icon name="cog" />설정</button>
      </div>}
      {screen === 'ranking' && <div className="menu-card wide"><h2><Icon name="trophy" />RANKING TOP 10</h2>
        {ranking.length === 0 ? <p className="empty">아직 기록이 없습니다. 첫 기록을 만들어 보세요.</p> :
          <ol className="ranking">{ranking.map((item, i) => <li key={`${item.date}-${i}`}><b>{i + 1}</b><span>{item.name}</span><strong>{item.score.toLocaleString()}</strong><small>{item.lines} LINES</small></li>)}</ol>}
        <button onClick={() => setScreen('home')}><Icon name="arrow-left" />메인으로</button>
      </div>}
      {screen === 'settings' && <div className="menu-card wide"><h2><Icon name="cog" />설정</h2>
        <div className="setting-row"><span><Icon name={soundOn ? 'volume-up' : 'volume-off'} />효과음</span><button className="toggle" aria-pressed={soundOn} onClick={() => setSoundOn((v) => !v)}>{soundOn ? 'ON' : 'OFF'}</button></div>
        <div className="key-guide"><p><kbd>← →</kbd> 이동</p><p><kbd>↑</kbd> 회전</p><p><kbd>↓</kbd> 소프트 드롭</p><p><kbd>Space</kbd> 하드 드롭</p><p><kbd>C</kbd> 홀드</p><p><kbd>P / Esc</kbd> 일시정지</p></div>
        <button onClick={() => setScreen('home')}><Icon name="arrow-left" />메인으로</button>
      </div>}
      <p className="footer-note">BASIC BUILD · REACT</p>
    </main>;
  }

  return <main className="shell game-shell">
    <header className="game-header"><div><span className="brand-kicker">TETRIS +</span><strong>{nickname || 'PLAYER'}</strong></div><button className="icon-button" aria-label={screen === 'paused' ? '게임 계속하기' : '일시정지'} onClick={() => setScreen(screen === 'paused' ? 'playing' : 'paused')}><Icon name={screen === 'paused' ? 'play' : 'pause'} /></button></header>
    <div className="game-layout">
      <aside><Preview type={hold} label="HOLD" /><div className="stats"><Stat label="SCORE" value={score.toLocaleString()} /><Stat label="LEVEL" value={level} /><Stat label="LINES" value={lines} /></div></aside>
      <div className="board-wrap"><Board cells={shownBoard} />
        {(screen === 'paused' || screen === 'gameover') && <div className="overlay"><span><Icon name={screen === 'paused' ? 'pause' : 'stop'} /></span><h2>{screen === 'paused' ? 'PAUSED' : 'GAME OVER'}</h2><p>{screen === 'paused' ? '잠시 쉬어가도 괜찮아요.' : `${score.toLocaleString()}점 · ${lines}줄`}</p>
          {screen === 'paused' && <button className="primary" onClick={() => setScreen('playing')}>게임 계속하기</button>}
          <button onClick={startGame}>처음부터 다시</button><button onClick={() => setScreen('home')}>메인으로</button></div>}
      </div>
      <aside><Preview type={queue[0]} label="NEXT" /><div className="next-list">{queue.slice(1, 4).map((type, i) => <Preview key={`${type}-${i}`} type={type} label={`+${i + 2}`} />)}</div></aside>
    </div>
    <div className="mobile-controls"><button aria-label="왼쪽 이동" onClick={() => move(-1, 0)}><Icon name="chevron-left" /></button><button aria-label="회전" onClick={turn}><Icon name="repeat" /></button><button aria-label="오른쪽 이동" onClick={() => move(1, 0)}><Icon name="chevron-right" /></button><button aria-label="아래로 이동" onClick={drop}><Icon name="chevron-down" /></button><button onClick={holdPiece}><Icon name="hand-paper-o" />HOLD</button><button className="drop" onClick={hardDrop}><Icon name="angle-double-down" />DROP</button></div>
    <p className="controls-hint">← → 이동 · ↑ 회전 · ↓ 내리기 · SPACE 하드 드롭 · C 홀드 · P 일시정지</p>
  </main>;
}
