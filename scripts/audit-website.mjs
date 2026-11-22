import ts from 'typescript';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, dirname, join } from 'node:path';

const root = process.cwd();
async function files(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(entry => entry.isDirectory() ? files(join(dir, entry.name)) : join(dir, entry.name)))).flat();
}
const paths = (await Promise.all(['app', 'components', 'lib'].map(files))).flat().filter(p => /\.[cm]?[jt]sx?$/.test(p));
const sources = new Map(await Promise.all(paths.map(async p => [resolve(p), ts.createSourceFile(p, await readFile(p, 'utf8'), ts.ScriptTarget.Latest, true)])));
const routes = paths.filter(p => /app\/.*page\.tsx$/.test(p)).map(p => '/' + p.replace(/^app\//, '').replace(/\/?page\.tsx$/, ''));
const errors = [];
const links = new Set();
let images = 0;
const imports = new Map();
const clients = [];
for (const [path, source] of sources) {
  const localImports = [];
  if (/^['"]use client['"]/.test(source.text.trim())) clients.push(path);
  const visit = node => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.importClause?.isTypeOnly || node.isTypeOnly) return;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings) && !node.importClause.name && bindings.elements.every(e => e.isTypeOnly)) return;
      const name = node.moduleSpecifier?.text;
      if (name?.startsWith('@/') || name?.startsWith('.')) {
        const base = name.startsWith('@/') ? resolve(name.slice(2)) : resolve(dirname(path), name);
        const target = [base, ...['.ts', '.tsx', '/index.ts', '/index.tsx'].map(ext => base + ext)].find(p => sources.has(p));
        if (target) localImports.push(target);
      }
    }
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(source);
      const attrs = node.attributes.properties;
      if (['img', 'Image'].includes(tag)) {
        images++;
        if (!attrs.some(a => a.name?.getText(source) === 'alt')) errors.push(`${relative(root, path)}: image without alt`);
      }
      for (const a of attrs) if (a.name?.getText(source) === 'href' && a.initializer && ts.isStringLiteral(a.initializer)) links.add(a.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  imports.set(path, localImports);
}
for (const link of links) {
  if (!link.startsWith('/') || link.startsWith('//')) continue;
  const pathname = link.split(/[?#]/)[0];
  const routeExists = routes.some(route => new RegExp('^' + route.replace(/\[\.\.\.[^\]]+\]/g, '.+').replace(/\[[^\]]+\]/g, '[^/]+') + '$').test(pathname));
  const asset = await stat(join(root, 'public', pathname)).catch(() => null);
  if (!routeExists && !asset) errors.push(`Broken internal link: ${pathname}`);
}
const visited = new Set();
function checkClient(path) {
  if (visited.has(path)) return;
  visited.add(path);
  const text = sources.get(path).text;
  if (/import\s+['"]server-only['"]/.test(text)) errors.push(`${relative(root,path)}: server-only module reachable from client`);
  for (const match of text.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) {
    if (!['NODE_ENV', 'NEXT_PUBLIC_APP_URL'].includes(match[1])) errors.push(`${relative(root,path)}: unapproved frontend environment reference ${match[1]}`);
  }
  for (const imported of imports.get(path) || []) checkClient(imported);
}
clients.forEach(checkClient);
console.log(JSON.stringify({ internalLinks: links.size, imagesWithAlt: images, clientModulesChecked: visited.size, errors }, null, 2));
if (errors.length) process.exitCode = 1;
