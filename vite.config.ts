import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Dev-only middleware that runs `api/*.ts` Vercel-style handlers
// so the SPA can hit `/api/...` without `vercel dev`.
function vercelApiDevPlugin(): Plugin {
  const apiDir = resolve(__dirname, 'api')

  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()

        const [pathOnly] = req.url.split('?')
        const name = pathOnly.slice('/api/'.length).replace(/\/$/, '')
        if (!name || name.includes('..') || name.includes('/')) return next()

        const handlerPath = resolve(apiDir, `${name}.ts`)
        if (!existsSync(handlerPath)) return next()

        try {
          const body = await readJsonBody(req)
          const mod = await server.ssrLoadModule(handlerPath)
          const handler = mod.default
          if (typeof handler !== 'function') return next()

          const shimReq = Object.assign(req, {
            body,
            query: parseQuery(req.url),
            cookies: parseCookies(req.headers.cookie),
          })
          const shimRes = patchResponse(res)
          await handler(shimReq, shimRes)
        } catch (err) {
          server.config.logger.error(
            `[vercel-api-dev] ${name}: ${(err as Error).message}`,
            { error: err as Error },
          )
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'internal_error' }))
          }
        }
      })
    },
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (chunks.length === 0) return undefined
  const raw = Buffer.concat(chunks).toString('utf8')
  const type = req.headers['content-type'] ?? ''
  if (type.includes('application/json')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

function parseQuery(url: string): Record<string, string> {
  const q: Record<string, string> = {}
  const i = url.indexOf('?')
  if (i === -1) return q
  for (const [k, v] of new URLSearchParams(url.slice(i + 1))) q[k] = v
  return q
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    out[pair.slice(0, idx).trim()] = decodeURIComponent(
      pair.slice(idx + 1).trim(),
    )
  }
  return out
}

function patchResponse(res: ServerResponse) {
  const r = res as ServerResponse & {
    status: (code: number) => typeof r
    json: (body: unknown) => typeof r
    send: (body: unknown) => typeof r
  }
  r.status = (code: number) => {
    r.statusCode = code
    return r
  }
  r.json = (body: unknown) => {
    if (!r.getHeader('Content-Type')) {
      r.setHeader('Content-Type', 'application/json')
    }
    r.end(JSON.stringify(body))
    return r
  }
  r.send = (body: unknown) => {
    if (body == null) {
      r.end()
    } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
      r.end(body)
    } else {
      r.setHeader('Content-Type', 'application/json')
      r.end(JSON.stringify(body))
    }
    return r
  }
  return r
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Surface non-VITE_ env vars (e.g. KV_REST_API_URL, ADMIN_PASSWORD) on
  // process.env so dev-mode `api/*.ts` handlers behave like on Vercel.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v
  }

  return {
    plugins: [react(), vercelApiDevPlugin()],
  }
})
