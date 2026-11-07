// The one local user. Anna already signed the person in, so there is no
// login, registration or password: these routes only keep the profile.

import { route, reply, HttpError } from "../router"
import { db, CURRENT_USER_ID } from "../db"
import { getAnna } from "../runtime"

const COLLECTIONS = [
  "recipes",
  "recipeLikes",
  "recipeConsumption",
  "groceryLists",
  "pantryItems",
  "mealPlans",
  "nutritionGoals",
  "moodJournal",
  "kitchenEquipment",
  "culturalCuisines",
  "culturalRecipes",
  "culturalTechniques",
  "recipeRecommendations",
  "recommendationFeedback"
]

const DOCS = ["profile", "preferences", "lastRecommendations"]

async function readProfile() {
  const saved = (await db.getDoc("profile", {})) || {}
  let fallbackName = "Chef"
  try {
    const anna = await getAnna()
    fallbackName = anna?.app?.name ? "Chef" : fallbackName
  } catch {}
  return {
    id: CURRENT_USER_ID,
    username: saved.username || "chef",
    name: saved.name || fallbackName,
    email: saved.email || "",
    profilePicture: saved.profilePicture || "",
    bio: saved.bio || "",
    ...saved,
    id: CURRENT_USER_ID
  }
}

async function saveProfile(patch) {
  const current = (await db.getDoc("profile", {})) || {}
  const next = { ...current, ...patch }
  delete next.id
  delete next.password
  await db.setDoc("profile", next)
  return readProfile()
}

route("GET", "/api/health", async () => ({ status: "ok" }))

route("GET", "/api/user", async () => readProfile())
route("GET", "/api/user/profile", async () => readProfile())

route("PATCH", "/api/user/profile", async ({ body }) => saveProfile(body || {}))
route("PATCH", "/api/account/profile", async ({ body }) => saveProfile(body || {}))

route("POST", "/api/logout", async () => reply(200, { success: true }))

route("POST", "/api/account/change-password", async () => {
  throw new HttpError(400, "There is no password: Anna keeps you signed in.")
})

async function wipeEverything() {
  for (const c of COLLECTIONS) await db.replaceAll(c, [])
  for (const d of DOCS) await db.setDoc(d, null)
  return { success: true }
}

route("DELETE", "/api/user/account", async () => wipeEverything())
route("DELETE", "/api/account", async () => wipeEverything())
route("POST", "/api/account/delete", async () => wipeEverything())
