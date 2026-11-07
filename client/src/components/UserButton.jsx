import { useAuth } from "@/hooks/use-auth"
import { UserAvatar } from "./UserAvatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useLocation } from "wouter"
import { LogOut, User } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"

export function UserButton() {
  const { user, logoutMutation } = useAuth()
  const { preferences } = useUserPreferences()
  const [, setLocation] = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const dropdownRef = useRef(null)

  // Handle hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])
  const [userData, setUserData] = useState(() => {
    const savedProfile = localStorage.getItem("userProfile")
    const profile = savedProfile ? JSON.parse(savedProfile) : {}
    return {
      name: profile.name || user?.name || user?.username,
      profilePicture: profile.profilePicture || user?.profilePicture
    }
  })

  // Force re-render when preferences change
  const [, setForceUpdate] = useState(0)
  const preferenceVersion = useRef(0)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Add a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        document.addEventListener('keydown', handleEscapeKey)
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen])

  // Listen for profile updates and preference changes
  useEffect(() => {
    const handleProfileUpdate = () => {
      const savedProfile = localStorage.getItem("userProfile")
      if (savedProfile) {
        const profile = JSON.parse(savedProfile)
        setUserData(prev => ({
          ...prev,
          name: profile.name || user?.name || user?.username,
          profilePicture: profile.profilePicture || user?.profilePicture
        }))
      }
    }

    const handlePreferencesUpdate = () => {
      // Force re-render by incrementing counter
      preferenceVersion.current += 1
      setForceUpdate(preferenceVersion.current)
    }

    // Initial load
    handleProfileUpdate()

    // Listen for updates
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
      // Store the profile data before logout
      const currentProfile = localStorage.getItem("userProfile")
      const currentPrefs = localStorage.getItem("userPreferences")

      await logoutMutation.mutateAsync()

      if (currentProfile && currentPrefs) {
        // Restore profile data right after logout
        localStorage.setItem("userProfile", currentProfile)
        localStorage.setItem("userPreferences", currentPrefs)
      }

      toast.success("Logged out successfully")
    } catch (error) {
      toast.error("Failed to logout")
    }
  }

  if (!user || !isMounted) return null

  const handleToggleDropdown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Dropdown toggle clicked, current state:', isOpen, 'user:', user?.name)
    setIsOpen(prev => {
      console.log('Setting dropdown state from', prev, 'to', !prev)
      return !prev
    })
  }

  const handleProfileClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Profile clicked')
    setLocation("/profile")
    setIsOpen(false)
  }

  const handleLogoutClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Logout clicked')
    await handleLogout()
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        variant="ghost"
        className="relative h-10 w-10 rounded-full p-0"
        onClick={handleToggleDropdown}
        type="button"
      >
        <UserAvatar
          size="md"
          key={`md-${preferences.accentColor}-${preferenceVersion.current}`}
        />
      </Button>

      {isOpen && (() => {
        console.log('Rendering dropdown menu, isOpen:', isOpen)
        return (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 bg-transparent"
              style={{ zIndex: 9998 }}
              onClick={() => {
                console.log('Backdrop clicked')
                setIsOpen(false)
              }}
            />

          {/* Dropdown menu */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              width: '224px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              zIndex: 9999,
              minHeight: '100px'
            }}
          >
            {/* User info section */}
            <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserAvatar
                  size="sm"
                  key={`sm-${preferences.accentColor}-${preferenceVersion.current}`}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1', color: '#111827', margin: 0 }}>
                    {userData.name}
                  </p>
                  {user.email && (
                    <p style={{ fontSize: '12px', lineHeight: '1', color: '#6b7280', margin: 0 }}>
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '4px' }}>
              <button
                onClick={handleProfileClick}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  color: '#374151',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                type="button"
              >
                <User style={{ width: '16px', height: '16px' }} />
                Profile
              </button>

              <div style={{ margin: '4px 0', height: '1px', backgroundColor: '#e5e7eb' }} />

              <button
                onClick={handleLogoutClick}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  color: '#dc2626',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                type="button"
              >
                <LogOut style={{ width: '16px', height: '16px' }} />
                Log out
              </button>
            </div>
          </div>
          </>
        )
      })()}
    </div>
  )
}
