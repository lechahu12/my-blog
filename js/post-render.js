document.addEventListener("DOMContentLoaded", () => {
  const contentEl = document.getElementById("post-content");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    contentEl.innerHTML = "<p class=\"error\">글을 찾을 수 없습니다.</p>";
    return;
  }

  // 한국어는 공백 기준 단어 분리가 의미 없어 공백 제외 글자 수로 추정한다 (분당 약 500자).
  function estimateReadingTime(mdText) {
    const charCount = mdText.replace(/\s/g, "").length;
    return Math.max(1, Math.ceil(charCount / 500));
  }

  function updateMeta(meta, slug) {
    const url = `https://lechahu12.github.io/my-blog/post.html?slug=${encodeURIComponent(slug)}`;
    const title = `${meta.title} - My Blog`;

    const setContent = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", value);
    };

    document.querySelector('link[rel="canonical"]').setAttribute("href", url);
    setContent('meta[name="description"]', meta.summary);
    setContent('meta[property="og:title"]', title);
    setContent('meta[property="og:description"]', meta.summary);
    setContent('meta[property="og:url"]', url);
    setContent('meta[name="twitter:title"]', title);
    setContent('meta[name="twitter:description"]', meta.summary);
  }

  Promise.all([
    fetch("posts/posts.json").then((res) => (res.ok ? res.json() : [])),
    fetch(`posts/${slug}.md`).then((res) => {
      if (!res.ok) throw new Error("not-found");
      return res.text();
    }),
  ])
    .then(([posts, mdText]) => {
      const meta = posts.find((p) => p.slug === slug);
      const bodyHtml = parseMarkdown(mdText);
      const readingTime = estimateReadingTime(mdText);

      contentEl.innerHTML = `
        ${meta ? `<header class="post-header"><h1>${meta.title}</h1><p class="post-date">${meta.date} · ${readingTime}분 읽기</p></header>` : ""}
        <div class="post-body">${bodyHtml}</div>
      `;
      document.title = meta ? `${meta.title} - My Blog` : "My Blog";
      if (meta) updateMeta(meta, slug);
    })
    .catch(() => {
      contentEl.innerHTML = "<p class=\"error\">글을 찾을 수 없습니다.</p>";
    });
});
