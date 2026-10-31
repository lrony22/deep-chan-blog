import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { visiblePosts } from '../lib/content.js';
import { href } from '../lib/paths.js';
import { siteConfig } from '../config.js';
export async function GET(context) {
  const posts = visiblePosts(await getCollection('blog'));
  return rss({title:siteConfig.title,description:siteConfig.description,site:context.site || 'http://localhost:4321',items:posts.map(post=>({title:post.data.title,description:post.data.description,pubDate:post.data.pubDate,link:href(`posts/${post.id}/`)})),customData:'<language>zh-cn</language>'});
}
