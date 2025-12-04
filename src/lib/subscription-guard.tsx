'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/useAuthContext'
import Spinner from '@/components/Spinner'

interface SubscriptionGuardProps {
  children: React.ReactNode
}

/**
 * SubscriptionGuard
 *
 * - Only enforces subscription for regular users (role === 'user')
 * - Allows access to `/billing` even when unsubscribed so the user can subscribe
 * - Does nothing special for unauthenticated users (AuthGuard handles that)
 */
const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { isAuthenticated, isLoading, user, requiresSubscription } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    // Let AuthGuard handle unauthenticated state
    if (!isAuthenticated) return

    // Only enforce for regular users
    if (user?.role !== 'user') return

    // Allow billing page for unsubscribed users
    if (pathname?.startsWith('/billing')) return

    if (requiresSubscription) {
      router.push('/billing')
    }
  }, [isAuthenticated, isLoading, user, requiresSubscription, router, pathname])

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner />
      </div>
    )
  }

  return <>{children}</>
}

export default SubscriptionGuard


