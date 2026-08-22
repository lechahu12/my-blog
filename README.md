# My Blog

마크다운(.md) 파일을 읽어서 정적 블로그 웹사이트로 변환하는 프로젝트입니다.
프레임워크나 빌드 도구 없이 순수 HTML, CSS, JavaScript만으로 동작합니다.

## 로컬에서 실행하기

`fetch()`로 마크다운/JSON을 불러오기 때문에 `http(s)://` 환경에서 열어야 합니다.
`index.html`을 `file://`로 직접 여는 방식은 동작하지 않습니다. 저장소 루트에서 정적 서버를 하나 띄우세요.

```bash
npx serve
```

또는

```bash
python -m http.server
```

띄운 뒤 안내되는 주소(예: `http://localhost:3000`)로 접속합니다.

## 새 글 추가하기

1. `posts/<slug>.md` 파일을 작성합니다.
2. `posts/posts.json`에 `{ "slug", "title", "date", "summary", "tags" }` 항목을 추가합니다.

지원하는 마크다운 문법과 프로젝트 원칙은 [CLAUDE.md](CLAUDE.md)를 참고하세요.
