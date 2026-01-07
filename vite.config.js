import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import commonjs from 'vite-plugin-commonjs';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import resolve from '@rollup/plugin-node-resolve';



// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Relative paths for GitHub Pages
  build: {
    outDir: './dist',
    assetsDir: 'assets',
    rollupOptions: {
      external: ['./node_modules/vite-plugin-node-polyfills/shims/buffer'],
    },
    // commonjs
    commonjsOptions: {
      include: [
        /node_modules/,
        '@ccp-nc/crystvis-js',
        'node_modules/@jkshenton/three-bmfont-text/**'
      ],
    },
  },
  publicDir: 'public',
  server: {
    port: 4200,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: 'src/setupTests.js',
    css: true,
  },
  plugins: [
    svgr({
      svgrOptions: {
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: '**/*.svg?react',
    }),
    react(),
    nodePolyfills({
      include: ['path', 'stream', 'util'],
      exclude: ['http'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      overrides: {
        fs: 'memfs',
      },
      protocolImports: true,
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2021',
    }
  },
});
