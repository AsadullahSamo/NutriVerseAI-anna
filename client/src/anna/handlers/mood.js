import { route, HttpError } from "../router"
import { db } from "../db"
import { aiJson } from "../ai"

// Original stored entries on user.moodJournal; here each entry is a row in
// the `moodJournal` collection: { recipeId, entry, timestamp, sentiment, emotions, userId }.

async function analyzeMoodSentiment(entry) {
  const prompt = `Analyze the mood and sentiment in this cooking experience entry: "${entry}". 
Return a JSON object with 'sentiment' (positive/negative/neutral) and 'emotions' (array of specific emotions detected) fields.`
  const parsed = await aiJson({ prompt, maxTokens: 512 })
  return { sentiment: parsed?.sentiment, emotions: parsed?.emotions || [] }
}

async function generateMoodInsights(entries) {
  const entriesText = entries.map(e => `${e.timestamp}: ${e.entry}`).join("\n")
  const prompt = `Analyze these cooking experience entries and provide detailed insights about mood patterns, focusing on cooking-related patterns, skill development, and emotional growth in the kitchen. 
  
Ensure your response is in this EXACT JSON format without any additional text:
{
  "summary": "A concise overview paragraph highlighting the key patterns and insights found in the cooking experiences.",
  "patterns": [
    {
      "category": "Skills",
      "title": "Cooking Skill Development",
      "insights": [
        { "type": "highlight", "content": "Key improvements or achievements in cooking abilities" },
        { "type": "observation", "content": "Patterns in technique application or learning" },
        { "type": "tip", "content": "Suggestion for further skill development" }
      ]
    },
    {
      "category": "Emotions",
      "title": "Emotional Journey",
      "insights": [
        { "type": "highlight", "content": "Notable emotional experiences or breakthroughs" },
        { "type": "observation", "content": "Recurring emotional patterns during cooking" },
        { "type": "tip", "content": "Ways to enhance positive emotional experiences" }
      ]
    },
    {
      "category": "Growth",
      "title": "Overall Progress",
      "insights": [
        { "type": "highlight", "content": "Major milestones or transformations" },
        { "type": "observation", "content": "General growth patterns" },
        { "type": "tip", "content": "Next steps for continued development" }
      ]
    }
  ],
  "recommendations": {
    "title": "Personalized Growth Recommendations",
    "items": [
      { "focus": "Next Challenge", "suggestion": "Specific suggestion for next cooking goal" },
      { "focus": "Skill Focus", "suggestion": "Area of cooking skill to concentrate on" },
      { "focus": "Emotional Growth", "suggestion": "Way to enhance enjoyment and confidence" }
    ]
  }
}

Entries to analyze:
${entriesText}`
  const parsed = (await aiJson({ prompt, maxTokens: 2048 })) || {}
  return {
    summary: parsed.summary || "No insights available yet.",
    patterns: parsed.patterns || [],
    recommendations: parsed.recommendations || {
      title: "Getting Started",
      items: [
        {
          focus: "Begin Your Journey",
          suggestion: "Start by recording your cooking experiences regularly."
        }
      ]
    }
  }
}

const forRecipe = async recipeId =>
  db.where("moodJournal", e => e.recipeId === parseInt(recipeId))

route("POST", "/api/mood-journal", async ({ body, userId }) => {
  const { recipeId, entry } = body
  if (typeof entry !== "string" || !entry.trim()) {
    throw new HttpError(400, "Entry is required")
  }
  const { sentiment, emotions } = await analyzeMoodSentiment(entry)
  await db.insert("moodJournal", {
    userId,
    recipeId: typeof recipeId === "string" ? parseInt(recipeId) : recipeId,
    entry,
    timestamp: new Date().toISOString(),
    sentiment,
    emotions
  })
  // The original returned the updated user object.
  return { id: userId, moodJournal: await db.list("moodJournal") }
})

route("GET", "/api/mood-journal/:recipeId", async ({ params }) => forRecipe(params.recipeId))

route("GET", "/api/mood-journal/:recipeId/insights", async ({ params }) => {
  const entries = await forRecipe(params.recipeId)
  if (entries.length === 0) {
    return {
      summary: "Not enough entries to generate insights yet.",
      patterns: [],
      recommendations: {
        title: "Get Started",
        items: [
          {
            focus: "First Entry",
            suggestion: "Add your first cooking experience to begin tracking your journey."
          }
        ]
      }
    }
  }
  return generateMoodInsights(entries)
})

route("DELETE", "/api/mood-journal/:recipeId/:timestamp", async ({ params }) => {
  const recipeId = parseInt(params.recipeId)
  await db.removeWhere(
    "moodJournal",
    e => e.recipeId === recipeId && e.timestamp === params.timestamp
  )
  return { message: "Entry deleted successfully" }
})
