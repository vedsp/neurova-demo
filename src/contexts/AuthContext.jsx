import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fallbackTimer = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 3000)

    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (!mounted) return
      if (error) {
        console.error('Session error:', error)
        setLoading(false)
        return
      }
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id)
      } else {
        setLoading(false)
      }
    }).catch(err => {
      console.error('Unexpected session error:', err)
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    console.log('[fetchProfile] Starting fetch for', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('[fetchProfile] Query done. Error:', error, 'Data:', data)
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }
      setProfile(data || null)
    } catch (err) {
      console.error('Profile fetch failed:', err)
    } finally {
      console.log('[fetchProfile] Calling setLoading(false)')
      setLoading(false)
    }
  }

  async function signUp({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          onboarding_completed: false
        })

      if (profileError && profileError.code !== '23505') {
        console.error('Profile creation error:', profileError)
      }
    }

    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile: () => user && fetchProfile(user.id)
  }

  console.log('[AuthContext] Render:', { user: !!user, hasProfile: !!profile, loading })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

