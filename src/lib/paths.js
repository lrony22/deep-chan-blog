import { withBase } from './content.js';
export const href = (path = '') => withBase(path, import.meta.env.BASE_URL);
