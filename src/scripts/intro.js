import copy from '../data/intro-copy.json';
import { href } from '../lib/paths.js';
import { createAvatarDock } from './avatar-dock.js';

const cover = document.querySelector('#opening-cover');

if (cover) {
  const enter = cover.querySelector('#cover-enter');
  const form = cover.querySelector('form[data-intro-form]');
  const input = cover.querySelector('textarea[data-intro-input]');
  const inputMirror = cover.querySelector('[data-intro-mirror]');
  const inputMirrorText = cover.querySelector('[data-intro-mirror-text]');
  const log = cover.querySelector('[data-intro-log]');
  const logViewport = log?.closest('.harness-stage');
  const welcome = cover.querySelector('[data-intro-welcome]');
  const send = cover.querySelector('[data-intro-send]');
  const site = document.querySelector('#site-content');
  const dockRoot = cover.querySelector('[data-avatar-dock]');
  const tideRing = cover.querySelector('[data-tide-ring]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const labels = copy.labels;
  const homeHref = href('');
  const isHome = document.body.dataset.home === 'true';
  const traceKinds = ['thinking', 'command', 'search', 'browse', 'done'];
  const punctuation = /[，。！？；：、,.!?;:…]/u;
  const timers = new Set();
  const iconPaths = {
    thinking: ['M5.2 4.1a3 3 0 0 1 5.6 0 2.6 2.6 0 0 1 1.7 4.7 2.5 2.5 0 0 1-2.1 3.1H5.6a2.5 2.5 0 0 1-2.1-3.1 2.6 2.6 0 0 1 1.7-4.7Z', 'M6 14h4', 'M6.2 6.3 8 7.5l1.8-1.2'],
    command: ['M2.5 3h11v10h-11z', 'm4.5 6 2 2-2 2', 'M8.5 10h2.5'],
    search: ['M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z', 'm10.3 10.3 3.2 3.2'],
    browse: ['M3 2.5h7l3 3V13.5H3z', 'M10 2.5v3h3', 'M5 8h6', 'M5 10.5h6'],
    done: ['M8 1.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Z', 'm5.1 8.1 1.8 1.8 4-4'],
  };

  let phase = 'boot';
  let generation = 0;
  let controller = null;
  let demoStarted = false;
  let flip;
  let coverAnimation;
  let dock = null;
  let closed = false;

  const setTimer = (fn, ms) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
    return timer;
  };

  const clearTimers = () => {
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
  };

  function setPhase(next) {
    phase = next;
    cover.dataset.introState = next;
  }

  function cancelTasks() {
    generation += 1;
    controller?.abort();
    controller = null;
  }

  function startTask() {
    cancelTasks();
    controller = new AbortController();
    return { generation, signal: controller.signal };
  }

  function isCurrent(task) {
    return task.generation === generation && !task.signal.aborted;
  }

  function wait(ms, signal) {
    return new Promise(resolve => {
      if (signal.aborted) {
        resolve(false);
        return;
      }
      const timer = setTimeout(() => finish(true), ms);
      const onAbort = () => finish(false);
      function finish(completed) {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        resolve(completed);
      }
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  async function pause(task, ms) {
    if (!isCurrent(task)) return false;
    return (await wait(ms, task.signal)) && isCurrent(task);
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shouldPauseAfter(character) {
    return punctuation.test(character);
  }

  function isNearBottom(element) {
    return element.scrollHeight - element.clientHeight - element.scrollTop <= 48;
  }

  function scrollLogIfNeeded(wasNearBottom) {
    if (wasNearBottom && logViewport) logViewport.scrollTop = logViewport.scrollHeight;
  }

  function writeOutput(output, value) {
    const shouldFollow = Boolean(log?.contains(output) && logViewport && isNearBottom(logViewport));
    if (output instanceof HTMLTextAreaElement) {
      output.value = value;
      if (output === input) {
        if (inputMirrorText) inputMirrorText.textContent = value;
        output.style.height = 'auto';
        output.style.height = `${Math.min(output.scrollHeight, 120)}px`;
      }
    } else output.textContent = value;
    scrollLogIfNeeded(shouldFollow);
  }

  async function typeOutput(task, output, value, { slow = false } = {}) {
    if (!output || !isCurrent(task)) return false;
    const characters = [...value];
    if (reducedMotion.matches) {
      writeOutput(output, value);
      return true;
    }
    let written = '';
    for (const character of characters) {
      if (!isCurrent(task)) return false;
      written += character;
      writeOutput(output, written);
      const delay = slow
        ? (shouldPauseAfter(character) ? randomBetween(280, 500) : randomBetween(70, 180))
        : randomBetween(4, 10);
      if (!(await pause(task, delay))) return false;
    }
    return isCurrent(task);
  }

  function appendMessage(text, kind = 'assistant') {
    if (!log) return null;
    const wasNearBottom = Boolean(logViewport && isNearBottom(logViewport));
    const element = document.createElement('p');
    element.className = kind === 'user'
      ? 'harness-message harness-message--user'
      : 'harness-message harness-message--assistant';
    element.dataset.introGenerated = 'true';
    element.textContent = text;
    log.append(element);
    scrollLogIfNeeded(wasNearBottom);
    return element;
  }

  function createToolIcon(kind) {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.35');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    for (const pathData of iconPaths[kind] ?? iconPaths.browse) {
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('d', pathData);
      svg.append(path);
    }
    return svg;
  }

  function appendTraceRow(step, index) {
    if (!log) return null;
    const wasNearBottom = Boolean(logViewport && isNearBottom(logViewport));
    const kind = step.kind ?? traceKinds[index] ?? 'browse';
    const row = document.createElement('div');
    row.className = 'harness-trace-row';
    row.dataset.kind = kind;
    row.dataset.introGenerated = 'true';
    const icon = document.createElement('span');
    icon.className = 'harness-trace-icon';
    icon.append(createToolIcon(kind));
    const label = document.createElement('span');
    label.className = 'harness-trace-label';
    label.textContent = step.label;
    const separator = document.createElement('span');
    separator.className = 'harness-trace-separator';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '·';
    const text = document.createElement('span');
    text.className = 'harness-trace-text';
    row.append(icon, label, separator, text);
    log.append(row);
    scrollLogIfNeeded(wasNearBottom);
    return text;
  }

  function getFirstSteps() {
    return Array.isArray(copy.firstSteps) ? copy.firstSteps.slice(0, 5) : [];
  }

  function getDrafts() {
    return Array.isArray(copy.drafts) ? copy.drafts.slice(0, 5) : [];
  }

  function completeReducedMotionTrace() {
    const steps = getFirstSteps();
    steps.forEach((step, index) => {
      const text = appendTraceRow(step, index);
      if (text) writeOutput(text, step.text);
    });
    if (copy.assistantReply) appendMessage(copy.assistantReply);
  }

  async function runDraftLoop(task) {
    const drafts = getDrafts();
    if (!input || !drafts.length || !isCurrent(task) || reducedMotion.matches) return;
    let index = 0;
    while (isCurrent(task)) {
      const draft = drafts[index];
      const typed = await typeOutput(task, input, draft, { slow: true });
      if (!typed || !isCurrent(task)) return;
      if (!(await pause(task, randomBetween(1200, 1800)))) return;
      let characters = [...draft];
      while (characters.length && isCurrent(task)) {
        characters.pop();
        writeOutput(input, characters.join(''));
        if (!(await pause(task, randomBetween(30, 70)))) return;
      }
      if (!(await pause(task, randomBetween(250, 500)))) return;
      index = (index + 1) % drafts.length;
    }
  }

  async function runDemo(task) {
    if (!input || !isCurrent(task)) return;
    setPhase('typing-first');
    const firstTyped = await typeOutput(task, input, copy.firstPrompt, { slow: true });
    if (!firstTyped || !isCurrent(task)) return;
    writeOutput(input, '');
    appendMessage(copy.firstPrompt, 'user');
    if (welcome) welcome.classList.add('is-demo');
    setPhase('trace');

    if (reducedMotion.matches) {
      completeReducedMotionTrace();
      setPhase('idle');
      return;
    }

    const steps = getFirstSteps();
    for (let index = 0; index < steps.length; index += 1) {
      if (!isCurrent(task)) return;
      const output = appendTraceRow(steps[index], index);
      if (output && !(await typeOutput(task, output, steps[index].text))) return;
      if (index + 1 < steps.length && !(await pause(task, 260))) return;
    }

    if (copy.assistantReply) {
      const reply = appendMessage('');
      if (reply && !(await typeOutput(task, reply, copy.assistantReply))) return;
    }

    if (!isCurrent(task)) return;
    setPhase('draft-loop');
    await runDraftLoop(task);
  }

  function startDemo() {
    if (!cover || cover.hidden || closed || phase === 'entering' || demoStarted) return;
    demoStarted = true;
    if (reducedMotion.matches) {
      if (input) writeOutput(input, copy.firstPrompt);
      completeReducedMotionTrace();
      if (welcome) welcome.classList.add('is-demo');
      setPhase('idle');
      return;
    }
    void runDemo(startTask());
  }

  function markSeen() {
    try { sessionStorage.setItem('blue-cover-seen', 'true'); } catch { /* Navigation remains usable. */ }
  }

  function dispatchArrive(via) {
    document.documentElement.dataset.arrive = 'release';
    window.dispatchEvent(new CustomEvent('blue:arrive', { detail: { via } }));
  }

  function resetContent() {
    cover.querySelectorAll('[data-intro-generated="true"]').forEach(element => element.remove());
    log?.replaceChildren();
    if (welcome) {
      welcome.hidden = false;
      welcome.classList.remove('is-demo');
    }
    if (input) {
      input.value = '';
      input.readOnly = true;
      input.placeholder = labels.inputHint;
      input.style.height = '';
    }
    if (inputMirrorText) inputMirrorText.textContent = '';
    cover.style.pointerEvents = '';
  }

  function showCover({ initial = false } = {}) {
    if (!cover) return;
    cancelTasks();
    clearTimers();
    coverAnimation?.cancel();
    coverAnimation = undefined;
    flip?.cancel();
    demoStarted = false;
    closed = false;
    dock?.reset();
    resetContent();
    cover.hidden = false;
    cover.style.clipPath = '';
    cover.style.opacity = '';
    cover.style.transform = '';
    if (tideRing) {
      tideRing.style.left = '';
      tideRing.style.top = '';
      tideRing.style.opacity = '';
      tideRing.style.transform = '';
    }
    cover.dataset.introState = 'welcome';
    document.body.classList.add('cover-open');
    document.body.classList.remove('cover-arriving', 'is-arrived');
    document.documentElement.dataset.arrive = 'hold';
    if (site) site.inert = true;
    setPhase('welcome');
    if (!initial) {
      cover.dataset.boot = '';
      void cover.offsetWidth;
      cover.dataset.boot = 'play';
    }
    enter?.focus({ preventScroll: true });
    setTimer(startDemo, 1100);
    setTimer(() => {
      if (!dock?.isOpen()) dock?.say(labels.avatarHello, 6000);
    }, 1200);
  }

  function press(trigger) {
    if (!(trigger instanceof HTMLElement) || reducedMotion.matches) return;
    trigger.animate(
      [{ transform: 'scale(.96)' }, { transform: 'scale(1)' }],
      { duration: 120, easing: 'cubic-bezier(.16,1,.3,1)' },
    );
  }

  function startFlip() {
    if (!isHome || reducedMotion.matches) return;
    const source = cover.querySelector('[data-cover-art] img');
    const target = document.querySelector('.welcome-art img');
    if (!(source instanceof HTMLImageElement) || !(target instanceof HTMLImageElement)) return;
    const sourceRect = source.getBoundingClientRect();
    target.style.visibility = 'hidden';
    const targetFrame = target.closest('.welcome-art') || target;
    const frameTransform = targetFrame.style.transform;
    const frameClip = targetFrame.style.clipPath;
    const imageTransform = target.style.transform;
    targetFrame.style.transform = 'none';
    targetFrame.style.clipPath = 'none';
    target.style.transform = 'none';
    const targetRect = target.getBoundingClientRect();
    targetFrame.style.transform = frameTransform;
    targetFrame.style.clipPath = frameClip;
    target.style.transform = imageTransform;
    if (!sourceRect.width || !targetRect.width) {
      target.style.visibility = '';
      return;
    }
    const clone = document.createElement('img');
    clone.src = source.currentSrc || source.src;
    clone.alt = '';
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${sourceRect.left}px`,
      top: `${sourceRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      objectFit: 'contain',
      transformOrigin: '0 0',
      zIndex: '1100',
      pointerEvents: 'none',
      margin: '0',
      filter: 'drop-shadow(0 18px 34px rgba(30,60,140,.24))',
    });
    document.body.append(clone);
    const dx = targetRect.left - sourceRect.left;
    const dy = targetRect.top - sourceRect.top;
    const scale = targetRect.width / sourceRect.width;
    flip = clone.animate([
      { transform: 'translate(0, 0) rotate(-3deg) scale(1)' },
      { transform: `translate(${dx}px, ${dy - 24}px) rotate(-1.5deg) scale(${scale * 1.015})`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${scale})` },
    ], { duration: 900, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    const finish = () => {
      clone.remove();
      target.style.visibility = '';
    };
    flip.finished.then(finish).catch(finish);
  }

  function finishEnter() {
    if (!cover) return;
    coverAnimation?.cancel();
    coverAnimation = undefined;
    cover.hidden = true;
    cover.style.clipPath = '';
    cover.style.pointerEvents = '';
    document.body.classList.remove('cover-open', 'cover-arriving');
    if (site) site.inert = false;
    setPhase('closed');
    closed = true;
    if (!isHome) {
      window.location.assign(homeHref);
      return;
    }
    requestAnimationFrame(() => document.querySelector('#main')?.focus({ preventScroll: true }));
  }

  function enterBlog(trigger) {
    if (!cover || phase === 'entering' || closed) return;
    if (dock?.isOpen()) dock.close({ restoreFocus: false });
    cancelTasks();
    clearTimers();
    markSeen();
    setPhase('entering');
    press(trigger);
    cover.style.pointerEvents = 'none';

    if (reducedMotion.matches) {
      coverAnimation = cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out' });
      dispatchArrive('enter');
      setTimer(finishEnter, 160);
      return;
    }

    const rect = trigger instanceof HTMLElement ? trigger.getBoundingClientRect() : null;
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    setTimer(() => document.body.classList.add('cover-arriving'), 40);
    coverAnimation = cover.animate([
      { clipPath: `circle(150% at ${x}px ${y}px)` },
      { clipPath: `circle(0px at ${x}px ${y}px)` },
    ], { duration: 700, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
    if (tideRing) {
      tideRing.style.left = `${x}px`;
      tideRing.style.top = `${y}px`;
      tideRing.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.75 },
        { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
      ], { duration: 700, easing: 'cubic-bezier(.7,0,.2,1)' });
    }
    setTimer(startFlip, 80);
    setTimer(() => dispatchArrive('enter'), 300);
    setTimer(finishEnter, 760);
  }

  function finishSkip() {
    if (!cover) return;
    coverAnimation?.cancel();
    coverAnimation = undefined;
    cover.hidden = true;
    cover.style.opacity = '';
    cover.style.transform = '';
    document.body.classList.remove('cover-open', 'cover-arriving');
    if (site) site.inert = false;
    setPhase('closed');
    closed = true;
    if (!isHome) {
      window.location.assign(homeHref);
      return;
    }
    requestAnimationFrame(() => document.querySelector('#main')?.focus({ preventScroll: true }));
  }

  function skipIntro(trigger) {
    if (!cover || phase === 'entering' || closed) return;
    if (dock?.isOpen()) dock.close({ restoreFocus: false });
    cancelTasks();
    clearTimers();
    markSeen();
    setPhase('entering');
    press(trigger);
    cover.style.pointerEvents = 'none';
    if (reducedMotion.matches) {
      cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out' });
      dispatchArrive('skip');
      setTimer(finishSkip, 160);
      return;
    }
    document.body.classList.add('cover-arriving');
    cover.animate([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(1.02)' },
    ], { duration: 260, easing: 'ease-in' });
    dispatchArrive('skip');
    setTimer(finishSkip, 260);
  }

  function visibleFocusableElements() {
    const candidates = [...cover.querySelectorAll('button, a[href], input, textarea, select, [tabindex]')];
    return candidates.filter(element => {
      if (element.tabIndex < 0 || element.disabled || element.closest('[hidden], [inert]')) return false;
      if (!element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') return false;
      return true;
    });
  }

  function onDocumentKeydown(event) {
    if (!cover || cover.hidden || phase === 'closed') return;
    if (event.key === 'Escape') {
      if (phase === 'entering') return;
      event.preventDefault();
      if (dock?.isOpen()) {
        dock.close();
        return;
      }
      skipIntro(null);
      return;
    }
    if (event.key !== 'Tab' || phase === 'entering') return;
    const controls = visibleFocusableElements();
    if (!controls.length) {
      event.preventDefault();
      cover.focus({ preventScroll: true });
      return;
    }
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === cover)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onComposerKeydown(event) {
    if (event.key !== 'Enter' || phase === 'entering') return;
    event.preventDefault();
    enterBlog(send);
  }

  function onComposerIntent() {
    dock?.react('composer');
  }

  function destroy() {
    cancelTasks();
    clearTimers();
    dock?.destroy();
    flip?.cancel();
  }

  function boot() {
    dock = createAvatarDock(dockRoot, {
      onEnter: trigger => enterBlog(trigger),
      reducedMotion: reducedMotion.matches,
    });
    document.addEventListener('keydown', onDocumentKeydown);
    document.querySelectorAll('[data-replay]').forEach(button => button.addEventListener('click', () => showCover()));
    enter?.addEventListener('click', () => skipIntro(enter));
    form?.addEventListener('submit', event => { event.preventDefault(); enterBlog(send); });
    form?.addEventListener('keydown', onComposerKeydown);
    send?.addEventListener('click', () => enterBlog(send));
    input?.addEventListener('focus', onComposerIntent);
    input?.addEventListener('click', onComposerIntent);
    cover.querySelectorAll('a[href]').forEach(link => {
      if (link.matches('[data-entry-now]')) return;
      link.addEventListener('click', markSeen);
    });
    window.addEventListener('pagehide', destroy);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelTasks();
    });

    let seen = false;
    try { seen = sessionStorage.getItem('blue-cover-seen') === 'true'; } catch { /* First visit still works. */ }
    const pending = document.documentElement.dataset.coverPending === 'true';
    if (isHome && !seen && pending) {
      showCover({ initial: true });
    } else {
      cover.hidden = true;
      cover.removeAttribute('data-boot');
      setPhase('closed');
      closed = true;
      requestAnimationFrame(() => dispatchArrive('load'));
    }
    document.documentElement.dataset.introReady = 'true';
  }

  boot();
}
