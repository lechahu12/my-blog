document.addEventListener("DOMContentLoaded", () => {
  const contentEl = document.getElementById("post-content");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    contentEl.innerHTML = "<p class=\"error\">글을 찾을 수 없습니다.</p>";
    return;
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

      contentEl.innerHTML = `
        ${meta ? `<header class="post-header"><h1>${meta.title}</h1><p class="post-date">${meta.date}</p></header>` : ""}
        <div class="post-body">${bodyHtml}</div>
      `;
      document.title = meta ? `${meta.title} - My Blog` : "My Blog";
    })
    .catch(() => {
      contentEl.innerHTML = "<p class=\"error\">글을 찾을 수 없습니다.</p>";
    });
});
