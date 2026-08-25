# Review — 픽셀 아트 에디터 (Pixel Art Editor)

검증 대상: `apps/pixel-art-editor/index.html`, `style.css`, `script.js`
검증 도구: Playwright (Chromium, `/opt/pw-browsers/chromium`) + 로컬 `python3 -m http.server 8899`
검증 일자: 2026-08-25

## 1. 브라우저 실제 동작 확인 (Playwright)

총 26개 자동 검증 항목, **26/26 통과**(수정 1건 반영 후).

| 항목 | 결과 |
|---|---|
| 16x16 캔버스 렌더링 (480x480 표시 크기) | 통과 |
| 팔레트 클릭 → `aria-pressed="true"` 갱신 | 통과 |
| 캔버스 클릭으로 실제 픽셀에 색 채워짐 (getImageData로 RGBA 직접 확인) | 통과 |
| 드래그로 연속된 여러 셀이 칠해짐 (pointermove) | 통과 |
| 지우개 버튼 클릭 → `aria-pressed="true"`, 칠해진 셀이 지워짐(체크보드로 복귀) | 통과 |
| 전체 지우기 → `window.confirm` 다이얼로그 발생 및 승인 시 전체 초기화 | 통과 |
| 커스텀 색상 선택기(`input[type=color]`)로 정확한 색이 칠해짐 | 통과 |
| 팔레트/커스텀 선택 시 지우개 모드 자동 해제 | 통과 |
| PNG 저장 버튼 → 실제 다운로드 이벤트 발생, 파일 생성(3378 bytes) | 통과 |
| PNG 파일 포맷 검증: 320x320(16×20 EXPORT_SCALE), colorType=6(트루컬러+알파) | 통과 |
| PNG 투명도 검증: 안 칠한 코너 픽셀 RGBA=(0,0,0,0), 칠한 셀은 불투명 | 통과 |
| 모바일 뷰포트(375x667) 레이아웃: 캔버스가 뷰포트 내 정상 표시, 가로 스크롤 없음(scrollWidth=375) | 통과 |
| 모바일 터치(`page.touchscreen.tap`)로 실제 그리기 동작 | 통과 |
| 터치 타깃 크기(스와치/버튼/커스텀 색상) 모두 40x40px 이상 | 통과 |
| 다크모드(`prefers-color-scheme: dark`) 렌더링 및 콘솔 에러 없음 | 통과 (스크린샷으로 레이아웃/가독성 육안 확인 완료) |
| 키보드 포커스: 스와치/도구 버튼이 `<button>`으로 포커스 가능 | 통과 |
| 콘솔 에러 (데스크톱/모바일/다크모드 각각) | 통과 — 유일하게 잡힌 항목은 브라우저가 자동 요청하는 `/favicon.ico` 404이며, 이는 spec.md 3항 "파비콘은 자체 완결 원칙상 생략한다"에 따른 의도된 결과로 앱 코드와 무관한 브라우저 기본 동작임(콘솔 에러로는 표시되나 페이지 기능에 영향 없음). |

## 2. 코드 리뷰

- **spec.md 요구사항 대조**: 3.1~3.10 전 항목이 실제 코드에 구현되어 있음을 확인.
  - Canvas 기반 렌더링, devicePixelRatio 대응, `imageSmoothingEnabled=false` — 구현됨 (`script.js` setupCanvas).
  - 체크보드로 투명 셀 표시, 편집용 캔버스에만 격자선 — 구현됨 (`render`, `drawCheckerboard`).
  - Pointer Events 통합 처리(`pointerdown/move/up/cancel/leave`) + `setPointerCapture`로 캔버스 밖 드래그까지 안전 처리 — 구현됨, `getCellFromEvent`가 범위를 벗어나면 `null` 반환해 무시함.
  - 지우개/전체지우기(confirm)/커스텀 색상/PNG 내보내기(오프스크린 캔버스, EXPORT_SCALE=20, `toBlob` + 임시 `<a>` 다운로드 + `revokeObjectURL`) — 모두 spec 그대로 구현됨.
  - 반응형(`min(90vw, 480px)`), 터치 타깃 40px 이상, `touch-action:none`, 다크모드 CSS 변수 — 구현됨.
  - `back-link`로 `../../index.html` 복귀 링크 — 구현됨.
- **자체 완결 원칙**: `apps/pixel-art-editor/` 폴더 내 3개 파일(`index.html`, `style.css`, `script.js`)에 외부 라이브러리/CDN 스크립트나 블로그 본체(`js/theme.js`, `css/style.css` 등) 참조가 전혀 없음을 grep으로 확인. 블로그 본체 파일은 이번 Review에서 손대지 않음.
- **접근성**: 팔레트 스와치에 `aria-label`+`aria-pressed`, 지우개 버튼에 `aria-pressed`, 커스텀 색상 input에 `aria-label`, 모든 조작 요소가 네이티브 `<button>`/`<input>`이라 키보드 포커스 및 Enter/Space 조작 가능. `:focus-visible` 아웃라인 스타일도 존재.
- **엣지 케이스**: 캔버스 밖으로 드래그해도 `getCellFromEvent`가 `null`을 반환해 무시되고, `setPointerCapture`로 포인터가 캔버스 밖으로 나가도 이벤트 유실 없이 계속 추적됨. 빠른 연속 클릭/드래그는 `paintCell`에서 동일 셀 재기록을 스킵하는 최적화만 있고 별도 문제 없음.

## 3. 발견한 문제와 조치

### 수정함 — 커스텀 색상 선택 시 "현재 선택됨" 시각 표시 누락 (사소)
- spec.md 3.4: "커스텀 색상 스와치 자체도 '현재 선택됨' 상태로 표시한다"는 요구가 있었으나, 기존 코드는 `input` 이벤트에서 `currentColor`만 갱신하고 프리셋 스와치의 `aria-pressed`만 해제할 뿐, 커스텀 색상 선택기 자체에는 별도의 "선택됨" 시각 표시가 없었음.
- `apps/pixel-art-editor/style.css`에 `.custom-color-label.active` 규칙(스와치 선택 시와 동일한 `box-shadow` 강조) 추가.
- `apps/pixel-art-editor/script.js`: 커스텀 색상 `input` 이벤트에서 `.active` 클래스를 추가하고, 프리셋 스와치 클릭 또는 지우개 클릭 시 `.active` 클래스를 제거하도록 수정.
- 수정 후 Playwright로 재검증: 커스텀 색상 사용 시 `.custom-color-label`에 `active` 클래스가 붙고, 스와치를 다시 클릭하면 해제되는 것을 확인함.

### 문제 없음으로 확인 (테스트 스크립트상 오탐이었던 항목)
- 최초 자동 테스트에서 "지우개/전체지우기 후 알파채널이 0이어야 한다"는 잘못된 가정으로 2건이 FAIL로 표시되었으나, 이는 spec.md 3.2에 명시된 대로 편집용 캔버스는 빈 칸을 **불투명 체크보드 패턴**으로 그리도록 설계되어 있어(투명은 PNG 내보내기에서만 적용) 앱 동작 자체는 정상이었음. 색상이 지정색(예: 빨강)에서 체크보드 색으로 바뀐 것을 확인해 지우기/전체지우기가 실제로 동작함을 재확인함. 코드 수정 없음.
- `favicon.ico` 404 콘솔 에러는 spec.md에 명시된 의도적 생략(자체 완결 원칙)에 따른 브라우저 기본 요청이며 앱 버그가 아님. 코드 수정 없음.

### 구조적 문제
- 없음.

## 4. 최종 결론

**배포(Embed) 가능.**

기능 요구사항, 반응형/모바일 터치, 다크모드, PNG 내보내기(투명도 포함), 접근성 요건 모두 실제 브라우저에서 정상 동작을 확인했다. 발견된 유일한 사소한 spec 불일치(커스텀 색상 선택 시각 표시 누락)는 `apps/pixel-art-editor/` 폴더 내에서 직접 수정 완료했다. 블로그 본체 파일 및 다른 앱 폴더는 변경하지 않았다. Embed 단계(블로그 `index.html`에 카드 추가 + git 커밋) 진행해도 좋다.
