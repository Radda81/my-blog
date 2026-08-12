# Review: apps/pixel-art

리뷰 대상: `index.html`, `style.css`, `script.js` (spec.md 대비 검증)
리뷰 방식: 코드 대조 + 로컬 정적 서버(Node.js, `http://localhost:8790`)로 실제 브라우저(Chromium 기반 Browser pane)에서 동작 검증. 정밀 검증이 필요한 항목(드래그 연속성, 지우개 투명도, PNG 알파 채널 등)은 페이지 컨텍스트에서 실제 `PointerEvent`를 디스패치하고 `canvas.getImageData()` / 캡처한 export `Blob`을 직접 디코드해 픽셀 단위로 확인.

## 코드 대조 결과

- **캔버스 백킹 버퍼**: `<canvas id="pixel-canvas" width="16" height="16">` — width/height 속성으로 실제 16x16 고정, CSS(`width/height:100%`)로만 화면 확대. 사양과 일치.
- **`paintCell`**: `ctx.clearRect(c,r,1,1)` 후 `currentColor`가 truthy일 때만 `fillRect`. 지우개(`currentColor = null`)는 clearRect만 실행되어 진짜 투명 처리. 별도 지우개 코드 경로 없이 동일 함수 재사용 — 사양과 일치.
- **`paintLine`**: 정수 Bresenham 구현, `lastCell`과 현재 cell 사이를 모두 채움 — 로직 확인 결과 정상.
- **좌표 clamp**: `cellFromEvent`에서 `clamp(..., 0, SIZE-1)`로 [0,15] 고정 — 캔버스 밖으로 나가도 가장자리 셀 유지.
- **Pointer Events**: `pointerdown`에서 `setPointerCapture` + `paintCell`, `pointermove`에서 `isDrawing` 체크 후 `paintLine`, `pointerup/cancel/leave`에서 상태 리셋 — 사양 코드와 완전히 일치.
- **팔레트/지우개/커스텀 컬러**: `renderPalette`가 16개 프리셋 버튼을 생성하고 지우개 버튼 앞에 삽입, `setActiveSwatch`로 단일 활성 표시. 커스텀 컬러는 `<input type="color">`의 `input` 이벤트로 `currentColor` 갱신.
- **전체 지우기**: `window.confirm(...)`으로 게이트, 취소 시 조기 반환, 확인 시 `pixels` 재초기화 + `ctx.clearRect(0,0,SIZE,SIZE)`.
- **PNG 내보내기**: `canvas.toBlob(..., 'image/png')` → Blob URL → 임시 `<a download>` 클릭 → revoke. 별도 변환 없이 편집 캔버스를 그대로 내보냄.
- **레이아웃/반응형**: `.canvas-wrap { width: min(94vw, 60vh, 420px); aspect-ratio: 1/1 }`, 스와치 `40x40px` 최소 크기, `flex-wrap`, 체크보드 배경(`repeating-conic-gradient`), 그리드 오버레이는 `pointer-events:none`. `apps/pixel-art/` 외부 리소스 참조 없음(상대경로 `style.css`, `script.js`만 사용).

코드는 spec.md와 사실상 1:1로 일치하며 구조적 문제를 발견하지 못했다.

## 브라우저 동작 검증

로컬 서버(`http://localhost:8790`)로 서빙 후 아래 항목을 실제 페이지에서 확인:

| 항목 | 결과 |
|---|---|
| 단일 클릭으로 칸 하나 칠하기 | 통과 — `pointerdown`+`pointerup`으로 지정 셀만 정확히 `rgba(0,0,0,255)`로 채워짐 |
| 느린 드래그 (한 셀씩 이동) | 통과 — 실 기기 클릭 테스트에서 연속된 경로가 끊김 없이 칠해짐 확인 |
| 빠른/점프성 드래그 (중간 좌표 스킵) | 통과 — `pointerdown(0,0)` → 중간 이벤트 없이 바로 `pointermove(0,15)` 한 번만 발생시켜도 0~15열 16칸 전부 alpha=255로 채워짐(가로/대각선 양쪽 모두 확인). Bresenham이 정상적으로 중간 셀을 보간함 |
| 팔레트 색 전환 | 통과 — 빨강으로 전환 후 새 셀만 빨강, 이전에 칠한 검정 셀은 그대로 유지됨 |
| 캔버스 경계 밖 clamp | 통과 — 캔버스 좌상단 바깥(-50,-50), 우하단 바깥(+50,+50) 좌표로 pointerdown해도 각각 (0,0), (15,15) 셀이 clamp되어 칠해짐 |
| 지우개 | 통과 — 이전에 칠한 대각선 셀들을 지우개로 드래그하니 전부 `alpha=0`(흰색이 아니라 완전 투명), 지우지 않은 다른 셀(빨강)은 그대로 유지 |
| 커스텀 컬러 피커 | 통과 — `#123456` 설정 후 칠한 셀이 정확히 `rgb(18,52,86)`, 활성 표시도 커스텀 스와치로 이동 |
| 전체 지우기 확인창 | 통과 — `confirm()` 메시지 "전체 그림을 지울까요? 이 작업은 되돌릴 수 없습니다." 노출 확인. `confirm()`이 `false`를 반환하면(취소) 그림이 그대로 유지되고, `true`를 반환하면(확인) 캔버스 전체가 alpha=0으로 초기화됨 |
| PNG 내보내기 | 통과 — export 버튼 클릭으로 생성된 실제 `Blob`(`image/png`, 127 bytes)을 가로채 IHDR에서 width=16, height=16 확인. `createImageBitmap`으로 디코드해 픽셀 검사한 결과: 칠한 셀(검정, 파랑)은 alpha=255로 정확한 색상, 미채색 셀은 alpha=0(투명, 흰색 아님) — 알파 채널이 살아있는 진짜 투명 PNG로 확인 |
| 모바일 뷰포트(375px) | 통과 — `scrollWidth === clientWidth === 375` (가로 스크롤 없음), 모든 스와치(18개)가 최소 40x40px 유지, 캔버스/팔레트/버튼 모두 화면 내 표시 |
| 콘솔 에러 | 실 사용 경로에서는 에러 없음 (아래 참고) |

### 콘솔 에러에 대한 참고

검증 중 자동화 도구가 발급한 임의의 합성 `pointerId`(예: `2`)로 `PointerEvent`를 디스패치했을 때 `setPointerCapture`가 `NotFoundError`를 던진 사례가 있었다. 이는 실제 마우스/터치 입력이 항상 유효한 `pointerId`(마우스는 통상 `1`, 터치는 브라우저가 할당하는 실 ID)를 가지는 것과 달리, 스크립트로 임의 ID를 만든 합성 이벤트라서 브라우저가 "활성 포인터 없음"으로 판단해 발생한 테스트 아티팩트다. 실제 클릭/터치 테스트(유효한 pointerId=1 사용, 그리고 실기기 클릭 테스트)에서는 해당 에러가 전혀 발생하지 않았고 정상 동작했다. 앱 코드 자체의 결함이 아니므로 수정하지 않았다.

## 수정 사항

발견된 실제 버그 없음 — 코드 수정 없이 검증만 완료.

## 최종 결론

`apps/pixel-art`는 spec.md에 정의된 모든 동작(캔버스 16x16 백킹 버퍼, 클릭/드래그 페인팅, Bresenham 라인 보간을 통한 빠른 드래그 무결점 채우기, 좌표 clamp, 팔레트/커스텀 컬러, 지우개의 진짜 투명 처리, confirm 게이트된 전체 지우기, 알파 채널이 살아있는 16x16 PNG 내보내기, 모바일 반응형 레이아웃)이 정상 동작함을 확인했다. 콘솔 에러 없음(실사용 경로), 외부 리소스 의존 없음, `apps/pixel-art/` 폴더 안에서 완결됨.

**출시 가능 (Ready to ship).**
