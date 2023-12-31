import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,

  server: {
    strictPort: true,
    host: "0.0.0.0",
    port: 8000
  },
  build: {
      outDir: "build"
  },
  base:'', // no leading slash on urls please
  plugins: [svelte()],
})
