// Connects to the Anna host (when running inside Anna) and exposes small
// key-value helpers. Outside Anna (plain browser, tests) it falls back to
// localStorage so the app still works for development.

let annaPromise = null
const LS_PREFIX = "nva:"

function unwrap(res) {
  // The SDK may hand back either the bare result or an {ok, result} envelope.
  if (res && typeof res === "object" && "ok" in res && "result" in res) {
    if (res.ok === false) {
      const err = new Error(res.error?.message || "Anna request failed")
      err.code = res.error?.code
      throw err
    }
    return res.result
  }
  return res
}

export function getAnna() {
  if (!annaPromise) {
    annaPromise = (async () => {
      try {
        const sdkUrl = "/static/anna-apps/_sdk/latest/index.js"
        const mod = await import(/* @vite-ignore */ sdkUrl)
        const anna = await Promise.race([
          mod.AnnaAppRuntime.connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("connect timeout")), 6000)
          )
        ])
        return anna
      } catch (e) {
        console.info("[NutriVerseAI] Running outside Anna (standalone mode):", e?.message)
        return null
      }
    })()
  }
  return annaPromise
}

export async function isInsideAnna() {
  return !!(await getAnna())
}

export async function kvGet(key) {
  const anna = await getAnna()
  if (!anna) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key)
      return raw == null ? undefined : JSON.parse(raw)
    } catch {
      return undefined
    }
  }
  const res = unwrap(await anna.storage.get({ key }))
  if (res && res.exists === false) return undefined
  return res?.value === null ? undefined : res?.value
}

export async function kvSet(key, value) {
  const anna = await getAnna()
  if (!anna) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
    } catch (e) {
      console.warn("localStorage write failed", e)
    }
    return
  }
  unwrap(await anna.storage.set({ key, value }))
}

export async function kvDelete(key) {
  const anna = await getAnna()
  if (!anna) {
    try {
      localStorage.removeItem(LS_PREFIX + key)
    } catch {}
    return
  }
  unwrap(await anna.storage.delete({ key }))
}

export async function kvList(prefix = "") {
  const anna = await getAnna()
  if (!anna) {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(LS_PREFIX + prefix)) keys.push(k.slice(LS_PREFIX.length))
    }
    return keys
  }
  const keys = []
  let cursor
  do {
    const res = unwrap(await anna.storage.list({ prefix, cursor, limit: 100 }))
    for (const item of res?.items || []) keys.push(item.key)
    cursor = res?.next_cursor
  } while (cursor)
  return keys
}

export { unwrap }
