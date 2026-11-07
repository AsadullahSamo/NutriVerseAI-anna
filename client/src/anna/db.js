// A tiny document database on top of Anna's per-user key-value storage.
//
// Each collection ("recipes", "pantryItems", ...) is one JSON document stored
// under `db/<collection>` as { nextId, rows: [...] }. The whole collection is
// cached in memory after first load and written through on every change.
// Everything here is async so handlers can `await` it uniformly.

import { kvGet, kvSet, kvDelete } from "./runtime"

// There is exactly one user: the person signed in to Anna.
export const CURRENT_USER_ID = 1

const cache = new Map() // collection -> { nextId, rows }
const loading = new Map() // collection -> Promise
const written = new Map() // collection -> serialized chunks last saved
let writeChain = Promise.resolve()

// Anna advises keeping each stored value under ~64 KB, so a collection is
// split into chunks of at most CHUNK_BYTES, saved as db/<coll>/<n>, with
// db/<coll>/meta holding { nextId, chunks }.
const CHUNK_BYTES = 40000

const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
const now = () => new Date().toISOString()

function packChunks(rows) {
  const chunks = []
  let current = []
  let size = 2
  for (const row of rows) {
    const len = JSON.stringify(row).length + 1
    if (current.length && size + len > CHUNK_BYTES) {
      chunks.push(JSON.stringify(current))
      current = []
      size = 2
    }
    current.push(row)
    size += len
  }
  if (current.length) chunks.push(JSON.stringify(current))
  return chunks
}

async function load(coll) {
  if (cache.has(coll)) return cache.get(coll)
  if (!loading.has(coll)) {
    loading.set(
      coll,
      (async () => {
        let doc = { nextId: 1, rows: [] }
        try {
          const meta = await kvGet(`db/${coll}/meta`)
          if (meta && Number.isInteger(meta.chunks)) {
            const parts = await Promise.all(
              Array.from({ length: meta.chunks }, (_, i) => kvGet(`db/${coll}/${i}`))
            )
            const rows = parts.flatMap(p => (Array.isArray(p) ? p : []))
            doc = { nextId: meta.nextId || rows.length + 1, rows }
            written.set(coll, parts.map(p => JSON.stringify(Array.isArray(p) ? p : [])))
            const maxId = rows.reduce((m, r) => (typeof r.id === "number" && r.id > m ? r.id : m), 0)
            if (doc.nextId <= maxId) doc.nextId = maxId + 1
          }
        } catch (e) {
          console.warn(`[db] could not read ${coll}`, e)
        }
        cache.set(coll, doc)
        loading.delete(coll)
        return doc
      })()
    )
  }
  return loading.get(coll)
}

function persist(coll) {
  const doc = cache.get(coll)
  const chunks = packChunks(doc.rows)
  const nextId = doc.nextId
  writeChain = writeChain
    .then(async () => {
      const previous = written.get(coll) || []
      for (let i = 0; i < chunks.length; i++) {
        if (previous[i] !== chunks[i]) await kvSet(`db/${coll}/${i}`, JSON.parse(chunks[i]))
      }
      await kvSet(`db/${coll}/meta`, { nextId, chunks: chunks.length })
      for (let i = chunks.length; i < previous.length; i++) await kvDelete(`db/${coll}/${i}`)
      written.set(coll, chunks)
    })
    .catch(e => console.error(`[db] failed to save ${coll}`, e))
  return writeChain
}

export const db = {
  /** All rows of a collection (copies, safe to mutate). */
  async list(coll) {
    const doc = await load(coll)
    return clone(doc.rows)
  },

  async get(coll, id) {
    const doc = await load(coll)
    const row = doc.rows.find(r => String(r.id) === String(id))
    return row ? clone(row) : null
  },

  /** First row matching a predicate, or null. */
  async find(coll, predicate) {
    const doc = await load(coll)
    const row = doc.rows.find(predicate)
    return row ? clone(row) : null
  },

  /** Rows matching a predicate. */
  async where(coll, predicate) {
    const doc = await load(coll)
    return clone(doc.rows.filter(predicate))
  },

  /** Insert a row. Assigns `id` and `createdAt` unless provided. */
  async insert(coll, row) {
    const doc = await load(coll)
    const record = { ...clone(row) }
    if (record.id === undefined || record.id === null) record.id = doc.nextId++
    else if (typeof record.id === "number" && record.id >= doc.nextId) doc.nextId = record.id + 1
    if (record.createdAt === undefined) record.createdAt = now()
    doc.rows.push(record)
    await persist(coll)
    return clone(record)
  },

  /** Shallow-merge a patch into a row. Returns the updated row or null. */
  async update(coll, id, patch) {
    const doc = await load(coll)
    const idx = doc.rows.findIndex(r => String(r.id) === String(id))
    if (idx === -1) return null
    doc.rows[idx] = { ...doc.rows[idx], ...clone(patch), id: doc.rows[idx].id }
    await persist(coll)
    return clone(doc.rows[idx])
  },

  /** Delete a row by id. Returns true if something was removed. */
  async remove(coll, id) {
    const doc = await load(coll)
    const before = doc.rows.length
    doc.rows = doc.rows.filter(r => String(r.id) !== String(id))
    if (doc.rows.length === before) return false
    await persist(coll)
    return true
  },

  /** Delete every row matching a predicate. Returns how many were removed. */
  async removeWhere(coll, predicate) {
    const doc = await load(coll)
    const before = doc.rows.length
    doc.rows = doc.rows.filter(r => !predicate(r))
    const removed = before - doc.rows.length
    if (removed) await persist(coll)
    return removed
  },

  /** Replace the whole collection (keeps ids as given). */
  async replaceAll(coll, rows) {
    const doc = await load(coll)
    doc.rows = clone(rows)
    const maxId = doc.rows.reduce((m, r) => (typeof r.id === "number" && r.id > m ? r.id : m), 0)
    doc.nextId = Math.max(doc.nextId, maxId + 1)
    await persist(coll)
  },

  /** Singleton documents (settings, profile, goals pointer...). */
  async getDoc(name, fallback = null) {
    const key = `doc/${name}`
    if (cache.has(key)) return clone(cache.get(key).value)
    let value
    try {
      value = await kvGet(key)
    } catch (e) {
      console.warn(`[db] could not read ${name}`, e)
    }
    cache.set(key, { value: value === undefined ? fallback : value })
    return clone(cache.get(key).value)
  },

  async setDoc(name, value) {
    const key = `doc/${name}`
    cache.set(key, { value: clone(value) })
    const snapshot = clone(value)
    writeChain = writeChain
      .then(() => kvSet(key, snapshot))
      .catch(e => console.error(`[db] failed to save ${name}`, e))
    await writeChain
    return clone(value)
  }
}

export { now }
