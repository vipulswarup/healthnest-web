import { MARKETING_ROUTES } from '../lib/marketing-routes';

async function main() {
const origin = process.argv[2] || 'http://localhost:3001';
const issues: string[] = [];
const titles = new Set<string>();
const results = [];
for (const { path } of MARKETING_ROUTES) {
  const response = await fetch(new URL(path, origin));
  const html = await response.text();
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (response.status !== 200) issues.push(`${path}: HTTP ${response.status}`);
  if (!title || titles.has(title)) issues.push(`${path}: missing or duplicate title`);
  if (!description) issues.push(`${path}: missing meta description`);
  if (title) titles.add(title);
  results.push({ path, status: response.status, title, description });
}
const samples = [];
for (let i = 0; i < 6; i++) {
  const start = performance.now();
  const response = await fetch(origin);
  await response.arrayBuffer();
  if (i) samples.push(Math.round(performance.now() - start));
}
const missing = await fetch(new URL('/website-audit-missing-page', origin));
if (missing.status !== 404 || !(await missing.text()).includes('Let’s get you back to SanoVault')) issues.push('Custom 404 failed');
const sitemap = await (await fetch(new URL('/sitemap.xml', origin))).text();
if (!sitemap.includes('/terms') || sitemap.includes('/patients')) issues.push('Sitemap public-page boundary failed');
const robots = await (await fetch(new URL('/robots.txt', origin))).text();
if (!robots.includes('Disallow: /api/')) issues.push('robots.txt failed');
console.log(JSON.stringify({ results, homepageLocalResponseMs: samples, issues }, null, 2));
if (issues.length) process.exitCode = 1;

}
main().catch(() => { console.error("Website audit failed to reach the local server."); process.exitCode = 1; });
