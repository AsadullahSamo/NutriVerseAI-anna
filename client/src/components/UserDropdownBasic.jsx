import { useAuth } from "@/hooks/use-auth"
import { UserAvatar } from "./UserAvatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useLocation } from "wouter"
import { LogOut, User } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"

export function UserDropdownBasic() {
  const { user, logoutMutation } = useAuth()
  const { preferences } = useUserPreferences()
  const [, setLocation] = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

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

  // Handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsVisible(false)
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible])

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

  const toggleDropdown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Basic dropdown toggle clicked, current visible:', isVisible)
    setIsVisible(!isVisible)
  }

  if (!user) return null

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          padding: '0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        type="button"
      >
        <UserAvatar
          size="md"
          key={`md-${preferences.accentColor}-${preferenceVersion.current}`}
        />
      </button>

      {isVisible && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            right: '0',
            top: '100%',
            marginTop: '8px',
            width: '220px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            overflow: 'hidden'
          }}
        >
          {/* User info */}
          <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserAvatar
                size="sm"
                key={`sm-${preferences.accentColor}-${preferenceVersion.current}`}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '2px' }}>
                  {userData.name}
                </div>
                {user.email && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {user.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '4px' }}>
            <button
              onClick={() => {
                setLocation("/profile")
                setIsVisible(false)
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                color: '#374151',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <User size={16} />
              Profile
            </button>

            <button
              onClick={() => {
                handleLogout()
                setIsVisible(false)
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                color: '#dc2626',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
