import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../data/supabaseClient'

interface AuthContextValue {
  /** true quando Supabase está configurado (produção); false = modo local/demo */
  cloudMode: boolean
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const userId = session?.user.id
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`workspace-access:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workspace_members', filter: `user_id=eq.${userId}` },
        (payload) => {
          const membership = payload.new as { status?: string }
          if (membership.status === 'revoked') void supabase?.auth.signOut()
        },
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [session?.user.id])

  const value: AuthContextValue = {
    cloudMode: isSupabaseConfigured,
    session,
    loading,
    signIn: async (email, password) => {
      if (!supabase) return 'Supabase não configurado'
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? error.message : null
    },
    signUp: async (email, password) => {
      if (!supabase) return 'Supabase não configurado'
      const { error } = await supabase.auth.signUp({ email, password })
      return error ? error.message : null
    },
    resetPassword: async (email) => {
      if (!supabase) return 'Supabase não configurado'
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?reset=1`,
      })
      return error ? error.message : null
    },
    signOut: async () => {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
