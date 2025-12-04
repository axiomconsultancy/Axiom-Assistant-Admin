'use client'
import Footer from '@/components/layout/Footer'
import { ChildrenType } from '@/types/component-props'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Container } from 'react-bootstrap'
import AuthGuard from '@/lib/auth-guard'
import SubscriptionGuard from '@/lib/subscription-guard'

const TopNavigationBar = dynamic(() => import('@/components/layout/TopNavigationBar/page'))
const VerticalNavigationBar = dynamic(() => import('@/components/layout/VerticalNavigationBar/page'))

const UserLayout = ({ children }: ChildrenType) => {
  return (
    <SubscriptionGuard>
      <AuthGuard requireRole="user" signInPath="/auth/sign-in">
        <div className="wrapper">
          <Suspense>
            <TopNavigationBar />
          </Suspense>
          <VerticalNavigationBar />
          <div className="page-content">
            <Container fluid>{children}</Container>
            <Footer />
          </div>
        </div>
      </AuthGuard>
    </SubscriptionGuard>
  )
}

export default UserLayout



