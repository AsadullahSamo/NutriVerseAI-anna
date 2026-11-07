# NutriVerseAI for Anna

NutriVerseAI as an Anna App: a static React bundle with no server. The React UI in `client/src` is the original app. A small layer in `client/src/anna` answers its `/api/...` calls inside the browser:

- `db.js` stores data in Anna's per-user key-value storage (collections are split into chunks under 64 KB).
- `ai.js` sends AI requests to Anna's host LLM, so no API key ships in the app and usage counts against the user's Anna quota.
- `handlers/` re-implements the old Express routes. Each file registers routes with `router.js`.
- There is one user, the person signed in to Anna. Login, registration and passwords are gone.

## Develop

```bash
cd client && npm install      # first time
npm run build                 # writes the bundle to ./bundle
npm test                      # 41 tests for the handlers
cd .. && anna-app validate --strict
anna-app dev --mock-llm fixtures/mealplan-only.jsonl   # local harness on http://localhost:5180
```

`anna-app dev --llm real` uses your Anna account for real AI answers (run `anna-app login` first).

## Publish

1. Register at https://anna.partners and activate developer access at https://anna.partners/developer.
2. `npm i -g @anna-ai/cli`, then `anna-app login`.
3. Build the bundle (`cd client && npm run build`).
4. `anna-app apps push --dry-run` and check the slug it reports is `nutriverseai`. If not, `anna-app apps rename-slug nutriverseai` works until the first publish.
5. `anna-app apps publish` pushes the draft and cuts version 1.
6. Fill in the Listing tab in the Developer Console (text, logo, cover, screenshots, privacy URL).
7. Install the app yourself and walk through it, then `anna-app apps submit-review`.
8. After approval, `anna-app apps release <version>`.

## Known limits

- Mobile is declared (`form_factors`: desktop, mobile). Layouts were checked at 320 and 390 px with no horizontal scroll; safe-area insets are honoured and touch targets are at least 44 px. Re-check on a real phone before submitting.
- AI features need Anna. Opened in a plain browser the app still works, using localStorage, but AI calls report that Anna is required.
- Community and Kitchen Storage are rebuilt as single-user pages: Community is a personal board of posts, and Kitchen Storage groups pantry items into fridge, freezer and pantry by category.
