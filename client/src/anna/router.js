// A minimal in-browser router that stands in for the old Express server.
//
//   route("GET", "/api/recipes/:id", async ({ params, query, body, userId }) => {
//     const recipe = await db.get("recipes", params.id)
//     if (!recipe) throw new HttpError(404, "Recipe not found")
//     return recipe                       // 200 with JSON
//     // return reply(201, created)       // custom status
//     // return reply(204)                // empty
//   })
//
// Static segments win over `:param` segments, so "/api/recipes/personalized"
// matches before "/api/recipes/:id" no matter which file registers first.

import { CURRENT_USER_ID } from "./db"

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export class Reply {
  constructor(status, data) {
    this.status = status
    this.data = data
  }
}

export const reply = (status, data = null) => new Reply(status, data)

const routes = []

function compile(pattern) {
  const keys = []
  const source = pattern
    .split("/")
    .map(seg => {
      if (seg.startsWith(":")) {
        keys.push(seg.slice(1))
        return "([^/]+)"
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    })
    .join("/")
  return { regex: new RegExp(`^${source}/?$`), keys, dynamic: keys.length }
}

export function route(method, pattern, handler) {
  const { regex, keys, dynamic } = compile(pattern)
  routes.push({ method: method.toUpperCase(), pattern, regex, keys, dynamic, handler })
  routes.sort((a, b) => a.dynamic - b.dynamic)
}

export async function dispatch(method, pathname, search, body) {
  const m = method.toUpperCase()
  for (const r of routes) {
    if (r.method !== m) continue
    const match = r.regex.exec(pathname)
    if (!match) continue
    const params = {}
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(match[i + 1])))
    const query = Object.fromEntries(new URLSearchParams(search || ""))
    try {
      const out = await r.handler({ params, query, body: body ?? {}, userId: CURRENT_USER_ID })
      if (out instanceof Reply) return { status: out.status, data: out.data }
      return { status: 200, data: out === undefined ? null : out }
    } catch (e) {
      if (e instanceof HttpError) {
        return { status: e.status, data: { message: e.message, ...e.extra } }
      }
      console.error(`[api] ${m} ${pathname} failed`, e)
      return { status: 500, data: { message: e?.message || "Something went wrong" } }
    }
  }
  return { status: 404, data: { message: `No handler for ${m} ${pathname}` } }
}
