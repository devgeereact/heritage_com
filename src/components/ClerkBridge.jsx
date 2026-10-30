import { useEffect } from 'react'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { setClerkState } from '@/helpers/clerk'
import { useAuthContext } from '@/context/useAuthContext'

/**
 * Mirrors Clerk's session into helpers/clerk.js so heritApi can send a fresh token. If Clerk reports
 * nobody signed in while the app still holds a Clerk-made profile, the profile is dropped (the server
 * would answer 401 anyway). PIN sessions carry no `clerk` flag and are left alone.
 */
export default function ClerkBridge() {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth()
  const { user, removeSession } = useAuthContext()
  const signedIn = Boolean(isSignedIn)

  useEffect(() => {
    setClerkState({ loaded: isLoaded, signedIn, getToken: () => getToken(), signOut: () => signOut() })
  }, [isLoaded, signedIn, getToken, signOut])

  useEffect(() => {
    if (isLoaded && !signedIn && user?.clerk) removeSession()
  }, [isLoaded, signedIn, user, removeSession])

  return null
}
