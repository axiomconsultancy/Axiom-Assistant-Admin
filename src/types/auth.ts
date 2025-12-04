// User types matching backend API response

export type SubscriptionDetails = {
  // These fields mirror the backend UserOut.subscription_details structure (see backend README)
  plan_name?: string
  plan_id?: string
  price_id?: string
  currency?: string
  amount?: number
  status?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
}

export type UserOut = {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  agent_id: string | null
  created_at: string
  blocked: boolean
  // Subscription-related fields from backend UserOut / TokenOut.user
  subscribed?: boolean
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_details?: SubscriptionDetails | null
}

export type TokenOut = {
  access_token: string
  token_type?: string
  expires_in: number
  user: UserOut
}

export type AdminUserListResponse = {
  items: UserOut[]
  total: number
  skip: number
  limit: number
}

// Auth request types
export type SignUpRequest = {
  username: string
  email: string
  password: string
  confirm_password: string
}

// Signup OTP response type
export type SignupOTPRequestOut = {
  email: string
  expires_in: number
  detail?: string
}

export type SignInRequest = {
  email: string
  password: string
}

// Legacy type for backward compatibility
export type UserType = {
  id: string
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  token: string
}
