import React from "react"
import { createRoot } from "react-dom/client"
import { installFetchShim } from "./anna/fetch-shim"
import { getAnna } from "./anna/runtime"
import App from "./App.jsx"
import "./index.css"
import "./styles/dropdown-options.css"
import "./lib/modal-fix.js"

// Answer "/api/..." calls inside the browser before anything renders.
installFetchShim()

async function start() {
  // Connect to Anna (null when opened outside it) and follow its theme.
  const anna = await getAnna()
  if (anna) {
    try {
      await anna.window.set_title({ title: "NutriVerseAI" })
    } catch {}
  }
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

start()
