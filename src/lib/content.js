/** Shared, deterministic content rules. No browser dependencies. */
/**
 * @template {{ id: string, data: { draft?: boolean, pubDate: Date } }} T
 * @param {T[]} posts
 * @returns {T[]}
 */
export function visiblePosts(posts) {
  return posts.filter((post) => !post.data.draft)
    .sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime() || a.id.localeCompare(b.id));
}

export function readingMinutes(body = '') {
  const cleaned = body.replace(/```[\s\S]*?```/g, '').replace(/[#*`>\[\]()]/g, '');
  const cjk = (cleaned.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (cleaned.replace(/[\u3400-\u9fff]/g, ' ').match(/[\p{L}\p{N}]+/gu) || []).length;
  return Math.max(1, Math.ceil(cjk / 300 + words / 200));
}

export function displayDate(date, options = {}) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC', ...options }).format(new Date(date)).replaceAll('/', '.');
}

/**
 * @template {{ data: { pubDate: Date } }} T
 * @param {T[]} posts
 * @returns {[number, T[]][]}
 */
export function groupByYear(posts) {
  /** @type {Map<number, T[]>} */
  const groups = new Map();
  for (const post of posts) {
    const year = new Date(post.data.pubDate).getUTCFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(post);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

export function matchesPost(post, query = '', tag = '') {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  return (!tag || post.tags.includes(tag)) && (!normalized || `${post.title} ${post.description} ${post.tags.join(' ')}`.toLocaleLowerCase('zh-CN').includes(normalized));
}

export function withBase(path = '', base = '/') {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
