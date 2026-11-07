import { useEffect } from "react"

export function ThemeSwitcher() {
  useEffect(() => {
    // Force dark mode
    const root = window.document.documentElement
    root.classList.remove("light")
    root.classList.add("dark")
  }, [])

  // Return null since we don't need a switcher anymore
  return null
}
