'use client'
import Footer from '@/components/layout/Footer'
import { ChildrenType } from '@/types/component-props'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Container } from 'react-bootstrap'
import AuthGuard from '@/lib/auth-guard'

const TopNavigationBar = dynamic(() => import('@/components/layout/TopNavigationBar/page'))
const VerticalNavigationBar = dynamic(() => import('@/components/layout/VerticalNavigationBar/page'))


const PlatformLayout = ({ children }: ChildrenType) => {
  return (
    <AuthGuard
      actor="platform"
      signInPath="/auth/admin/sign-in"
    >
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
  )
}

export default PlatformLayout


// 'use client'

// import AuthGuard from '@/lib/auth-guard'
// import { ChildrenType } from '@/types/component-props'

// export default function PlatformLayout({ children }: ChildrenType) {
//   return (
//     <AuthGuard actor="platform" signInPath="/auth/admin/sign-in">
//       {children}
//     </AuthGuard>
//   )
// }
