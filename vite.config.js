import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /celebration (no slash) should open the same page as /celebration/.
function celebrationRoute() {
  const rewrite = (req, _res, next) => {
    const [path, query = ''] = (req.url || '').split('?');
    if (path === '/celebration') {
      req.url = query ? '/celebration/?'.concat(query) : '/celebration/';
    }
    next();
  };
  return {
    name: 'celebration-route',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

// The dashboard at / is the existing prebuilt page. /celebration is a separate
// full-viewport scene and is the only input this project builds.
export default defineConfig({
  plugins: [celebrationRoute(), react()],
  appType: 'mpa',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        celebration: 'celebration/index.html',
      },
    },
  },
});
