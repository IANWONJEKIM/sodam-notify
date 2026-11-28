import { defineConfig } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// 새 앱 소스는 web/, 빌드 결과는 dist/app/ (GitHub Pages에서 /sodam-notify/app/ 으로 나가요).
// 앱은 지금처럼 ../config.js, ../icon-*.png (저장소 맨 위 파일)을 같이 써요.
const ROOT_FILES = /^\/(config\.js|manifest\.json|icon-\d+\.png)$/;
const TYPES = { js: 'text/javascript', json: 'application/json', png: 'image/png' };

function serveRootFiles() {
  return {
    name: 'sodam-root-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0];
        if (path === '/') {
          res.statusCode = 302;
          res.setHeader('Location', '/app/');
          return res.end();
        }
        const m = path.match(ROOT_FILES);
        const file = m && resolve(import.meta.dirname, m[1]);
        if (!file || !existsSync(file)) return next();
        res.setHeader('Content-Type', TYPES[file.split('.').pop()]);
        res.end(readFileSync(file));
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  root: 'web',
  // 개발 서버는 /app/ 에서 열어서 ../config.js 같은 경로가 배포와 똑같이 맞아요
  base: command === 'serve' ? '/app/' : './',
  envDir: '..',
  plugins: [serveRootFiles()],
  build: {
    outDir: '../dist/app',
    emptyOutDir: true,
    // Firebase SDK가 커서(약 540KB) 경고 기준만 올려요
    chunkSizeWarningLimit: 800,
  },
  server: { port: 5173 },
}));
