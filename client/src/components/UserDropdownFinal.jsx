import { useAuth } from "@/hooks/use-auth"
import { UserAvatar } from "./UserAvatar"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { User } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"

export function UserDropdownFinal() {
  const { user } = useAuth()
  const { preferences } = useUserPreferences()
  const [, setLocation] = useLocation()
  const [activeDropdown, setActiveDropdown] = useState(null)

  const [userData, setUserData] = useState(() => {
    if (typeof window === 'undefined') return { name: 'User', profilePicture: null }
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

  // Close dropdown when clicking outside - EXACT same logic as Navbar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.user-dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown])

  // Listen for profile updates
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

  if (!user) return null

  return (
    <div className="user-dropdown-container relative group">
      <Button
        variant="ghost"
        className="flex items-center gap-2 px-3 py-2"
        onClick={(e) => {
          // EXACT same logic as navigation dropdowns
          if (activeDropdown === 'user') {
            setActiveDropdown(null);
          } else {
            setActiveDropdown('user');
          }
        }}
        style={{ padding: '0', width: '40px', height: '40px', borderRadius: '50%' }}
      >
        <UserAvatar
          size="md"
          key={`md-${preferences.accentColor}-${preferenceVersion.current}`}
        />
      </Button>

      {/* EXACT same dropdown structure as navigation */}
      <div className={`absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg transition-all duration-200 z-50 ${
        activeDropdown === 'user'
          ? 'opacity-100 visible'
          : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
      }`}>
        <div className="py-1">
          {/* User info header */}
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

          {/* Menu items - EXACT same structure as navigation */}
          <div
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            onClick={() => {
              setLocation("/profile")
              setActiveDropdown(null)
            }}
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </div>

        </div>
      </div>
    </div>
  )
}
