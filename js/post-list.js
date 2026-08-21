document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("post-list");

  fetch("posts/posts.json")
    .then((res) => {
      if (!res.ok) throw new Error("posts.json을 불러올 수 없습니다.");
      return res.json();
    })
    .then((posts) => {
      posts.sort((a, b) => (a.date < b.date ? 1 : -1));

      if (posts.length === 0) {
        listEl.innerHTML = "<p class=\"empty\">아직 작성된 글이 없습니다.</p>";
        return;
      }

      listEl.innerHTML = posts
        .map(
          (post) => `
        <a class="post-card" href="post.html?slug=${encodeURIComponent(post.slug)}">
          <h2>${post.title}</h2>
          <p class="post-date">${post.date}</p>
          <p class="post-summary">${post.summary}</p>
        </a>
      `
        )
        .join("");
    })
    .catch((err) => {
      listEl.innerHTML = `<p class="error">글 목록을 불러오는 중 오류가 발생했습니다: ${err.message}</p>`;
    });
});
