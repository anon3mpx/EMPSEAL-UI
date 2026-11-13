// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
// });
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { crossV2NodeHandler, PROXY_PREFIX } from './api/_lib/crossV2Proxy.ts';

// Dev/preview twin of the Vercel function in api/cross-v2: the same handler, with the key read from the
// server-only EMPX_V2_* vars (.env.local or the shell). They have no VITE_ prefix, so they never reach the bundle.
function crossV2Proxy(mode) {
  const env = loadEnv(mode, process.cwd(), 'EMPX_V2_');
  const handler = crossV2NodeHandler(() => ({ baseUrl: env.EMPX_V2_API_BASE_URL, apiKey: env.EMPX_V2_API_KEY }));
  const middleware = (req, res, next) => (req.url?.startsWith(`${PROXY_PREFIX}/`) ? handler(req, res) : next());
  return {
    name: 'empx-cross-v2-proxy',
    configureServer: (server) => { server.middlewares.use(middleware); },
    configurePreviewServer: (server) => { server.middlewares.use(middleware); },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const crossApiTarget = env.VITE_CROSS_API_BASE_URL?.trim().replace(/\/+$/, '')
    || 'https://crosschain.empx.io';
  return {
  plugins: [react(), crossV2Proxy(mode)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        target: crossApiTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    css: true,
  },
  };
});
