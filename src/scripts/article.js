document.querySelectorAll('.prose pre').forEach(pre => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'copy-code'; button.textContent = '复制代码';
  button.setAttribute('aria-label', '复制此段代码');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.querySelector('code')?.textContent || '');
      button.textContent = '已复制 ✓';
    } catch { button.textContent = '请选中代码手动复制'; }
    setTimeout(() => { button.textContent = '复制代码'; }, 2300);
  });
  pre.append(button);
});
const tocLinks = [...document.querySelectorAll('.article-toc nav a')];
if ('IntersectionObserver' in window && tocLinks.length) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible.length) return;
    tocLinks.forEach(link => link.classList.toggle('active', decodeURIComponent(link.hash.slice(1)) === visible[0].target.id));
  }, { rootMargin: '-5% 0px -65% 0px' });
  tocLinks.forEach(link => { const target = document.getElementById(decodeURIComponent(link.hash.slice(1))); if (target) observer.observe(target); });
}

const comments = document.querySelector('[data-comments]');
if (comments?.dataset.configured === 'true') {
  const button = comments.querySelector('[data-load-comments]');
  const status = comments.querySelector('[data-comments-status]');
  const container = comments.querySelector('.giscus');
  let state = 'idle';
  let timeout;
  const syncTheme = () => {
    const frame = container.querySelector('iframe');
    frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light' } } }, 'https://giscus.app');
  };
  function fail() {
    state = 'error';
    clearTimeout(timeout);
    container.replaceChildren();
    button.hidden = false; button.disabled = false; button.textContent = '重新加载评论';
    status.textContent = '暂时连接不到评论信箱，请稍后重试。';
  }
  button?.addEventListener('click', () => {
    if (state === 'loading' || state === 'ready') return;
    state = 'loading'; button.disabled = true; status.textContent = '正在连接评论信箱…';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js'; script.async = true; script.crossOrigin = 'anonymous';
    const values = { repo:comments.dataset.repo, repoId:comments.dataset.repoId, category:comments.dataset.category, categoryId:comments.dataset.categoryId, mapping:'specific', term:comments.dataset.term, strict:'1', reactionsEnabled:'1', emitMetadata:'1', inputPosition:'top', theme:document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', lang:'zh-CN', loading:'lazy' };
    Object.entries(values).forEach(([key,value]) => { script.dataset[key] = value; });
    script.addEventListener('error', fail);
    container.append(script);
    timeout = setTimeout(fail, 25000);
  });
  window.addEventListener('message', event => {
    const frame = container.querySelector('iframe');
    if (event.origin !== 'https://giscus.app' || !frame || event.source !== frame.contentWindow || !event.data?.giscus) return;
    if (event.data.giscus.error) { fail(); return; }
    if (state !== 'ready') { state = 'ready'; clearTimeout(timeout); button.hidden = true; status.textContent = ''; syncTheme(); }
  });
  window.addEventListener('blue:theme', syncTheme);
}
