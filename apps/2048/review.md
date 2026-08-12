# Review: apps/2048

검토일: 2026-08-12
검토자: Review 서브에이전트 (독립 검증, Build 에이전트와 분리)

## 검토 범위

`apps/2048/index.html`, `style.css`, `script.js`를 `spec.md`와 대조하고, 로컬 정적 서버(Node.js 내장 http 모듈, 임시 스크립트는 스크래치 디렉터리에 작성 — `apps/2048/` 안에는 두지 않음, 포트 8099)로 서빙하여 Claude Browser 도구로 실제 브라우저 동작을 검증했다.

## 코드 검토 결과

- **슬라이드/병합 알고리즘(`slideAndMergeLine`)**: spec.md의 구현을 그대로 사용. `i += 2`로 병합된 결과가 같은 턴에 다시 병합되지 않도록 방지하는 로직이 정확히 구현되어 있음을 확인.
- **방향 처리(`moveGrid`)**: `up`=transpose→slide→transpose, `down`=transpose→reverse→slide→reverse→transpose, `right`=reverse→slide→reverse, `left`=slide만. spec과 일치.
- **유효하지 않은 이동 감지**: `JSON.stringify(grid)` 전/후 비교로 실제 이동 여부를 판단, 변화 없으면 `spawnRandomTile()`과 점수 반영을 건너뜀. 정확히 구현됨.
- **점수 계산**: 병합될 때 생성된 타일 값만큼 `score`에 가산, 표준 2048 규칙과 일치.
- **최고점수**: `localStorage` 키 `"game2048-best-score"`에 저장, `score > best`일 때만 갱신. `initGame()`은 `score`만 리셋하고 `best`는 유지. spec과 일치.
- **승리/패배 판정**: `checkWinCondition()` → `checkLoseCondition()` 순서로 호출. `checkLoseCondition()`에 `if (won && !keepPlayingAfterWin) return;` 가드가 있어, 같은 이동에서 승리와 패배 조건이 동시에 성립하더라도 승리 오버레이가 우선하도록 보장함(spec 5절 "보드가 가득 찼어도 2048을 막 만들었으면 승리 오버레이가 우선"을 정확히 만족). 이 가드는 spec.md의 의사코드에는 명시적으로 없었지만 실제 구현에 추가되어 있었고, 브라우저 테스트로 의도대로 동작함을 확인함(아래 참고).

## 브라우저 실동작 검증

로컬 서버(`http://localhost:8099`)로 서빙 후 Claude Browser 도구(`computer`, `javascript_tool`, `read_console_messages`, `read_network_requests`, `resize_window`)로 아래 항목을 실제로 조작하며 확인했다.

1. **단위 테스트(알고리즘)**: 실행 중인 페이지에서 `fetch('/script.js')`로 실제 소스를 가져와 `slideAndMergeLine` 함수 텍스트를 추출·격리 실행하여 케이스별 검증:
   - `[2,2,2,2]` → `[4,4,0,0]`, score +8 (체인 병합 방지 확인) — PASS
   - `[2,2,4,4]` → `[4,8,0,0]`, score +12 — PASS
   - `[2,0,2,0]`, `[4,4,4,0]`, 빈 줄, 병합 불가 줄 등 6개 케이스 모두 PASS
2. **4방향 이동(실제 키 입력)**: `ArrowLeft/Right/Up/Down` 키 이벤트를 실제로 전송하여 타일 이동·병합·새 타일 생성을 좌표 단위로 확인. 모두 예상대로 동작.
   - 참고: Claude Browser `computer` 도구의 `key` 액션에는 정확한 키 이름(`"ArrowLeft"` 등)을 넘겨야 하며, `"Left"` 같은 축약 이름은 페이지의 `keydown` 리스너에 도달하지 않아 아무 동작도 하지 않았다(테스트 도구 사용법 이슈이며 게임 코드의 결함 아님).
3. **유효하지 않은 이동**: 더 이상 이동할 수 없는 방향으로 같은 키를 다시 눌렀을 때 타일 배치·점수 모두 불변임을 확인.
4. **점수/최고점수 UI 갱신**: 이동마다 `#score`, `#best-score` 텍스트가 정확히 갱신됨을 확인.
5. **최고점수 localStorage 지속성**: 점수 12를 만든 뒤 페이지를 새로고침 → `#best-score`가 12로 유지되고 `#score`는 0으로 리셋됨을 확인. `localStorage.getItem('game2048-best-score')` 값도 일치.
6. **New Game / 다시 시작 버튼**: 실제 자연 진행으로 패배 상태(보드 가득 참, 병합 불가, 4x4 grid 직접 검증하여 "가짜 패배"가 아님을 확인)에 도달시킨 뒤, 오버레이의 "다시 시작" 버튼을 실제 클릭 → score만 0으로 리셋되고 best는 유지, 오버레이 숨김, 새 타일 2개 생성됨을 확인.
7. **입력 무시**: 패배 상태에서 `ArrowLeft` 입력 시 점수·타일이 전혀 변하지 않음을 확인(입력이 정상적으로 무시됨).
8. **승리 오버레이 및 계속하기**: (아래 "테스트 방법" 참고) `1024+1024` 병합으로 2048 타일을 만들어 승리 오버레이("승리했습니다!")가 뜨고 "계속하기" 버튼이 노출됨을 확인. "계속하기" 클릭 후 `keepPlayingAfterWin=true`로 전환되고 오버레이가 사라지며 이후 입력이 정상적으로 다시 동작함을 확인.
9. **승리 우선순위**: 보드가 가득 차 있고(4x4 전부 채움) 더 이상 병합 불가능한 상태이면서 2048 타일이 포함된 그리드를 주입해 `checkWinCondition()` → `checkLoseCondition()` 순서로 호출했을 때, `gameOver`는 `false`로 남고 오버레이는 "승리했습니다!"를 표시함을 확인 — spec의 "승리 오버레이 우선" 규칙이 정확히 지켜짐.
10. **패배 오버레이(정상 플레이)**: 실제 키 입력을 반복 전송해 자연스럽게 게임을 진행시킨 결과 161수 만에 보드가 가득 차고(4x4=16칸) 인접 동일값이 전혀 없는 상태에서 "게임 오버" 오버레이가 표시됨을 확인(그리드를 직접 읽어 조건을 재검증하여 오탐이 아님을 확인).
11. **터치/스와이프**: `TouchEvent`/`Touch`를 이용해 실제 `touchstart`/`touchend` 리스너에 이벤트를 전달하여 다음을 확인:
    - 우측으로 임계값(30px) 이상 스와이프 → 오른쪽 이동 발생(타일이 실제로 오른쪽 컬럼으로 이동, 새 타일 생성)
    - 임계값 미만(10px)의 짧은 터치 → 탭으로 무시되어 아무 변화 없음
12. **모바일 뷰포트(375px)**: `resize_window(preset: mobile)` 후 `document.documentElement.scrollWidth`(375) vs `window.innerWidth`(375) 비교 결과 가로 오버플로 없음. 보드는 337.79×337.79px의 정사각형으로 정상 렌더링, 스크린샷으로도 레이아웃 붕괴 없음을 육안 확인.
13. **콘솔 에러**: 전 과정에서 `read_console_messages`로 확인한 결과 에러/경고 없음.
14. **자체 완결성**: `read_network_requests`로 확인한 결과 모든 요청이 `localhost:8099`(서빙 루트)의 `index.html`, `style.css`, `script.js`뿐이며 외부 요청 없음.

### 테스트 방법에 관한 메모(중요)

`grid`, `won`, `checkWinCondition` 등은 `script.js`의 IIFE 클로저 내부에 있어 외부에서 직접 접근할 수 없다. 승리/패배 조건의 정밀 테스트(9, 10번 일부)를 빠르게 재현하기 위해, review.md 작성 지침에서 허용한 대로 `script.js`에 임시 테스트 훅(`window.__test = { setGrid, getGrid, checkWin, checkLose, getState }`)을 **일시적으로** 추가했다가, 테스트가 끝난 뒤 **완전히 제거**하고 원본과 동일한 상태로 복원했다. 제거 후 재검증(콘솔 에러 없음, `window.__test`가 `undefined`, 정상 이동 동작)을 완료했다. 최종적으로 배포되는 `script.js`에는 테스트 훅이 전혀 남아있지 않다.

## 발견된 문제 및 수정 여부

**발견된 실질적 버그 없음.** 코드는 spec.md의 사양을 정확하게 구현하고 있으며, 위 14개 항목의 실제 브라우저 검증을 모두 통과했다. 코드를 수정할 필요가 없었으므로 `apps/2048/index.html`, `style.css`, `script.js`는 검토 시작 시점과 동일한 상태로 유지된다(테스트를 위해 `script.js`에 임시로 추가했던 디버그 훅은 검증 완료 후 원상 복구함).

사소한 관찰(버그는 아니며 수정하지 않음):
- 키보드 `keydown` 리스너가 `document`에 전역으로 걸려 있어, 오버레이의 버튼에 포커스가 있는 상태에서도 방향키 입력이 `preventDefault()`되어 페이지 스크롤을 막는다. 게임 특성상 자연스러운 동작이며 spec에서 요구하는 "방향키가 페이지 스크롤을 유발하지 않음"과 부합한다.
- `localStorage` 접근이 예외적으로 실패하는 환경(일부 `file://` 보안 정책 등)에 대비해 `try/catch`로 게임이 계속 동작하도록 방어 코드가 있음 — spec에 없는 추가적인 견고성으로, 긍정적인 부분.

## 최종 결론

**정상 동작. 배포 준비 완료(ready to ship).**

- 이동/병합/체인 병합 방지 알고리즘 정확
- 4방향 키보드 입력, 터치 스와이프 입력 모두 정상 동작
- 유효하지 않은 이동에서 타일 미생성·점수 불변 확인
- 점수/최고점수 UI 갱신 및 `localStorage` 지속성 확인
- 승리(2048)/패배(더 이상 이동 불가) 오버레이 및 우선순위 규칙 정확
- New Game / 다시 시작 / 계속하기 버튼 모두 정상 동작
- 모바일 뷰포트(375px)에서 레이아웃 깨짐 없음
- 콘솔 에러 없음, 외부 요청 없이 자체 완결적
