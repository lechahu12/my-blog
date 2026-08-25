# Build 지침 — 픽셀 아트 에디터

이 문서는 `/home/user/my-blog/spec.md` 계획에 따라 픽셀 아트 에디터를 구현하기 위한 Build 서브에이전트 전용 지침이다.

## 수정 범위 (반드시 준수)

- **오직 `/home/user/my-blog/apps/pixel-art-editor/` 폴더 안의 파일만 새로 만들거나 수정한다.**
- 블로그 본체 파일(`index.html`, `css/style.css`, `js/*.js`, `posts/*`, `README.md`, `CLAUDE.md`)은 **절대 건드리지 않는다.**
- `spec.md`, `build-instructions.md`, `review.md`, `review-instructions.md` 등 계획/검증 문서도 건드리지 않는다.
- 다른 앱 폴더(`apps/2048/`)도 건드리지 않는다(참고용으로 읽기만 한다).

## 만들 파일

```
apps/pixel-art-editor/index.html
apps/pixel-art-editor/style.css
apps/pixel-art-editor/script.js
```

## 요구사항 (spec.md 요약, 반드시 spec.md 전체를 먼저 읽고 그대로 구현할 것)

1. **격자**: 16x16 격자를 단일 `<canvas>`로 렌더링. `devicePixelRatio` 보정, `imageSmoothingEnabled = false`, 빈 칸은 체크보드 패턴, 셀 사이 얇은 격자선(편집 캔버스에만).
2. **좌표 변환**: `getBoundingClientRect()` 기반으로 마우스/터치 공통 좌표 → 셀 인덱스 계산.
3. **팔레트**: 16색 기본 스와치 버튼 + `<input type="color">` 커스텀 색상 선택기. 선택 시 `aria-pressed` 갱신.
4. **그리기**: Pointer Events(`pointerdown/move/up/cancel/leave`)로 마우스+터치 통합 처리, 드래그로 연속 칠하기, `touch-action: none`.
5. **지우개**: 별도 도구 모드(`currentTool: 'draw'|'erase'`), 지우개 버튼.
6. **전체 지우기**: `window.confirm()` 확인 후 grid 초기화.
7. **PNG 저장**: 오프스크린 캔버스에 20배 확대(320x320px)로 렌더링, `toBlob('image/png')` → `URL.createObjectURL` → 숨김 `<a download>` 클릭 → `revokeObjectURL`. 빈 칸은 그리지 않아 투명 PNG로 저장. 파일명 `pixel-art-<타임스탬프>.png`.
8. **반응형/모바일**: viewport 메타 태그, 캔버스 `width: min(90vw, 480px)`, 터치 타깃 40px 이상, `@media (max-width: 480px)` 대응.
9. **다크모드**: CSS 변수 + `prefers-color-scheme: dark` (블로그 본체 `js/theme.js`에 의존하지 않고 독립적으로 구현).
10. **접근성**: 스와치에 `aria-label`/`aria-pressed`, 버튼은 기본 `<button>` 사용, color input에 `aria-label`.
11. **블로그로 돌아가기 링크**: 상단에 `<a class="back-link" href="../../index.html">← 블로그로 돌아가기</a>`.
12. **외부 라이브러리 사용 금지.** 순수 HTML/CSS/JS(Canvas API)만 사용.

## 참고

- `/home/user/my-blog/apps/2048/` 의 기존 코드 스타일(CSS 변수, 다크모드, back-link, 반응형 패턴)을 참고해도 좋다.

## 완료 후

- 구현한 파일 목록과 핵심 구현 포인트를 요약해서 보고한다.
- 브라우저 실행/테스트는 하지 않는다 (Review 단계에서 별도 서브에이전트가 담당).
