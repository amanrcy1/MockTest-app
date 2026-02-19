import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'treat-js-as-jsx',
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/)) return null;
        return transformWithEsbuild(code, id + '.jsx', {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
  ],
  optimizeDeps: {
    esbuild: {
      loader: { '.js': 'jsx' },
    },
    entries: ['index.html'],
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-ui': ['framer-motion', 'react-toastify', 'react-markdown'],
        },
      },
    },
  },
});
