export function createAvatarDock(root, { onEnter, reducedMotion = false } = {}) {
  if (!root) return null;

  const toggle = root.querySelector('[data-avatar-toggle]');
  const panel = root.querySelector('#avatar-panel');
  const closeButton = root.querySelector('[data-avatar-close]');
  const bubble = root.querySelector('[data-avatar-bubble]');
  const log = root.querySelector('[data-avatar-log]');
  const entry = root.querySelector('[data-entry-now]');
  const askButtons = [...root.querySelectorAll('[data-avatar-ask]')];
  const templates = new Map(
    [...root.querySelectorAll('template[data-answer]')].map(template => [template.dataset.answer, template.content.textContent || '']),
  );
  const labels = {
    hello: root.dataset.hello || '',
    nudge: root.dataset.nudge || '',
    greeting: root.dataset.greeting || '',
  };
  const controller = new AbortController();
  const signal = controller.signal;
  const timers = new Set();
  let open = false;
  let destroyed = false;
  let typingTimer;
  let bubbleTimer;
  let generation = 0;

  const reduced = () => Boolean(reducedMotion);

  function setTimer(fn, ms) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
    return timer;
  }

  function clearTimer(timer) {
    if (timer) clearTimeout(timer);
    timers.delete(timer);
  }

  function clearAllTimers() {
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    clearTimer(typingTimer);
    clearTimer(bubbleTimer);
    typingTimer = undefined;
    bubbleTimer = undefined;
  }

  function scrollLog() {
    if (log) log.scrollTop = log.scrollHeight;
  }

  function appendMessage(kind, text) {
    const message = document.createElement('p');
    message.className = `avatar-msg avatar-msg--${kind}`;
    message.textContent = text;
    log?.append(message);
    scrollLog();
    return message;
  }

  function cancelTyping() {
    generation += 1;
    clearTimer(typingTimer);
    typingTimer = undefined;
  }

  function typeInto(element, text) {
    cancelTyping();
    const current = generation;
    if (reduced()) {
      element.textContent = text;
      scrollLog();
      return;
    }
    const characters = [...text];
    let index = 0;
    const step = () => {
      if (current !== generation || destroyed || document.hidden || !element.isConnected) return;
      element.textContent += characters[index] ?? '';
      index += 1;
      scrollLog();
      if (index < characters.length) {
        typingTimer = setTimer(step, 4 + Math.floor(Math.random() * 7));
      }
    };
    step();
  }

  function answerFor(kind) {
    return templates.get(kind) || '';
  }

  function ask(kind) {
    if (!open || destroyed) return;
    const button = askButtons.find(item => item.dataset.avatarAsk === kind);
    if (!button) return;
    cancelTyping();
    appendMessage('user', button.textContent || '');
    const reply = appendMessage('assistant', '···');
    reply.dataset.typing = 'true';
    const current = generation;
    setTimer(() => {
      if (!open || destroyed || document.hidden || current !== generation) return;
      reply.dataset.typing = 'false';
      reply.textContent = '';
      typeInto(reply, answerFor(kind));
    }, 600);
  }

  function openPanel() {
    if (open || destroyed) return;
    open = true;
    if (bubble) bubble.hidden = true;
    clearTimer(bubbleTimer);
    panel.hidden = false;
    root.classList.remove('is-closing');
    toggle?.setAttribute('aria-expanded', 'true');
    if (log && log.dataset.greeted !== 'true') {
      log.dataset.greeted = 'true';
      const greeting = appendMessage('assistant', '');
      typeInto(greeting, labels.greeting);
    }
    requestAnimationFrame(() => {
      if (!open) return;
      root.classList.add('is-open');
      closeButton?.focus({ preventScroll: true });
    });
  }

  function closePanel({ restoreFocus = true } = {}) {
    if (!open || destroyed) return;
    open = false;
    cancelTyping();
    root.classList.remove('is-open', 'is-tilted', 'is-nudged');
    root.classList.add('is-closing');
    toggle?.setAttribute('aria-expanded', 'false');
    const finish = () => {
      if (open || destroyed) return;
      panel.hidden = true;
      root.classList.remove('is-closing');
      if (restoreFocus) toggle?.focus({ preventScroll: true });
    };
    if (reduced()) finish();
    else setTimer(finish, 220);
  }

  function say(text, ms = 4000) {
    if (!bubble || destroyed || !text) return;
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimer(bubbleTimer);
    if (ms > 0) bubbleTimer = setTimer(() => { bubble.hidden = true; }, ms);
  }

  function react(kind) {
    if (destroyed) return;
    if (kind === 'composer') {
      if (open) return;
      root.classList.add('is-nudged', 'is-tilted');
      say(labels.nudge, 3500);
      setTimer(() => root.classList.remove('is-nudged'), 900);
      setTimer(() => root.classList.remove('is-tilted'), 520);
    }
  }

  function reset() {
    open = false;
    cancelTyping();
    clearAllTimers();
    log?.replaceChildren();
    if (log) delete log.dataset.greeted;
    if (bubble) {
      bubble.hidden = true;
      bubble.textContent = '';
    }
    root.classList.remove('is-open', 'is-tilted', 'is-nudged', 'is-closing');
    toggle?.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  }

  function destroy() {
    destroyed = true;
    open = false;
    cancelTyping();
    clearAllTimers();
    controller.abort();
  }

  toggle?.addEventListener('click', () => {
    if (open) closePanel();
    else openPanel();
  }, { signal });

  closeButton?.addEventListener('click', () => closePanel(), { signal });

  askButtons.forEach(button => button.addEventListener('click', () => ask(button.dataset.avatarAsk), { signal }));

  entry?.addEventListener('click', event => {
    event.preventDefault();
    onEnter?.(entry);
  }, { signal });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    cancelTyping();
    clearTimer(bubbleTimer);
    if (bubble) bubble.hidden = true;
  }, { signal });

  return {
    open: openPanel,
    close: closePanel,
    isOpen: () => open,
    react,
    say,
    reset,
    destroy,
  };
}
