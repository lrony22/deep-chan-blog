(() => {
  const tabs = [...document.querySelectorAll('.about-tabs a')];
  const ids = new Set(tabs.map(tab => (tab.getAttribute('href') || '').slice(1)).filter(Boolean));
  const sync = () => {
    const raw = location.hash.slice(1);
    const id = ids.has(raw) ? raw : 'profile';
    for (const tab of tabs) {
      if (tab.getAttribute('href') === '#' + id) tab.setAttribute('aria-current', 'location');
      else tab.removeAttribute('aria-current');
    }
  };
  sync();
  addEventListener('hashchange', sync);
})();