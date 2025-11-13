'use client'

import { useAuth } from '@/context/useAuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Spinner from '@/components/Spinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireRole?: 'admin' | 'user' | null
}

/**
 * Auth Guard Component
 * Protects routes and ensures user is authenticated
 * Optionally requires specific role
 */
export default function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Not authenticated, redirect to sign in
        router.push('/auth/sign-in')
      } else if (requireRole && user?.role !== requireRole) {
        // Authenticated but wrong role
        if (user?.role === 'admin') {
          router.push('/dashboards') // Admin can access admin pages
        } else {
          router.push('/dashboards') // Regular user
        }
      }
    }
  }, [isAuthenticated, isLoading, user, requireRole, router])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner />
      </div>
    )
  }

  // Show loading state while redirecting
  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner />
      </div>
    )
  }

  // Check role if required
  if (requireRole && user?.role !== requireRole) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner />
      </div>
    )
  }

  return <>{children}</>
}

