import { route, HttpError, reply } from "../router"
import { db } from "../db"

route("GET", "/api/grocery-lists", async () => db.list("groceryLists"))

route("POST", "/api/grocery-lists", async ({ body, userId }) => {
  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new HttpError(400, "Title is required")
  }
  if (body.items !== undefined && !Array.isArray(body.items)) {
    throw new HttpError(400, "Items must be an array")
  }
  const list = await db.insert("groceryLists", {
    userId,
    title: body.title,
    items: body.items ?? [],
    completed: body.completed ?? false,
    expiryDates: body.expiryDates ?? null,
    smartSubstitutions: body.smartSubstitutions ?? null
  })
  return reply(201, list)
})

route("PATCH", "/api/grocery-lists/:id", async ({ params, body }) => {
  const { id: _id, ...patch } = body || {}
  const list = await db.update("groceryLists", params.id, patch)
  if (!list) throw new HttpError(404, "Grocery list not found")
  return list
})

route("DELETE", "/api/grocery-lists/:id", async ({ params }) => {
  await db.remove("groceryLists", params.id)
  return reply(204)
})
