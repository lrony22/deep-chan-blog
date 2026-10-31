import { matchesPost } from '../lib/content.js';
import copy from '../data/letterhouse-copy.json';

const input = document.querySelector('#post-search');
const grid = document.querySelector('#post-grid');
const counter = document.querySelector('#post-counter');
const empty = document.querySelector('#no-results');
const buttons = [...document.querySelectorAll('[data-tag]')];
const status = document.querySelector('#search-status');
const params = new URLSearchParams(location.search);
let entries;
let loading;
let selectedTag = params.get('tag') || '';
let requestNumber = 0;
if (!buttons.some(button => button.dataset.tag === selectedTag)) selectedTag = '';
const initialQuery = params.get('q') || '';
if (input && initialQuery) input.value = initialQuery;

function syncUrl() {
  const url = new URL(location.href);
  const query = input?.value.trim() || '';
  if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
  if (selectedTag) url.searchParams.set('tag', selectedTag); else url.searchParams.delete('tag');
  history.replaceState(null, '', url);
}

async function getEntries() {
  if (entries) return entries;
  if (!loading) loading = fetch(grid.dataset.indexUrl).then(response => {
    if (!response.ok) throw new Error('index');
    return response.json();
  }).then(data => { entries = data; return data; }).catch(error => { loading = undefined; throw error; });
  return loading;
}

async function filter() {
  const current = ++requestNumber;
  buttons.forEach(button => {
    const active = button.dataset.tag === selectedTag;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  try {
    const data = await getEntries();
    if (current !== requestNumber) return;
    const ids = new Set(data.filter(post => matchesPost(post, input.value, selectedTag)).map(post => post.id));
    grid.querySelectorAll('[data-post-id]').forEach(card => { card.hidden = !ids.has(card.dataset.postId); });
    empty.hidden = ids.size !== 0;
    counter.textContent = copy.posts.counterTemplate.replace('{count}', String(ids.size));
    status.hidden = true;
  } catch {
    if (current !== requestNumber) return;
    // Preserve all server-rendered articles when the optional search index fails.
    grid.querySelectorAll('[data-post-id]').forEach(card => { card.hidden = false; });
    empty.hidden = true;
    status.textContent = copy.posts.indexLoadFailure;
    status.hidden = false;
  }
}

input?.addEventListener('input', () => {
  syncUrl();
  filter();
});

buttons.forEach(button => button.addEventListener('click', () => {
  selectedTag = button.dataset.tag;
  syncUrl();
  filter();
}));

document.querySelector('#reset-search')?.addEventListener('click', () => {
  input.value = '';
  selectedTag = '';
  const url = new URL(location.href);
  url.searchParams.delete('q');
  url.searchParams.delete('tag');
  history.replaceState(null, '', url);
  filter();
  input.focus();
});

if (selectedTag || input?.value) filter();
