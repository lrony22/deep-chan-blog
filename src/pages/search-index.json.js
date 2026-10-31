import { getCollection } from 'astro:content';
import { visiblePosts } from '../lib/content.js';
export async function GET() {
  const posts = visiblePosts(await getCollection('blog'));
  return new Response(JSON.stringify(posts.map(post=>({id:post.id,title:post.data.title,description:post.data.description,tags:post.data.tags}))),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}
