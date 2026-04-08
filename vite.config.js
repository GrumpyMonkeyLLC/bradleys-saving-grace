import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:       'src/index.html',
        report:     'src/report.html',
        listings:   'src/listings.html',
        contact:    'src/contact.html',
        admin:      'src/admin.html',
      }
    }
  }
})
