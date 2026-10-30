import { useEffect, useState } from 'react'
import { SignIn, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import { useAuthContext } from '@/context/useAuthContext'
import heritApi from '@/helpers/heritApi'
import { clerkSignOut } from '@/helpers/clerk'
import { roleHome, canAccessPath } from '@/helpers/roles'

/**
 * Email-code sign-in by Clerk. Being signed in to Clerk is not enough: the email must also be an
 * active staff record (auth.php answers 401 otherwise), and then we say so instead of looping.
 */
const ClerkSignIn = () => {
  const { isLoaded, isSignedIn } = useClerkAuth()
  const { saveSession } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let live = true
    heritApi
      .me()
      .then((res) => {
        if (!live || !res?.user) return
        saveSession({ ...res.user, user: res.user, clerk: true })
        const to = searchParams.get('redirectTo')
        navigate(to && canAccessPath(res.user.role, to) ? to : roleHome(res.user.role))
      })
      .catch(() => live && setDenied(true))
    return () => {
      live = false
    }
  }, [isLoaded, isSignedIn, saveSession, navigate, searchParams])

  if (isLoaded && isSignedIn && denied) {
    return (
      <div className="text-center">
        <h5 className="mb-2">No access yet</h5>
        <p className="text-muted">You are signed in, but this email is not on the Herit Clothing team. Ask an administrator to add it under Team &amp; Access, then sign in again.</p>
        <Button variant="outline-primary" onClick={() => clerkSignOut().then(() => setDenied(false))}>
          Sign out
        </Button>
      </div>
    )
  }
  if (isLoaded && !isSignedIn) return <SignIn routing="hash" />
  return <p className="text-muted text-center mb-0">Loading…</p>
}

export default ClerkSignIn
