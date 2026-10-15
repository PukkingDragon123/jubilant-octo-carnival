// Builds a single page for hosting as a Claude Artifact: the <body> app
// markup from index.html with the stylesheet inlined. JS modules and three.js
// are published alongside it as separate files.
// Usage: node scripts/build-artifact.mjs <out-dir>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'dist-artifact';
const html = readFileSync('index.html', 'utf8');
const body = html.slice(html.indexOf('<!-- app:start -->'), html.indexOf('<!-- app:end -->'));
const css = readFileSync('styles/app.css', 'utf8');
const page = `<title>Tokotoko Tokyo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Pixelify+Sans:wght@400;600;700&display=swap">
<style>
${css}
</style>
<script>window.TOKOTOKO_PREVIEW = true;</script>
${body}`;
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), page);
console.log(`wrote ${join(out, 'index.html')} (${(page.length / 1024).toFixed(1)} KB)`);
