import './intro.js';
import './motion.js';

const root = document.documentElement;
const storage = {
  get(key, fallback = '') { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* Private browsing remains usable. */ } },
};
const media = matchMedia('(prefers-color-scheme: dark)');
let mode = root.dataset.mode || 'auto';

function applyMode() {
  root.dataset.mode = mode;
  root.dataset.theme = mode === 'auto' ? (media.matches ? 'dark' : 'light') : mode;
  document.querySelectorAll('button[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--paper').trim());
  window.dispatchEvent(new CustomEvent('blue:theme', { detail: root.dataset.theme }));
}
document.querySelectorAll('button[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  storage.set('blue-mode', mode);
  applyMode();
}));
media.addEventListener('change', () => { if (mode === 'auto') applyMode(); });
applyMode();

document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
  if (document.body.classList.contains('cover-open')) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
  const input = document.querySelector('[data-search-shortcut]');
  if (!input) return;
  event.preventDefault();
  input.focus();
});

delete root.dataset.coverPending;

let toastTimer;
function announce(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  const status = document.querySelector('#theme-announcement');
  if (status) status.textContent = message;
}
const personaButton = document.querySelector('[data-persona-toggle]');
let personaUnlocked = storage.get('blue-unlocked') === 'true';
function refreshPersonaControl() {
  if (!personaButton) return;
  personaButton.hidden = !personaUnlocked;
  personaButton.textContent = root.dataset.persona === 'ocean' ? '切回银蓝' : '切换深海';
}
function setPersona(persona) {
  const from = root.dataset.persona;
  if (from === persona) return;
  root.dataset.persona = persona;
  storage.set('blue-persona', persona);
  refreshPersonaControl();
  announce(persona === 'ocean' ? '你听见了深海的回声。另一种蓝，已为你展开。' : '回到银蓝来信。熟悉的微风，又见面了。');
  window.dispatchEvent(new CustomEvent('blue:persona', { detail: { from, to: persona } }));
}
let greetings = 0;
let greetingTimer;
document.querySelector('[data-whale]')?.addEventListener('click', () => {
  if (personaUnlocked) { setPersona(root.dataset.persona === 'ocean' ? 'silver' : 'ocean'); return; }
  greetings += 1;
  clearTimeout(greetingTimer);
  greetingTimer = setTimeout(() => { greetings = 0; }, 2400);
  if (greetings >= 3) {
    greetings = 0;
    personaUnlocked = true;
    storage.set('blue-unlocked', 'true');
    setPersona('ocean');
  } else announce(greetings === 1 ? '小鲸鱼听见你了。再打个招呼？' : '海面下，好像有另一种回声…');
});
personaButton?.addEventListener('click', () => setPersona(root.dataset.persona === 'ocean' ? 'silver' : 'ocean'));
refreshPersonaControl();
