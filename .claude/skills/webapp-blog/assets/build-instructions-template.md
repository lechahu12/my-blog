# Build 지침 — {{APP_NAME}}

이 문서는 `/home/user/my-blog/spec.md` 계획에 따라 {{APP_NAME}}을(를) 구현하기 위한 Build 서브에이전트 전용 지침이다.

## 수정 범위 (반드시 준수)

- **오직 `/home/user/my-blog/apps/{{APP_SLUG}}/` 폴더 안의 파일만 새로 만들거나 수정한다.**
- 블로그 본체 파일(`index.html`, `css/style.css`, `js/*.js`, `posts/*`, `README.md`, `CLAUDE.md`)은 **절대 건드리지 않는다.**
- `spec.md`, `build-instructions.md`, `review.md`, `review-instructions.md` 등 계획/검증 문서도 건드리지 않는다.
- 다른 앱 폴더도 건드리지 않는다(참고용으로 읽기만 한다).

## 만들 파일

```
apps/{{APP_SLUG}}/index.html
apps/{{APP_SLUG}}/style.css
apps/{{APP_SLUG}}/script.js
```

## 요구사항 (spec.md 요약, 반드시 spec.md 전체를 먼저 읽고 그대로 구현할 것)

(spec.md의 "3. 기능 상세 설계" 절 내용을 여기 요약해 넣는다.)

## 필수 준수 사항 (이 블로그 전체 웹앱 공통 규칙)

1. **색상 팔레트**: `/home/user/my-blog/css/style.css`를 읽고 CSS 변수 값을 그대로 앱 `style.css`의 `:root`에 복제한다. `prefers-color-scheme: dark` 대응도 블로그와 톤이 맞게 구현한다 (블로그 본체 `js/theme.js`에 의존하지 않고 독립적으로).
2. **사용법 안내**: 화면 안에서 실제로 눈에 띄게 사용법을 안내하는 문구/섹션을 넣는다. spec.md 4절에서 정한 위치와 문구를 따른다.
3. **반응형/모바일**: viewport 메타 태그, 터치 타깃 40px 이상, 좁은 화면에서도 레이아웃이 깨지지 않도록 한다.
4. **접근성**: 의미 있는 요소에 `aria-label`/`aria-pressed`, 버튼은 기본 `<button>` 사용.
5. **블로그로 돌아가기 링크**: 상단에 `<a class="back-link" href="../../index.html">← 블로그로 돌아가기</a>`.
6. **외부 라이브러리 사용 최소화**. CDN은 허용되지만, 가능하면 순수 HTML/CSS/JS로 구현한다.

## 참고

- `apps/` 아래 기존 앱들(`ls apps/`로 확인)의 코드 스타일(CSS 변수, 다크모드, back-link, 반응형 패턴)을 참고해도 좋다.

## 완료 후

- 구현한 파일 목록과 핵심 구현 포인트를 요약해서 보고한다.
- 브라우저 실행/테스트는 하지 않는다 (Review 단계에서 별도 서브에이전트가 담당).
