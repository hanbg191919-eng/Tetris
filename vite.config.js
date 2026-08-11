import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Font Awesome WOFF2 파일을 CSS에 넣어 테트리스.html을 로컬에서 바로 열 수 있게 한다.
    assetsInlineLimit: 100000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // import가 없는 일반 브라우저 스크립트로 만들어 file:// 실행을 지원한다.
        format: 'iife',
        entryFileNames: 'tetris.js',
        assetFileNames: 'tetris.css',
      },
    },
  },
});
