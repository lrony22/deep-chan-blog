const html = document.documentElement;
const body = document.body;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const revealElements = [...document.querySelectorAll('[data-reveal]')];
const timers = new Set();
const animations = new Set();
const listeners = new AbortController();
let observer;
let released = false;
let raf = 0;

function setTimer(fn, ms) {
  const timer = setTimeout(() => {
    timers.delete(timer);
    fn();
  }, ms);
  timers.add(timer);
  return timer;
}

function clearTimers() {
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
}

function animate(element, keyframes, options) {
  if (!element?.animate) return null;
  const animation = element.animate(keyframes, options);
  animations.add(animation);
  animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  return animation;
}

function revealElement(element) {
  if (element.classList.contains('is-in')) return;
  const parent = element.parentElement;
  let index = 0;
  const group = element.closest('ol, .entry-list, .page-aside, .archive-years, .page-stream') || parent;
  if (group) {
    const siblings = [...group.querySelectorAll('[data-reveal]')];
    index = Math.max(0, siblings.indexOf(element));
  }
  element.style.setProperty('--i', String(Math.min(index, 8)));
  element.style.willChange = 'opacity, transform';
  element.classList.add('is-in');
  setTimer(() => { element.style.willChange = ''; }, 900);
}

function startRevealObserver() {
  if (observer) return;
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealElements.forEach(element => element.classList.add('is-in'));
    return;
  }
  // A fully clipped box has no intersection area. Watch its unclipped parent.
  const targets = new Map();
  for (const element of revealElements) {
    const target = element.dataset.reveal === 'clip' ? element.parentElement || element : element;
    const group = targets.get(target) || [];
    group.push(element);
    targets.set(target, group);
  }
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      (targets.get(entry.target) || []).forEach(revealElement);
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  targets.forEach((_, target) => observer.observe(target));
}

function initPersonaRail(figure) {
  if (figure.dataset.motionReady === 'true') {
    figure.classList.remove('is-idle');
    setTimer(() => {
      if (reducedMotion.matches || document.hidden) return;
      if (!matchMedia('(min-width: 821px)').matches) return;
      if (['home', 'list', 'about'].includes(figure.dataset.page || '')) figure.classList.add('is-idle');
    }, 900);
    return;
  }
  figure.dataset.motionReady = 'true';
  const page = figure.dataset.page || 'other';
  const canBreathe = ['home', 'list', 'about'].includes(page);
  const idlePages = canBreathe;

  function setIdle() {
    if (reducedMotion.matches || !idlePages || document.hidden) return;
    if (!matchMedia('(min-width: 821px)').matches) return;
    figure.classList.add('is-idle');
  }

  setTimer(setIdle, 1000);

  if (page !== 'home' || reducedMotion.matches) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const glow = figure.querySelector('.persona-glow');
  const onMove = event => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (document.hidden) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      figure.style.setProperty('--persona-px', `${(x * 6).toFixed(2)}px`);
      figure.style.setProperty('--persona-py', `${(y * 3).toFixed(2)}px`);
      if (glow) glow.style.setProperty('--glow-px', `${(-x * 10).toFixed(2)}px`);
    });
  };
  document.addEventListener('pointermove', onMove, { passive: true, signal: listeners.signal });
  figure.addEventListener('pointerleave', () => {
    figure.style.setProperty('--persona-px', '0px');
    figure.style.setProperty('--persona-py', '0px');
    if (glow) glow.style.setProperty('--glow-px', '0px');
  }, { signal: listeners.signal });
}

let personaSwapBound = false;
function initPersonaSwap() {
  if (personaSwapBound) return;
  personaSwapBound = true;
  window.addEventListener('blue:persona', event => {
    if (reducedMotion.matches) return;
    const figure = document.querySelector('[data-persona-rail]');
    if (!figure) return;
    const from = event.detail?.from;
    const to = event.detail?.to;
    if (!from || !to) return;
    const oldImage = figure.querySelector(`.persona-${from}`);
    const nextImage = figure.querySelector(`.persona-${to}`);
    const ripple = figure.querySelector('.persona-ripple');

    if (oldImage) {
      oldImage.style.display = 'block';
      const out = animate(oldImage, [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(40px)', opacity: 0 },
      ], { duration: 360, easing: 'cubic-bezier(.4,0,1,1)' });
      out?.finished.catch(() => {}).finally(() => { oldImage.style.display = ''; });
    }
    if (nextImage) {
      animate(nextImage, [
        { transform: 'translateY(40px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ], { duration: 640, delay: 220, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    if (ripple) {
      animate(ripple, [
        { transform: 'scale(.4)', opacity: 0.7 },
        { transform: 'scale(1.6)', opacity: 0 },
      ], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    const caption = figure.querySelector('figcaption');
    if (caption) {
      animate(caption, [
        { opacity: 0 },
        { opacity: 1 },
      ], { duration: 420, delay: 220, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }, { signal: listeners.signal });
}

function initTwinParallax() {
  const banner = document.querySelector('[data-parallax="twin"]');
  if (!banner || reducedMotion.matches || !('IntersectionObserver' in window) || banner.dataset.motionReady === 'true') return;
  banner.dataset.motionReady = 'true';
  let visible = false;
  let frame = 0;
  const sync = () => {
    frame = 0;
    if (!visible || document.hidden) return;
    const previous = Number(banner.dataset.parallaxOffset || 0);
    const rect = banner.getBoundingClientRect();
    const baseCenter = rect.top + rect.height / 2 - previous;
    const progress = (baseCenter - window.innerHeight / 2) / window.innerHeight;
    const offset = Math.max(-12, Math.min(12, progress * -12));
    banner.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    banner.dataset.parallaxOffset = offset.toFixed(2);
  };
  const io = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) sync();
  }, { threshold: 0.05 });
  io.observe(banner);
  addEventListener('scroll', () => {
    if (!visible || frame) return;
    frame = requestAnimationFrame(sync);
  }, { passive: true, signal: listeners.signal });
  const cleanup = () => {
    io.disconnect();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    visible = false;
  };
  if (listeners.signal.aborted) cleanup();
  else listeners.signal.addEventListener('abort', cleanup, { once: true });
}

function initHomeArrival(via) {
  body.classList.toggle('arrive-load', via === 'load');
  body.classList.add('is-arrived');
  if (reducedMotion.matches) return;
  if (body.dataset.page === 'home') {
    const moving = [...document.querySelectorAll('.rail-nav a, .searchbar, .chips .chip, .welcome .eyebrow, .welcome .split-u, .welcome-desc, .welcome-art, .feature, .page-aside .side-card, .more, .persona-stage, .persona-glow')];
    moving.forEach(element => { element.style.willChange = 'opacity, transform'; });
    setTimer(() => moving.forEach(element => { element.style.willChange = ''; }), 1900);
  }
  document.querySelectorAll('[data-persona-rail]').forEach(initPersonaRail);
  initPersonaSwap();
  initTwinParallax();
}

function release(detail = {}) {
  const via = detail.via || 'load';
  if (!released) {
    released = true;
    html.dataset.arrive = 'release';
  }
  startRevealObserver();
  if (via === 'load' && body.classList.contains('is-arrived')) return;
  initHomeArrival(via);
}

function onArrive(event) {
  release(event.detail || {});
}

function onPageHide() {
  observer?.disconnect();
  observer = undefined;
  clearTimers();
  animations.forEach(animation => animation.cancel());
  animations.clear();
  if (raf) cancelAnimationFrame(raf);
  listeners.abort();
}

if (html.dataset.arrive !== 'hold') {
  requestAnimationFrame(() => release({ via: 'load' }));
}
window.addEventListener('blue:arrive', onArrive);
window.addEventListener('pagehide', onPageHide);
window.addEventListener('pageswap', onPageHide);
window.addEventListener('pagereveal', event => {
  if (!('viewTransition' in event) || !event.viewTransition) return;
  body.classList.add('is-vt');
  release({ via: 'vt' });
});
document.addEventListener('visibilitychange', () => {
  html.classList.toggle('is-hidden', document.hidden);
  if (document.hidden && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}, { signal: listeners.signal });

if (window.__dshRevealFallback) clearTimeout(window.__dshRevealFallback);
window.__dshRevealFallback = undefined;
html.dataset.motionReady = 'true';
html.classList.remove('reveal-all');
