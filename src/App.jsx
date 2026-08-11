import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BOARD_HEIGHT, BOARD_WIDTH, PIECES, boardWithPiece, clearLines, collides,
  createBag, createBoard, merge, rotate, scoreFor, spawnPiece,
} from './game.js';

const RANKING_KEY = 'tetris-plus-ranking';

// Font Awesome 클래스명을 짧게 사용하기 위한 공통 아이콘 컴포넌트다.
// 장식용 아이콘이므로 스크린 리더가 중복해서 읽지 않게 숨긴다.
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

// 게임 엔진이 만든 2차원 셀 배열을 CSS Grid로 그린다.
// Board는 규칙을 계산하지 않고 전달받은 결과만 화면에 표시한다.
function Board({ cells }) {
  return <div className="board" role="grid" aria-label={`${BOARD_WIDTH} x ${BOARD_HEIGHT} 테트리스 게임판`}>
    {cells.flat().map((cell, index) => <span key={index} role="gridcell"
      className={`cell${cell ? ' occupied' : ''}${cell?.ghost ? ' ghost' : ''}`}
      style={cell ? { '--piece-color': PIECES[cell.type].color } : undefined} />)}
  </div>;
}

function loadRanking() {
  // 저장값이 깨졌더라도 첫 화면이 멈추지 않도록 빈 순위표로 복구한다.
  try { return JSON.parse(localStorage.getItem(RANKING_KEY)) ?? []; } catch { return []; }
}

export default function App() {
  // 화면 전환은 라우터 대신 간단한 문자열 상태로 관리한다.
  // 가능한 값: home, playing, paused, gameover, ranking, settings
  const [screen, setScreen] = useState('home');

  // 게임판에는 이미 고정된 블록만, piece에는 현재 움직이는 블록만 저장한다.
  // 둘을 분리하면 충돌 판정과 고스트 블록 계산이 단순해진다.
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState(null);

  // queue는 앞으로 등장할 블록, hold는 사용자가 보관한 블록이다.
  const [queue, setQueue] = useState([]);
  const [hold, setHold] = useState(null);
  const [canHold, setCanHold] = useState(true);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [nickname, setNickname] = useState('PLAYER');
  const [ranking, setRanking] = useState(loadRanking);
  const [soundOn, setSoundOn] = useState(true);

  // 타이머와 키보드 이벤트는 등록 당시의 오래된 state를 기억할 수 있다.
  // ref에 매 렌더의 최신 값을 넣어 이벤트에서도 현재 게임 상태를 읽게 한다.
  const stateRef = useRef({});

  const level = Math.floor(lines / 10) + 1;
  stateRef.current = { board, piece, queue, hold, canHold, score, lines, level, screen };

  // 큐가 짧아지면 새 7-bag을 뒤에 붙이고 맨 앞 블록을 꺼낸다.
  const takeNext = useCallback((sourceQueue) => {
    let nextQueue = [...sourceQueue];
    if (nextQueue.length < 5) nextQueue.push(...createBag());
    const type = nextQueue.shift();
    return { nextPiece: spawnPiece(type), nextQueue };
  }, []);

  // 새 게임에 필요한 모든 상태를 한 번에 초기화한다.
  const startGame = useCallback(() => {
    const firstBag = createBag();
    const { nextPiece, nextQueue } = takeNext(firstBag);
    setBoard(createBoard()); setPiece(nextPiece); setQueue(nextQueue);
    setHold(null); setCanHold(true); setScore(0); setLines(0); setScreen('playing');
  }, [takeNext]);

  // 최종 기록을 점수순으로 정렬하고 상위 10개만 브라우저에 보관한다.
  const finishGame = useCallback((finalScore, finalLines) => {
    const entry = { name: nickname.trim().slice(0, 8) || 'PLAYER', score: finalScore, lines: finalLines, date: Date.now() };
    const nextRanking = [...loadRanking(), entry].sort((a, b) => b.score - a.score || a.date - b.date).slice(0, 10);
    localStorage.setItem(RANKING_KEY, JSON.stringify(nextRanking));
    setRanking(nextRanking); setScreen('gameover');
  }, [nickname]);

  // 현재 블록이 더 내려갈 수 없을 때 실행되는 한 턴의 마무리 과정이다.
  // 블록 고정 → 완성 줄 삭제 → 점수 계산 → 다음 블록 생성 순서로 처리한다.
  const lockPiece = useCallback(() => {
    const current = stateRef.current;
    if (!current.piece) return;
    const merged = merge(current.board, current.piece);
    const result = clearLines(merged);
    const gained = scoreFor(result.count, current.level);
    const nextScore = current.score + gained;
    const nextLines = current.lines + result.count;
    const { nextPiece, nextQueue } = takeNext(current.queue);
    // 다음 블록이 생성 위치부터 겹치면 더 놓을 공간이 없으므로 게임 오버다.
    if (collides(result.board, nextPiece)) {
      setBoard(result.board); setScore(nextScore); setLines(nextLines);
      finishGame(nextScore, nextLines); return;
    }
    setBoard(result.board); setPiece(nextPiece); setQueue(nextQueue);
    setScore(nextScore); setLines(nextLines); setCanHold(true);
  }, [finishGame, takeNext]);

  // 충돌하지 않는 경우에만 현재 블록 좌표를 변경한다.
  // 이동 성공 여부는 소프트 드롭과 자동 낙하가 블록 고정을 결정할 때 사용한다.
  const move = useCallback((dx, dy) => {
    const { board: b, piece: p } = stateRef.current;
    if (!p || collides(b, p, dx, dy)) return false;
    setPiece({ ...p, x: p.x + dx, y: p.y + dy });
    return true;
  }, []);

  const drop = useCallback(() => { if (!move(0, 1)) lockPiece(); }, [lockPiece, move]);

  // 가능한 마지막 위치까지 즉시 이동하고 이동 거리만큼 보너스 점수를 준다.
  const hardDrop = useCallback(() => {
    const { board: b, piece: p, score: currentScore } = stateRef.current;
    if (!p) return;
    let distance = 0;
    while (!collides(b, p, 0, distance + 1)) distance += 1;
    setPiece({ ...p, y: p.y + distance });
    setScore(currentScore + distance * 2);
    // React 상태 반영은 비동기이므로 lockPiece가 즉시 최신 값을 읽도록 ref도 갱신한다.
    stateRef.current.piece = { ...p, y: p.y + distance };
    stateRef.current.score = currentScore + distance * 2;
    lockPiece();
  }, [lockPiece]);

  // 회전 후 충돌하면 좌우로 조금씩 옮겨 벽 근처에서도 회전을 시도한다.
  // 이 배열은 정식 SRS를 단순화한 기본 wall kick 규칙이다.
  const turn = useCallback(() => {
    const { board: b, piece: p } = stateRef.current;
    if (!p) return;
    const shape = rotate(p.shape);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(b, p, kick, 0, shape)) { setPiece({ ...p, x: p.x + kick, shape }); return; }
    }
  }, []);

  // 한 블록이 바닥에 고정되기 전에는 HOLD를 한 번만 허용한다.
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

  // 레벨이 올라갈수록 interval을 줄이되 최소 110ms보다 빨라지지는 않는다.
  useEffect(() => {
    if (screen !== 'playing') return undefined;
    const timer = window.setInterval(drop, Math.max(110, 850 - (level - 1) * 65));
    return () => window.clearInterval(timer);
  }, [drop, level, screen]);

  // 키보드 리스너는 한 번 등록하고, 화면이 바뀌거나 콜백이 바뀌면 정리 후 다시 등록한다.
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

  // 렌더링할 때만 고정 블록 위에 현재 블록과 고스트 블록을 합성한다.
  // 실제 board 데이터에는 움직이는 블록을 넣지 않는다.
  const shownBoard = piece
    ? boardWithPiece(board, piece)
    : board.map((row) => row.map((type) => type ? { type } : null));

  // 게임판이 필요 없는 메뉴 계열 화면을 먼저 반환한다.
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

  // playing, paused, gameover는 같은 게임판 위에 상태별 오버레이를 표시한다.
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
