'use client'
import DarkLogo from '@/assets/images/logo-dark.png'
import LightLogo from '@/assets/images/logo-light.png'
import TextFormInput from '@/components/from/TextFormInput'
import PasswordFormInput from '@/components/from/PasswordFormInput'
import { useAuth } from '@/context/useAuthContext'
import { yupResolver } from '@hookform/resolvers/yup'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row, Alert } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import type { SignInRequest } from '@/types/auth'

const AdminSignIn = () => {
  const router = useRouter()
  const { signIn, isAuthenticated, user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const messageSchema = yup.object({
    email: yup.string().email('Please enter a valid email').required('Email is required'),
    password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  })

  useEffect(() => {
    document.body.classList.add('authentication-bg')

    // Redirect if already authenticated
    if (isAuthenticated) {
      router.push('/dashboards')
    }

    return () => {
      document.body.classList.remove('authentication-bg')
    }
  }, [isAuthenticated, router])

  const { handleSubmit, control } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: yupResolver(messageSchema),
  })

  const handleLogin = async (data: any) => {
    try {
      setLoading(true)
      setError(null)

      const signInData: SignInRequest = {
        email: data.email,
        password: data.password,
      }

      const result = await signIn(signInData, true) // true = admin login

      if (!result.success) {
        setError(result.error || 'Admin sign in failed. Please check your credentials.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Admin login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="">
      <div className="account-pages py-5">
        <div className="container">
          <Row className="justify-content-center">
            <Col md={6} lg={5}>
              <Card className="border-0 shadow-lg">
                <CardBody className="p-5">
                  <div className="text-center">
                    <div className="mx-auto mb-4 text-center auth-logo">
                      <a href="/" className="logo-dark">
                        <Image src={DarkLogo} height={32} alt="logo dark" />
                      </a>
                      <a href="/" className="logo-light">
                        <Image src={LightLogo} height={28} alt="logo light" />
                      </a>
                    </div>
                    <h4 className="fw-bold text-dark mb-2">
                      <span className="badge bg-danger me-2">Admin</span>
                      Welcome Back!
                    </h4>
                    <p className="text-muted">Sign in to your admin account to continue</p>
                  </div>

                  {error && (
                    <Alert variant="danger" className="mt-3" dismissible onClose={() => setError(null)}>
                      {error}
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit(handleLogin)} className="mt-4">
                    <div className="mb-3">
                      <TextFormInput
                        control={control}
                        name="email"
                        type="email"
                        placeholder="Enter your admin email"
                        className="form-control"
                        label="Admin Email Address"
                      />
                    </div>
                    <div className="mb-3">
                      <PasswordFormInput
                        control={control}
                        name="password"
                        placeholder="Enter your password"
                        className="form-control"
                        label="Password"
                      />
                    </div>

                    <div className="form-check mb-3">
                      <input type="checkbox" className="form-check-input" id="remember-me" />
                      <label className="form-check-label" htmlFor="remember-me">
                        Remember me
                      </label>
                    </div>
                    <div className="d-grid">
                      <button
                        className="btn btn-danger btn-lg fw-medium"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? 'Signing in...' : 'Admin Sign In'}
                      </button>
                    </div>
                  </form>
                </CardBody>
              </Card>
              <p className="text-center mt-4">
                <Link href="/auth/sign-in" className="text-decoration-none text-white text-opacity-75">
                  ← Back to User Sign In
                </Link>
              </p>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  )
}

export default AdminSignIn

