# React Tetris Basic

React로 만든 기본 테트리스입니다. 블록 생성과 이동, 회전, 충돌 처리, 줄 삭제만 구현했습니다.

## 바로 실행

`테트리스.html`을 더블클릭하면 브라우저에서 실행됩니다.


## 파일 구성

```text
├── src/
│   ├── App.jsx                 # 게임 화면
│   ├── game.js                 # 블록, 회전, 충돌, 줄 삭제
│   ├── hooks/useTetrisGame.js  # 게임 상태, 키보드, 자동 낙하
│   ├── main.jsx                # React 시작 파일
│   └── styles.css              # 게임 화면 스타일
├── test/game.test.js           # 기본 규칙 테스트
├── dist/
│   ├── tetris.js               # 빌드된 실행 코드
│   └── tetris.css              # 빌드된 스타일
├── index.html                  # 개발용 HTML
├── 테트리스.html              # 더블클릭 실행용 HTML
├── package.json
└── vite.config.js
```

## 조작법

- `←`, `→`: 이동
- `↑`: 회전
- `↓`: 한 칸 내리기
- `Space`: 바닥까지 내리기

## 테스트

```bash
npm test
```
