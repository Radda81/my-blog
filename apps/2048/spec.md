# spec: 2048 (apps/2048)

## 1. 파일 구성

```
apps/2048/
├── index.html   # 보드, 점수판, 오버레이 마크업
├── style.css    # 레이아웃/그리드/타일 색상/반응형/오버레이
└── script.js    # 게임 상태, 이동 알고리즘, 입력 처리, 저장
```

3개 파일뿐. 빌드 단계, 번들러, 외부 라이브러리 없음. `index.html`을 그대로 열거나 정적 서버로 서빙하면 동작.

## 2. 게임 상태 & 이동 알고리즘

```js
const SIZE = 4;
let grid = [];   // grid[row][col] = 0(빈칸) 또는 2의 거듭제곱
let score = 0;
let best = 0;
let gameOver = false;
let won = false;
let keepPlayingAfterWin = false;
```

한 줄을 왼쪽으로 밀며 병합하는 함수 하나만 만들고, 모든 방향은 grid를 회전/반전시켜 재사용한다.

```js
function slideAndMergeLine(line) {
  let values = line.filter(v => v !== 0);
  let mergedScore = 0;
  const result = [];
  let i = 0;
  while (i < values.length) {
    if (i + 1 < values.length && values[i] === values[i + 1]) {
      const mergedValue = values[i] * 2;
      result.push(mergedValue);
      mergedScore += mergedValue;
      i += 2; // 병합된 타일은 같은 턴에 다시 병합되지 않음 (체인 병합 방지)
    } else {
      result.push(values[i]);
      i += 1;
    }
  }
  while (result.length < SIZE) result.push(0);
  return { line: result, scoreGained: mergedScore };
}
```

- `up` = transpose → 슬라이드 → transpose
- `down` = transpose → 행 반전 → 슬라이드 → 행 반전 → transpose
- `right` = 행 반전 → 슬라이드 → 행 반전
- `left` = 변환 없이 바로 슬라이드

이동 전/후 grid를 `JSON.stringify`로 비교해 실제로 움직였을 때만 새 타일 생성 + 점수 반영.

```js
function spawnRandomTile() {
  const empty = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4; // 90% 2, 10% 4
}
```

`initGame()`이 빈 grid를 만들고 `spawnRandomTile()`을 두 번 호출.

## 3. 입력 처리 (키보드 + 터치, 같은 move() 함수로 통합)

- 키보드: `ArrowUp/Down/Left/Right` → `move(direction)`, `preventDefault()`로 페이지 스크롤 방지.
- 터치: `touchstart`/`touchend`의 좌표 차이(dx, dy)로 스와이프 방향 판별, 임계값(30px) 미만은 탭으로 무시. 보드에 `touch-action: none`을 줘서 브라우저가 스와이프를 스크롤로 가로채지 않게 함.
- 두 입력 모두 동일한 `move()`를 호출하므로 로직 중복 없음.

## 4. 점수판

- `score`: 병합될 때마다 새로 생긴 타일 값만큼 증가 (표준 2048 규칙).
- `best`: `localStorage` 키 `"game2048-best-score"`에 저장, 현재 점수가 기록을 넘을 때만 갱신. 재시작해도 `best`는 유지, `score`만 0으로 리셋.
- UI: 헤더의 점수판에 `#score`, `#best-score` 표시.

## 5. 승리/패배 판정 & UI

```js
function checkWinCondition() {
  if (won || keepPlayingAfterWin) return;
  if (grid.some(row => row.includes(2048))) { won = true; showOverlay('win'); }
}

function checkLoseCondition() {
  if (grid.some(row => row.includes(0))) return;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (c + 1 < SIZE && grid[r][c + 1] === v) return;
      if (r + 1 < SIZE && grid[r + 1][c] === v) return;
    }
  gameOver = true;
  showOverlay('lose');
}
```

이동 처리 순서: 승리 체크 → 패배 체크(보드가 가득 찼어도 2048을 막 만들었으면 승리 오버레이가 우선).

- 오버레이(`#overlay`)에 메시지 + "다시 시작" 버튼, 승리 시에는 "계속하기" 버튼도 추가(2048 이후에도 이어서 플레이).
- 헤더에 상시 노출되는 "New Game" 버튼도 별도로 둔다.
- `gameOver`가 true인 동안(승리 후 "계속하기"를 누르지 않은 경우 제외) 키보드/터치 입력 무시.

## 6. 레이아웃

- `index.html` 구조: 제목 → 점수판(score/best 나란히) → New Game 버튼 → 안내 문구 → 4x4 보드(오버레이 포함).
- 보드는 CSS Grid(`repeat(4, 1fr)`), `width: min(90vw, 480px)`, `aspect-ratio: 1/1`로 작은 화면에서도 항상 정사각형 유지.
- 타일 색상은 2048 오리지널 팔레트(값이 커질수록 연한 베이지 → 주황 → 빨강/금색)를 그대로 사용해 사용자에게 친숙하게.
- 처음 구현은 애니메이션 없이 매 이동마다 셀을 다시 그리는 방식으로 시작(단순하고 요구사항 충족에 충분). 슬라이드 애니메이션은 후순위 폴리시로 남겨둠.

## 7. 수동 테스트 체크리스트

- 4방향 모두 정상 이동, 이동 불가능한 방향키는 무시(타일 생성/점수 변화 없음)
- `[2,2,4,4]` 왼쪽 슬라이드 → `[4,8,0,0]`, 점수 +12
- `[2,2,2,2]` 왼쪽 슬라이드 → `[4,4,0,0]` (체인 병합 안 됨 확인)
- 매 유효한 이동마다 새 타일 1개 생성 (2가 대부분, 가끔 4)
- 점수/최고점수 UI 갱신, 새로고침해도 최고점수 유지(`localStorage`), 새 게임 시 점수만 리셋
- 2048 타일 생성 시 승리 오버레이, "계속하기"로 이어서 플레이 가능
- 보드가 가득 차고 더 이상 병합 불가 시 패배 오버레이, 입력 무시
- New Game / 오버레이의 다시 시작 버튼 모두 정상 리셋
- 모바일(또는 devtools 터치 에뮬레이션)에서 스와이프로 조작, 페이지 스크롤 안 됨
- 키보드 방향키가 페이지 스크롤을 유발하지 않음
- `file://`로 `index.html`을 직접 열어도 동작 (빌드 불필요 확인), 콘솔 에러 없음, `apps/2048/` 바깥으로의 요청 없음(자체 완결성 확인)
