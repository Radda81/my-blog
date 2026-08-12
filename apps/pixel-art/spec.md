# spec: 픽셀 아트 에디터 (apps/pixel-art)

## 1. 파일 구성

```
apps/pixel-art/
├── index.html   # 제목, 캔버스+그리드 오버레이, 팔레트, 도구, 저장 버튼
├── style.css    # 레이아웃, 팔레트 스와치, 체크보드/그리드 오버레이, 반응형
└── script.js    # 데이터 모델, 캔버스 렌더링, 포인터 드로잉, PNG 내보내기
```

빌드 도구/외부 라이브러리 없음. `index.html`을 `file://`로 직접 열어도 동작.

## 2. 렌더링 방식: 단일 `<canvas>` (DOM 256분할 대신)

`<canvas id="pixel-canvas" width="16" height="16">` — width/height 속성으로 백킹 버퍼를 실제 16x16 픽셀로 고정하고, CSS로만 화면에 크게 표시한다.

이유:
- 히트 테스트: `col = Math.floor((clientX - rect.left) / (rect.width / 16))`로 간단히 계산.
- 드래그 연속성: 터치는 `touchmove` 이벤트의 target이 시작 요소에 고정되므로 DOM 그리드여도 좌표 계산이 필요 — 처음부터 캔버스 좌표 계산으로 통일하는 게 더 단순함.
- PNG 내보내기: 편집 캔버스가 곧 내보내기 소스이므로 별도의 변환/동기화 로직이 필요 없음. `canvas.toBlob()`을 그대로 사용.

## 3. 데이터 모델

```js
const SIZE = 16;
let pixels = new Array(SIZE * SIZE).fill(null); // null = 미채색(투명)
const idx = (r, c) => r * SIZE + c;
```

- **지우개 = 흰색이 아니라 투명.** PNG 알파 채널을 그대로 활용해 배경이 투명한 스프라이트를 만들 수 있게 한다.
- 칸을 칠할 때: `ctx.clearRect(c, r, 1, 1)` 후 색이 있으면 `ctx.fillRect(c, r, 1, 1)`. 16x16 버퍼라 앤티앨리어싱 없이 딱 떨어지는 픽셀이 그려짐.
- `pixels` 배열이 단일 소스(전체 지우기, 추후 디버깅 등에 사용).

## 4. 입력 처리: Pointer Events로 통합

```js
let isDrawing = false;
let lastCell = null;

canvas.addEventListener('pointerdown', e => {
  isDrawing = true;
  canvas.setPointerCapture(e.pointerId);
  const cell = cellFromEvent(e);
  paintCell(cell.r, cell.c);
  lastCell = cell;
  e.preventDefault();
});

canvas.addEventListener('pointermove', e => {
  if (!isDrawing) return;
  const cell = cellFromEvent(e);
  if (lastCell) paintLine(lastCell.r, lastCell.c, cell.r, cell.c);
  else paintCell(cell.r, cell.c);
  lastCell = cell;
});

['pointerup', 'pointercancel', 'pointerleave'].forEach(type =>
  canvas.addEventListener(type, () => { isDrawing = false; lastCell = null; })
);
```

- `cellFromEvent`는 좌표를 `[0,15]`로 clamp — 드래그가 캔버스 바깥으로 살짝 나가도 가장자리 칸이 계속 칠해짐.
- 빠른 포인터 이동으로 칸을 건너뛰는 걸 막기 위해 `paintLine`이 Bresenham 알고리즘으로 직전 칸과 현재 칸 사이 모든 칸을 채운다.
- 캔버스에 `touch-action: none` — 드로잉 중 스크롤/줌 제스처 방지.
- 지우개는 별도 코드 경로가 아니라 `currentColor = null`로 설정하는 팔레트 항목 중 하나로 취급 — `paintCell`/`paintLine` 로직 그대로 재사용.

## 5. 팔레트 UI

```js
const PRESET_COLORS = [
  '#000000', '#ffffff', '#7f7f7f', '#c3c3c3',
  '#ff0000', '#ff8000', '#ffe600', '#7ac74f',
  '#00a86b', '#00b7c3', '#0066ff', '#5b2a86',
  '#ff5fb6', '#8b5a2b', '#c69c6d', '#3b2f2f'
];
```

- `<button class="swatch" style="background:COLOR" data-color="COLOR">`로 렌더링, 클릭 시 `currentColor` 변경 + `.active` 클래스 토글(하나만 활성).
- 지우개 버튼: 체크보드 아이콘, 클릭 시 `currentColor = null`로 설정, 같은 방식으로 활성 표시.
- **전체 지우기** 버튼은 색상 선택 행과 분리, `confirm()`으로 확인 후 `pixels` 전체 초기화 + 캔버스 클리어.
- **커스텀 컬러 피커 포함**: `<input type="color">`를 팔레트 끝에 배치, `input` 이벤트로 `currentColor` 설정 + 프리셋 선택 해제. 현재 색상을 보여주는 작은 표시도 둔다.

## 6. PNG 내보내기

```js
exportBtn.addEventListener('click', () => {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixel-art.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
});
```

캔버스 백킹 버퍼가 이미 16x16이므로 별도 변환 없이 바로 내보내기. 미채색 칸은 `clearRect`만 되어 있어 알파 채널이 살아있는 진짜 투명 PNG가 나온다. 파일명: `pixel-art.png`.

## 7. 레이아웃

```html
<div class="canvas-wrap">
  <canvas id="pixel-canvas" width="16" height="16"></canvas>
  <div class="grid-overlay" aria-hidden="true"></div>
</div>
```

- `.canvas-wrap`: `width: min(94vw, 60vh, 420px); aspect-ratio: 1/1;` + 체크보드 배경(`repeating-conic-gradient`)으로 투명 영역을 화면에서만 표시(내보내기에는 포함 안 됨).
- `#pixel-canvas`: `position: absolute; inset: 0; width/height: 100%; image-rendering: pixelated;` (`-moz-crisp-edges` 폴백) — 확대해도 픽셀 경계가 또렷하게. `touch-action: none`도 여기.
- `.grid-overlay`: `position: absolute; inset: 0; pointer-events: none;` + 1px 격자선 배경 — 탭 정확도를 위한 시각 보조선. `pointer-events: none`이라 입력은 그대로 캔버스로 전달되고, 비트맵에도 섞이지 않음.
- 페이지 순서: 제목 → 안내문 → 캔버스 → 팔레트(+ 지우개 + 커스텀 컬러) → 전체 지우기 버튼 → PNG로 저장 버튼(하단, 전체 너비).
- 반응형: `min(94vw, 60vh, 420px)`로 좁은/짧은 화면 모두 대응. 2048과 달리 `user-scalable=no`로 페이지 줌을 막지 않는다 — 캔버스의 `touch-action: none`만으로 드로잉 중 스크롤/줌은 이미 막히고, 나머지 영역에서는 사용자가 정밀 확인을 위해 핀치줌을 쓸 수 있게 둔다.
- 팔레트 스와치는 최소 40x40px 탭 타겟, flex-wrap으로 좁은 화면에서 줄바꿈.
- UI 텍스트(한국어): 제목 "픽셀 아트 에디터", 안내문 "클릭/드래그로 칸을 칠하세요. 지우개로 지울 수 있어요.", 버튼 "전체 지우기", "PNG로 저장".

## 8. 수동 테스트 체크리스트

- 마우스 클릭으로 칸 하나 칠하기 / 터치 탭으로 칸 하나 칠하기
- 마우스 드래그로 이어 칠하기(느리게/빠르게 움직여도 중간 칸이 안 빠짐), 터치 드래그도 동일
- 드래그가 캔버스 바깥으로 살짝 나가도 가장자리 칸이 계속 칠해짐(pointer capture)
- 팔레트 색상 전환 시 이후 스트로크에만 반영, 기존 칠한 칸은 유지
- 지우개로 칠한 칸을 지우면 흰색이 아니라 투명(체크보드가 비쳐 보임)
- 전체 지우기: 확인창 → 확인 시 전체 초기화, 취소 시 유지
- 커스텀 컬러 피커로 고른 색이 정상적으로 칠해짐
- PNG로 저장한 파일이 정확히 16x16 픽셀이고, 칠한 색이 정확하며, 미채색 칸은 알파가 있는 투명(흰색 아님)
- 모바일 뷰포트(375px)에서 캔버스/팔레트/저장 버튼이 가로 스크롤 없이 보이고 칸을 탭하기 충분히 큼
- `file://`로 직접 열어도 동작, 콘솔 에러 없음, `apps/pixel-art/` 바깥으로의 요청 없음, 블로그 src/나 apps/2048/에 의존하지 않음
