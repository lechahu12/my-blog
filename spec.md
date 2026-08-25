# 픽셀 아트 에디터 — 구현 계획 (spec.md)

## 1. 웹앱 개요

- **이름**: 픽셀 아트 에디터 (Pixel Art Editor)
- **설명**: 16x16 격자에 도트를 찍어 그림을 그리는 미니 웹앱. 색상 팔레트에서 원하는 색을 골라 칠하고, 완성한 그림을 PNG 파일로 다운로드할 수 있다. 마우스 클릭/드래그는 물론 모바일 터치로도 그릴 수 있다.
- **핵심 기능 목록**:
  1. 16x16 격자 렌더링 (Canvas 기반)
  2. 색상 팔레트 선택 (기본 제공 색상 + 커스텀 색상 선택기)
  3. 클릭/드래그(마우스) 및 터치 드래그(모바일)로 연속 칠하기
  4. 지우개 도구
  5. 전체 지우기(Clear)
  6. PNG로 저장(다운로드), 실제 보기 좋은 크기로 확대 렌더링
  7. 반응형 레이아웃 + 다크모드
- **자체 완결 원칙**: 블로그 본체(`index.html`, `css/style.css`, `js/*.js`, `posts/*`)는 이번 Build 단계에서 건드리지 않는다. `/apps/pixel-art-editor/` 폴더 안에서만 모든 리소스(HTML/CSS/JS)를 자체적으로 로드한다.

## 2. 파일 구조

```
apps/
└── pixel-art-editor/
    ├── index.html      # 에디터 페이지 (캔버스 + 팔레트 + 도구 버튼 마크업)
    ├── style.css        # 앱 전용 스타일 (레이아웃, 팔레트 UI, 반응형, 다크모드)
    └── script.js        # 그리기 로직 (격자 상태 관리, 입력 처리, 렌더링, PNG 내보내기)
```

- 외부 이미지/폰트/아이콘 파일은 필요 없다. 파비콘은 자체 완결 원칙상 생략한다.
- 2048과 동일하게 앱 하나당 HTML/CSS/JS 3파일 최소 구성으로 충분하다(script.js 약 150~250줄 예상).

## 3. 기능 상세 설계

### 3.1 데이터 모델

- 그림 상태는 `grid`라는 16x16 2차원 배열(`Array(16).fill(null).map(() => Array(16).fill(null))`)로 관리한다.
- 각 셀의 값은 `null`(빈 칸/투명) 또는 CSS 색상 문자열(`"#ff0000"` 등)이다.
- 화면 렌더링과 PNG 내보내기 모두 이 `grid` 배열을 유일한 소스(source of truth)로 삼아 그린다.

### 3.2 격자 렌더링 방식: Canvas API

- HTML div 격자(256개 DOM 요소) 대신 **단일 `<canvas id="editor-canvas">` 하나**로 16x16 격자를 그린다. Canvas API만으로 요구사항을 충분히 충족하며, PNG 내보내기도 캔버스 기반이라 구조가 일관된다.
- **표시 크기(반응형)**: `<canvas>`는 CSS로 `width: min(90vw, 480px); height: auto; aspect-ratio: 1 / 1;`처럼 반응형으로 스케일링한다.
- **내부 해상도(선명도)**: 실제 캔버스 백킹 스토어 크기는 `devicePixelRatio`를 곱한 값으로 설정하고(`canvas.width = displaySize * dpr`), `ctx.scale(dpr, dpr)`로 좌표계를 CSS 픽셀 기준으로 맞춘다. `ctx.imageSmoothingEnabled = false`로 설정해 픽셀이 뭉개지지 않게 한다.
- **셀 렌더링**: `cellSize = displaySize / 16`. 매 프레임(또는 변경 시마다) `grid` 배열을 순회하며:
  - 값이 색상이면 `ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)`로 채운다.
  - 값이 `null`(빈 칸)이면 **체크보드 패턴**(연한 회색 두 톤을 셀 내부에 2x2로 교차 배치)을 그려 "투명"임을 시각적으로 표시한다.
  - 셀 사이에 얇은 격자선(연한 회색 1px)을 그려 칸 구분을 돕는다. 이 격자선은 **편집용 캔버스에만** 그리고, PNG 내보내기용 캔버스에는 그리지 않는다.

### 3.3 좌표 변환 (마우스/터치 공통)

- `canvas.getBoundingClientRect()`로 실제 화면상 표시 영역(`rect`)을 구하고, 포인터의 `clientX/clientY`를 `rect` 기준 상대 좌표로 변환한 뒤 `rect.width / 16`으로 나눠 몇 번째 행/열인지 계산한다.
- 계산된 인덱스가 0~15 범위를 벗어나면 무시한다.

### 3.4 색상 팔레트 UI

- 기본 제공 색상: 레트로 픽셀아트에 흔히 쓰이는 16색 팔레트를 버튼 그리드로 배치한다.
  ```
  #000000 (검정), #ffffff (흰색), #808080 (회색), #c0c0c0 (연회색),
  #ff0000 (빨강), #ff8000 (주황), #ffff00 (노랑), #00ff00 (초록),
  #008000 (진초록), #00ffff (하늘), #0000ff (파랑), #000080 (남색),
  #800080 (보라), #ff00ff (자홍), #ffc0cb (분홍), #8b4513 (갈색)
  ```
- 각 색상은 `<button class="swatch" style="background:<색상>" data-color="<색상>" aria-label="...">`로 구현하고, 클릭 시 `currentColor`를 갱신하며 선택된 스와치에 강조 테두리(`aria-pressed="true"` + 시각적 outline)를 표시한다.
- **커스텀 색상 선택기**: `<input type="color" id="custom-color">`를 팔레트 옆에 배치한다. 값이 바뀌면(`input` 이벤트) 해당 색을 `currentColor`로 설정하고, 커스텀 색상 스와치 자체도 "현재 선택됨" 상태로 표시한다.
- 팔레트 선택 시 자동으로 도구는 "그리기" 모드로 전환된다(지우개 모드였다면 해제).

### 3.5 그리기 인터랙션 (마우스 + 터치 공통, Pointer Events 사용)

- 마우스/터치를 분기 처리하지 않고 **Pointer Events**(`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `pointerleave`)로 통합 처리한다.
- `pointerdown`: 그리기 시작 플래그(`isDrawing = true`)를 켜고, 눌린 지점의 셀을 즉시 칠한다(도구가 지우개면 지운다).
- `pointermove`: `isDrawing`이 true인 동안, 현재 포인터 위치의 셀 인덱스를 계산해 직전에 칠한 셀과 다르면 새로 칠한다.
- `pointerup` / `pointercancel` / `pointerleave`: `isDrawing = false`로 종료.
- 캔버스에 `style="touch-action: none;"`을 지정해 모바일에서 드래그 시 페이지 스크롤이 함께 발생하지 않도록 한다.
- 한 번 칠할 때마다 `grid` 배열을 갱신하고 캔버스를 다시 그린다.

### 3.6 지우개 기능

- 도구 상태를 `currentTool: 'draw' | 'erase'`로 관리한다.
- "지우개" 버튼(`<button id="eraser-btn" aria-pressed="false">`)을 팔레트 영역에 배치. 클릭 시 `currentTool = 'erase'`로 전환하고 버튼에 활성 스타일(`aria-pressed="true"`)을 준다.
- 지우개 모드에서 칠하기 동작(`pointerdown`/`pointermove`)은 `grid[row][col] = null`로 설정한다.
- 색상 스와치나 커스텀 색상 선택기를 다시 선택하면 자동으로 `currentTool = 'draw'`로 복귀한다.

### 3.7 전체 지우기(Clear) 기능

- "전체 지우기" 버튼 클릭 시 `grid` 전체를 `null`로 초기화하고 캔버스를 다시 그린다.
- 실수로 인한 작업 손실을 막기 위해 `window.confirm("전체 지우시겠습니까?")` 확인 후 실행한다.

### 3.8 PNG로 저장(다운로드)

- 16x16 원본 해상도를 그대로 내보내면 이미지가 너무 작으므로, **별도의 오프스크린(화면에 붙지 않는) `<canvas>`** 를 만들어 확대 배율(`EXPORT_SCALE`, 기본값 20 → 320x320px 이미지)로 렌더링한다.
- 절차:
  1. `const exportCanvas = document.createElement('canvas')`로 DOM에 붙지 않는 캔버스 생성.
  2. `exportCanvas.width = exportCanvas.height = 16 * EXPORT_SCALE`.
  3. `ctx.imageSmoothingEnabled = false`로 설정(픽셀이 흐려지지 않도록).
  4. `grid` 배열을 순회하며 색이 있는 셀만 `ctx.fillRect(col * EXPORT_SCALE, row * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE)`로 채운다. 빈 칸(`null`)은 아무것도 그리지 않아 **알파 채널이 투명한 PNG**로 저장된다.
  5. `exportCanvas.toBlob((blob) => { ... }, 'image/png')`로 PNG Blob을 생성.
  6. `URL.createObjectURL(blob)`로 임시 URL을 만들고, 숨겨진 `<a>` 태그의 `href`/`download` 속성에 설정한 뒤 `a.click()`으로 다운로드를 트리거한다. 파일명은 `pixel-art-<타임스탬프>.png` 형식으로 지정.
  7. 다운로드 후 `URL.revokeObjectURL(url)`로 메모리를 정리한다.
- "PNG로 저장" 버튼(`<button id="save-btn">`)을 도구 영역에 배치한다.

### 3.9 반응형 / 모바일 레이아웃

- `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` 설정.
- 전체 레이아웃은 세로 flex 구조: 상단(제목 + 블로그로 돌아가기 링크) → 캔버스 → 팔레트/도구 버튼 영역.
- 캔버스는 `width: min(90vw, 480px); aspect-ratio: 1 / 1;`로 화면 크기에 맞춰 축소/확대된다.
- 팔레트 스와치는 `display: flex; flex-wrap: wrap; gap: 8px;`로 배치해 좁은 화면에서도 자동 줄바꿈되도록 한다.
- 버튼(지우개, 전체 지우기, PNG 저장)과 스와치는 터치 타깃을 최소 40x40px 이상으로 확보한다.
- `@media (max-width: 480px)` 구간에서 도구 버튼 영역을 세로로 쌓는 등 좁은 화면 대응을 추가한다.
- **다크모드**: 2048 앱과 동일하게 자체 CSS 변수 + `@media (prefers-color-scheme: dark)`로 블로그 본체의 `js/theme.js`에 의존하지 않고 독립적으로 지원한다.

### 3.10 접근성

- 팔레트 스와치 버튼에 `aria-label`(예: "빨강 선택")과 `aria-pressed` 속성을 부여한다.
- 지우개/저장/전체 지우기 버튼은 키보드로 포커스 및 Enter/Space로 조작 가능해야 한다(기본 `<button>` 요소 사용으로 자동 충족).
- 커스텀 색상 `<input type="color">`에도 `aria-label="사용자 지정 색상 선택"`을 부여한다.

## 4. 외부 라이브러리 사용 여부

- **사용하지 않는다.** 격자 렌더링, 포인터 입력 처리, PNG 생성/다운로드(Canvas API의 `toBlob`)는 바닐라 HTML/CSS/JS만으로 충분히 구현 가능하므로 별도 라이브러리나 CDN 스크립트를 추가하지 않는다.

## 5. 자체 완결 원칙 재확인

- 이번 Plan/Build 단계에서 블로그 본체 파일(`index.html`, `css/style.css`, `js/*.js`, `posts/*`, `README.md`, `CLAUDE.md`)은 **일절 수정하지 않는다.**
- 모든 신규 파일은 `/home/user/my-blog/apps/pixel-art-editor/` 폴더 안에만 생성한다.
- 페이지 상단에 `<a class="back-link" href="../../index.html">← 블로그로 돌아가기</a>` 링크를 두어 사용자가 앱에서 블로그 메인으로 돌아갈 수 있게 한다(2048 앱과 동일 패턴).

## 6. 블로그 메인 페이지 임베드 방식 계획 (Embed 단계에서 실제 반영, 이번 단계에서는 수정하지 않음)

- `index.html`의 기존 "Mini Apps" 섹션(2048 카드가 있는 위치)에 픽셀 아트 에디터 카드를 추가한다.
- 기존 `.post-card` 클래스를 재사용해 디자인 일관성을 유지한다.
- 카드에는 제목("픽셀 아트 에디터"), 한 줄 설명("16x16 격자에 도트를 찍어 그림을 그리고 PNG로 저장하는 미니 에디터"), `apps/pixel-art-editor/index.html`로 이동하는 링크를 넣는다.
- 이 섹션은 계획이며, `index.html` / `css/style.css` 수정은 Review 통과 후 Embed 단계에서 진행한다.
