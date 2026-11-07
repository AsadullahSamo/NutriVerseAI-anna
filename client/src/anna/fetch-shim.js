// Answers every `/api/...` request inside the browser, so the existing React
// code keeps calling fetch() exactly as before.

import { dispatch } from "./router"
import "./handlers"

const realFetch = window.fetch.bind(window)

function parseBody(init, input) {
  const raw = init?.body
  if (raw == null) return undefined
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

export function installFetchShim() {
  window.fetch = async function shimmedFetch(input, init = {}) {
    const href = typeof input === "string" ? input : input?.url || String(input)
    let url
    try {
      url = new URL(href, window.location.href)
    } catch {
      return realFetch(input, init)
    }
    const apiIndex = url.pathname.indexOf("/api/")
    if (apiIndex === -1 && !url.pathname.endsWith("/api")) {
      return realFetch(input, init)
    }
    const pathname = url.pathname.slice(apiIndex)
    const method = (init.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase()
    const { status, data } = await dispatch(method, pathname, url.search, parseBody(init, input))
    if (status === 204 || data === null) {
      return new Response(status === 204 ? null : "null", {
        status,
        headers: { "Content-Type": "application/json" }
      })
    }
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  }
}
