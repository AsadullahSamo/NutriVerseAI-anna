import { useAuth } from "@/hooks/use-auth"
import { UserAvatar } from "./UserAvatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useLocation } from "wouter"
import { LogOut, User } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"

export function UserDropdown({ activeDropdown, setActiveDropdown }) {
  const { user, logoutMutation } = useAuth()
  const { preferences } = useUserPreferences()
  const [, setLocation] = useLocation()
  const [isMounted, setIsMounted] = useState(false)

  // Handle hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [userData, setUserData] = useState(() => {
    if (typeof window === 'undefined') return { name: '', profilePicture: null }
    const savedProfile = localStorage.getItem("userProfile")
    const profile = savedProfile ? JSON.parse(savedProfile) : {}
    return {
      name: profile.name || user?.name || user?.username || 'User',
      profilePicture: profile.profilePicture || user?.profilePicture
    }
  })

  // Force re-render when preferences change
  const [, setForceUpdate] = useState(0)
  const preferenceVersion = useRef(0)

  // Listen for profile updates and preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleProfileUpdate = () => {
      const savedProfile = localStorage.getItem("userProfile")
      if (savedProfile) {
        const profile = JSON.parse(savedProfile)
        setUserData(prev => ({
          ...prev,
          name: profile.name || user?.name || user?.username || 'User',
          profilePicture: profile.profilePicture || user?.profilePicture
        }))
      }
    }

    const handlePreferencesUpdate = () => {
      preferenceVersion.current += 1
      setForceUpdate(preferenceVersion.current)
    }

    handleProfileUpdate()

    window.addEventListener("storage", handleProfileUpdate)
    window.addEventListener("localProfileUpdate", handleProfileUpdate)
    window.addEventListener("preferencesUpdate", handlePreferencesUpdate)

    return () => {
      window.removeEventListener("storage", handleProfileUpdate)
      window.removeEventListener("localProfileUpdate", handleProfileUpdate)
      window.removeEventListener("preferencesUpdate", handlePreferencesUpdate)
    }
  }, [user])

  const handleLogout = async () => {
    try {
      const currentProfile = localStorage.getItem("userProfile")
      const currentPrefs = localStorage.getItem("userPreferences")

      await logoutMutation.mutateAsync()

      if (currentProfile && currentPrefs) {
        localStorage.setItem("userProfile", currentProfile)
        localStorage.setItem("userPreferences", currentPrefs)
      }

      toast.success("Logged out successfully")
    } catch (error) {
      toast.error("Failed to logout")
    }
  }

  if (!user || !isMounted) return null

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        className="relative h-10 w-10 rounded-full p-0"
        onClick={(e) => {
          // Toggle dropdown on click - integrated with Navbar state
          if (activeDropdown === 'user') {
            setActiveDropdown(null);
          } else {
            setActiveDropdown('user');
          }
        }}
        type="button"
      >
        <UserAvatar
          size="md"
          key={`md-${preferences.accentColor}-${preferenceVersion.current}`}
        />
      </Button>

      {/* Dropdown menu - same pattern as Navbar dropdowns */}
      <div className={`absolute right-0 top-full mt-1 w-56 bg-background border border-border rounded-md shadow-lg transition-all duration-200 z-50 ${
        activeDropdown === 'user'
          ? 'opacity-100 visible'
          : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
      }`}>
        <div className="py-1">
          {/* User info section */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <UserAvatar
                size="sm"
                key={`sm-${preferences.accentColor}-${preferenceVersion.current}`}
              />
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {userData.name}
                </p>
                {user.email && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu items - same pattern as Navbar */}
          <button
            onClick={() => {
              setLocation("/profile")
              setActiveDropdown(null)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => {
              handleLogout()
              setActiveDropdown(null)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
