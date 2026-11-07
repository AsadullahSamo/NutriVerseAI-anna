import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(() => {
    if (!user) return {}
    const saved = localStorage.getItem(`userProfile:${user.id}`)
    return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    if (!user) return
    localStorage.setItem(`userProfile:${user.id}`, JSON.stringify(profile))
  }, [profile, user])

  const updateProfile = updates => {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  const clearProfile = () => {
    if (!user) return
    localStorage.removeItem(`userProfile:${user.id}`)
    setProfile({})
  }

  return {
    profile,
    updateProfile,
    clearProfile,
    isLoaded: !!user
  }
} 