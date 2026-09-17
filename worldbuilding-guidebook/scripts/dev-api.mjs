import { loadEnv } from 'vite'

export function tutorApi() {
  return {
    name: 'worldbuilding-guidebook-tutor-api',
    configureServer(server) {
      const environment = loadEnv(server.config.mode, server.config.root, '')
      for (const key of ['ANTHROPIC_API_KEY', 'TUTOR_PASSPHRASE', 'SESSION_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
        if (environment[key]) process.env[key] = environment[key]
      }
      server.middlewares.use(async function (request, response, next) {
        const endpoint = request.url?.split('?')[0]
        if (!['/api/auth', '/api/chat', '/api/translate-query'].includes(endpoint)) return next()
        response.status = function (status) { this.statusCode = status; return this }
        response.json = function (value) { this.setHeader('Content-Type', 'application/json'); this.end(JSON.stringify(value)) }
        try {
          let body = ''
          for await (const part of request) {
            body += part
            if (Buffer.byteLength(body) > 64000) { response.status(413).json({ error: 'Request too large.' }); return }
          }
          request.body = body ? JSON.parse(body) : {}
          const { default: handler } = await import(`../api/${endpoint.split('/').at(-1)}.js`)
          await handler(request, response)
        } catch { if (!response.headersSent) response.status(400).json({ error: 'Invalid request.' }) }
      })
    },
  }
}
