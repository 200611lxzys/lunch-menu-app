import { cp, mkdir } from 'node:fs/promises';

const files = ['index.html', 'manifest.webmanifest', 'service-worker.js', 'icon.svg'];
await mkdir('www', { recursive: true });
for (const file of files) {
  await cp(file, `www/${file}`);
}
await cp('images', 'www/images', { recursive: true });
console.log('Copied the current 好好吃饭 web app into www/.');
