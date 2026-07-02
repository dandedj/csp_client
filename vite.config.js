import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The source tree uses the CRA convention of writing JSX inside .js files.
// Vite/esbuild default to treating .js as plain JavaScript, so we opt those
// files into JSX handling without renaming any source files:
//   - `esbuild.loader` handles the main transform/build pipeline for src/*.js
//   - `optimizeDeps.esbuildOptions.loader` handles dependency pre-bundling
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  build: {
    // Keep the CRA output directory so firebase.json hosting.public ("build")
    // stays untouched.
    outDir: 'build'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false
  }
});
