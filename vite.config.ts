import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import autoprefixer from 'autoprefixer'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  css: {
    postcss: {
      plugins: [autoprefixer()]
    }
  },
  resolve: {
    alias: {
      $src: path.resolve('./src/'),
      $lib: path.resolve('./src/lib/'),
      "$pdf.js": path.resolve('./src/lib/pdf.js/'),
      $utils: path.resolve("./src/lib/utils/"),
      $annotations: path.resolve('./src/lib/annotations/')
    }
  }
})
