// Kitchen storage: groups pantry items by where they should be kept and
// asks the AI for storage / shelf-life advice.
import { route, HttpError } from "../router"
import { db } from "../db"
import { aiJson } from "../ai"

const ZONES = {
  fridge: /dairy|milk|cheese|yogh?urt|egg|meat|poultry|chicken|beef|pork|fish|seafood|produce|vegetable|fruit|deli|sauce|condiment|beverage|juice/i,
  freezer: /frozen|ice cream|freezer/i,
  pantry: /./
}

export function zoneFor(item) {
  const text = `${item.category || ""} ${item.name || item.itemName || ""}`
  if (ZONES.freezer.test(text)) return "freezer"
  if (ZONES.fridge.test(text)) return "fridge"
  return "pantry"
}

route("GET", "/api/kitchen-storage", async () => {
  const items = await db.list("pantryItems")
  const zones = { fridge: [], freezer: [], pantry: [] }
  for (const it of items) zones[zoneFor(it)].push(it)
  const t = Date.now()
  const expiring = items
    .filter(i => i.expiryDate && !isNaN(new Date(i.expiryDate)))
    .map(i => ({ ...i, daysLeft: Math.ceil((new Date(i.expiryDate) - t) / 86400000) }))
    .filter(i => i.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)
  return { zones, expiring, total: items.length }
})

route("POST", "/api/kitchen-storage/tips", async ({ body }) => {
  const items = Array.isArray(body?.items) ? body.items.slice(0, 40) : []
  if (!items.length) throw new HttpError(400, "Add pantry items first")
  const prompt = `Give practical storage advice for these kitchen items: ${JSON.stringify(items)}.
Return a JSON array of up to 8 objects with: item, where (fridge|freezer|pantry|counter), shelfLife (short text), tip (one sentence).`
  try {
    const tips = await aiJson({ prompt, maxTokens: 1500 })
    return Array.isArray(tips) ? tips : tips?.tips ?? []
  } catch (e) {
    throw new HttpError(e?.status || 500, e?.message || "Failed to get storage tips")
  }
})
