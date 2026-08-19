import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    // Split heavy third-party libs so the initial bundle stays small and
    // each dependency can be cached independently (web.dev/learn/performance/code-split-javascript).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/html-to-image')) return 'export';
          if (id.includes('node_modules/tuvi-neo') || id.includes('@dqcai/vn-lunar')) return 'engine';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler') || id.includes('node_modules/i18next')) {
            return 'vendor';
          }
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});