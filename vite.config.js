import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'vendor-3d.js',
      name: 'Vendor3D',
      formats: ['es'],
      fileName: () => 'dist/js/vendor-3d.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    },
    outDir: '.',
    emptyOutDir: false,
    minify: 'terser',
    terserOptions: {
      compress: true,
      mangle: true,
      format: {
        comments: false
      }
    },
    sourcemap: false
  },
  server: {
    root: 'dist',
    open: '/3d.html'
  }
});
