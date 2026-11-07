// Test environment: an in-memory localStorage so the db layer persists, and
// no Anna host (the db and ai layers fall back to standalone mode).
class MemStorage {
  constructor() { this.m = new Map() }
  get length() { return this.m.size }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) { this.m.set(k, String(v)) }
  removeItem(k) { this.m.delete(k) }
  clear() { this.m.clear() }
}
globalThis.localStorage = new MemStorage()
