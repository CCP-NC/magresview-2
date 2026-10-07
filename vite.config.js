import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import commonjs from 'vite-plugin-commonjs';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import resolve from '@rollup/plugin-node-resolve';
import { execSync } from 'child_process';

let gitCommit = '';
let gitTag = '';
try {
  gitCommit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  gitTag = execSync('git describe --tags --always', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch (e) {}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    __GIT_TAG__: JSON.stringify(gitTag),
  },
  base: './', // Relative paths for GitHub Pages
  resolve: {
    // crystcif-parse v0.3.0 uses mathjs v15 (same as top-level); dedupe collapses
    // the two physical copies into one.
    dedupe: ['mathjs', 'three', 'lodash'],
    // When @ccp-nc/crystvis-js is a local `file:` link (dev), preserveSymlinks
    // makes its nested imports (e.g. load-bmfont's buffer shim) resolve from
    // MagresView's node_modules. Harmless for a normal published dependency.
    preserveSymlinks: true,
  },
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
