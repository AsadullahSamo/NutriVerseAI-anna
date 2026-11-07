import { useState, useEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"

function getInitials(name) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
}

export function UserAvatar({ className = "", size = "md" }) {
  const { user } = useAuth()
  const { preferences } = useUserPreferences()
  const [forceRender, setForceRender] = useState(0)

  const [userData, setUserData] = useState(() => ({
    name: user?.name || user?.username,
    profilePicture: user?.profilePicture
  }))

  // Store the current accent color in a ref to detect changes
  const currentAccentColor = useRef(preferences.accentColor)

  // Listen for profile updates and accent color changes
  useEffect(() => {
    const handleProfileUpdate = () => {
      const savedProfile = localStorage.getItem("userProfile")
      if (savedProfile) {
        const profile = JSON.parse(savedProfile)
        setUserData(prev => ({
          ...prev,
          name: profile.name || user?.name || user?.username,
          profilePicture: profile.profilePicture
        }))
      }
    }

    // Direct localStorage check for accent color changes
    const checkAccentColor = () => {
      const savedPrefs = localStorage.getItem("userPreferences")
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs)
          if (prefs.accentColor !== currentAccentColor.current) {
            currentAccentColor.current = prefs.accentColor
            setForceRender(prev => prev + 1) // Force re-render
          }
        } catch (e) {
          console.error("Error parsing preferences:", e)
        }
      }
    }

    const handleAccentColorChange = event => {
      if (event.detail.accentColor !== currentAccentColor.current) {
        currentAccentColor.current = event.detail.accentColor
        setForceRender(prev => prev + 1) // Force re-render
      }
    }

    // Initial checks
    handleProfileUpdate()
    checkAccentColor()

    // Listen for updates
    window.addEventListener("storage", () => {
      handleProfileUpdate()
      checkAccentColor()
    })
    window.addEventListener("localProfileUpdate", handleProfileUpdate)
    window.addEventListener("accentColorChange", handleAccentColorChange)
    window.addEventListener("preferencesUpdate", () => checkAccentColor())

    return () => {
      window.removeEventListener("storage", () => {
        handleProfileUpdate()
        checkAccentColor()
      })
      window.removeEventListener("localProfileUpdate", handleProfileUpdate)
      window.removeEventListener("accentColorChange", handleAccentColorChange)
      window.removeEventListener("preferencesUpdate", () => checkAccentColor())
    }
  }, [user])

  // Create the initials and dimensions as memo values
  const initials = useMemo(
    () => getInitials(userData.name || user?.username || ""),
    [userData.name, user?.username]
  )

  const dimensions = useMemo(() => (size === "sm" ? "h-8 w-8" : "h-10 w-10"), [
    size
  ])

  // Always use the most up-to-date accent color
  const accentColor = useMemo(() => {
    // First check localStorage for the most current value
    try {
      const savedPrefs = localStorage.getItem("userPreferences")
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs)
        return prefs.accentColor
      }
    } catch (e) {
      console.error("Error accessing accent color from localStorage:", e)
    }
    // Fall back to context value
    return preferences.accentColor
  }, [preferences.accentColor, forceRender]) // Re-compute when forced or preferences change

  if (!user) return null

  return (
    <div className={cn("relative inline-block", className)}>
      <div className={cn("overflow-hidden rounded-full", dimensions)}>
        {userData.profilePicture ? (
          <img
            src={userData.profilePicture}
            alt={userData.name || user.username}
            className="h-full w-full object-cover"
            style={{ aspectRatio: "1/1" }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-semibold uppercase text-white"
            style={{ backgroundColor: accentColor }}
            // Force re-render when color changes
            key={`avatar-${accentColor}-${forceRender}`}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  )
}
