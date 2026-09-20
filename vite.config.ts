import { defineConfig } from 'vite'

export default defineConfig({
  // device WebView has no console we can see: POST /__log prints on the dev server
  plugins: [{
    name: 'device-log',
    configureServer(server) {
      server.middlewares.use('/__log', (req, res) => {
        let body = ''
        req.on('data', c => (body += c))
        req.on('end', () => { console.log('[device]', body); res.end() })
      })
    },
  }],
  server: { host: true, port: 5173 },
  build: { target: 'esnext' },
})
