import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // 더블클릭으로 열 수 있도록 일반 스크립트 한 개로 만든다.
        format: 'iife',
        entryFileNames: 'tetris.js',
        assetFileNames: 'tetris.css',
      },
    },
  },
});
