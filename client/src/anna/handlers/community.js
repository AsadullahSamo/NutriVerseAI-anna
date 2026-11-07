// Community feed. With one Anna user this is a personal board of recipe
// shares, cooking tips and food-rescue notes.
import { route, HttpError, reply } from "../router"
import { db, now } from "../db"

const COLL = "communityPosts"
const TYPES = ["RECIPE_SHARE", "FOOD_RESCUE", "COOKING_TIP"]

async function withRecipe(post) {
  const recipe = post.recipeId ? await db.get("recipes", post.recipeId) : null
  return { ...post, recipe }
}

route("GET", "/api/community", async () => {
  const posts = await db.list(COLL)
  posts.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  return await Promise.all(posts.map(withRecipe))
})

route("POST", "/api/community", async ({ body, userId }) => {
  const content = String(body?.content ?? "").trim()
  if (!content) throw new HttpError(400, "Content is required")
  const type = TYPES.includes(body?.type) ? body.type : "COOKING_TIP"
  const post = await db.insert(COLL, {
    userId,
    content,
    type,
    recipeId: type === "RECIPE_SHARE" && body?.recipeId ? Number(body.recipeId) : null,
    createdAt: now(),
    updatedAt: now()
  })
  return reply(201, await withRecipe(post))
})

route("PATCH", "/api/community/:id", async ({ params, body }) => {
  const patch = { updatedAt: now() }
  if (body?.content !== undefined) patch.content = String(body.content)
  if (TYPES.includes(body?.type)) patch.type = body.type
  if (body && "recipeId" in body) patch.recipeId = body.recipeId ? Number(body.recipeId) : null
  const updated = await db.update(COLL, params.id, patch)
  if (!updated) throw new HttpError(404, "Post not found")
  return await withRecipe(updated)
})

route("DELETE", "/api/community/:id", async ({ params }) => {
  const ok = await db.remove(COLL, params.id)
  if (!ok) throw new HttpError(404, "Post not found")
  return { success: true }
})
