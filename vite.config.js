import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 👈 [핵심] Electron(file://) 환경에서 상대경로로 에셋을 찾기 위해 필수!
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 브라우저에서 웹으로 띄워놓고 개발할 때를 위한 프록시 (데스크톱 앱 자체에선 안 쓰임)
    proxy: {
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      }
    }
  },
})