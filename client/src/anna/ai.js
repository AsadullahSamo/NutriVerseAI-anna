// AI helpers. Everything goes through Anna's host LLM (anna.llm.complete), so
// no API key ships in the bundle and usage counts against the user's own quota.

import { getAnna, unwrap } from "./runtime"
import { HttpError } from "./router"

const MAX_RETRIES = 2

const wait = ms => new Promise(r => setTimeout(r, ms))

/** Run one completion and return the model's text. */
export async function aiText({
  system,
  prompt,
  maxTokens = 2048,
  temperature = 0.7
}) {
  // Test hook: lets unit tests supply canned model answers.
  if (typeof globalThis.__NVA_AI_MOCK === "function") {
    return await globalThis.__NVA_AI_MOCK({ system, prompt, maxTokens, temperature })
  }
  const anna = await getAnna()
  if (!anna) {
    throw new HttpError(
      503,
      "AI features need Anna. Open NutriVerseAI from the Anna App Store to use them."
    )
  }
  let attempt = 0
  for (;;) {
    try {
      const reply = unwrap(
        await anna.llm.complete({
          systemPrompt: system,
          messages: [{ role: "user", content: { type: "text", text: prompt } }],
          maxTokens,
          temperature
        })
      )
      const text = reply?.content?.text
      if (typeof text !== "string" || !text.trim()) throw new Error("The AI returned an empty answer")
      return text
    } catch (e) {
      if (e?.code === "quota_exceeded") {
        throw new HttpError(429, "You have used up your Anna AI quota for now. Try again later.")
      }
      if (e?.code === "permission_denied") {
        throw new HttpError(403, "This app is not allowed to use AI. Reinstall it from the Anna App Store.")
      }
      const retriable = e?.code === "rate_limited" || /rate/i.test(e?.message || "")
      if (retriable && attempt < MAX_RETRIES) {
        await wait(1000 * 2 ** attempt)
        attempt++
        continue
      }
      throw e
    }
  }
}

/** Pull a JSON value out of a model answer (handles ``` fences and chatter). */
export function safeJsonParse(text) {
  if (typeof text !== "string") return text
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  try {
    return JSON.parse(cleaned)
  } catch {}
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (match) {
    try {
      return JSON.parse(match[0])
    } catch {}
  }
  throw new Error("The AI answer could not be read. Please try again.")
}

/** Ask for JSON and parse it. Retries once with a stricter reminder. */
export async function aiJson({ system, prompt, maxTokens = 2048, temperature = 0.4 }) {
  const strict = `${system ? system + "\n\n" : ""}Respond with valid JSON only. No markdown, no commentary.`
  const first = await aiText({ system: strict, prompt, maxTokens, temperature })
  try {
    return safeJsonParse(first)
  } catch {
    const second = await aiText({
      system: strict,
      prompt: `${prompt}\n\nYour previous answer was not valid JSON. Reply again with only the JSON.`,
      maxTokens,
      temperature: 0.2
    })
    return safeJsonParse(second)
  }
}
