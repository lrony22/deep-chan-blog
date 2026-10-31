import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const localEnv = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(localEnv)) process.loadEnvFile(localEnv);

const site = process.env.SITE_URL;
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  output: 'static',
  ...(site ? { site } : {}),
  base,
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: site ? [sitemap()] : [],
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } } },
  vite: { server: { fs: { strict: true }, watch: { ignored: ['**/evidence/**'] } } },
});
