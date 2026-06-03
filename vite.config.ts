import { defineConfig } from 'vite';

// base: './' keeps built asset paths relative so the game can be served
// from any subdirectory (e.g. Apache/XAMPP at /gameportfolio/).
export default defineConfig({
  base: './',
  server: {
    open: false,
    port: 5180,
    strictPort: true,
  },
});
