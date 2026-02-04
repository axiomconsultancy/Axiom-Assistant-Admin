// src/api/org/usage.ts
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface UsageDataPoint {
  date: string
  calls: number
  minutes: number
}

export interface CurrentPeriod {
  start_date: string
  end_date: string
  calls_made: number
  minutes_used: number
  minutes_allocated: number
  overage_minutes: number
}

export interface PlanInfo {
  plan_id: string
  name: string
  tier: string
  billing_frequency: string
}

export interface BillingInfo {
  current_amount: number
  currency: string
  next_billing_date: string
  payment_method: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
}

export interface Alert {
  type: string
  message: string
}

export interface UsageOverviewResponse {
  current_period: CurrentPeriod
  plan: PlanInfo
  billing: BillingInfo
  usage_history: UsageDataPoint[]
  alerts: Alert[]
}

export interface MobileStoreSummary {
  total_mobile_stores: number
  active_stores: number
  total_calls: number
  total_minutes: number
  total_cost_estimate: number
}

export interface MobileStoreUsage {
  location_id: string
  store_number: string | null
  store_location: string
  mobile_account_email: string
  calls_made: number
  minutes_used: number
  cost_estimate: number
  last_call_date: string | null
  status: 'active' | 'inactive' | 'disabled'
}

export interface MobileStoresResponse {
  summary: MobileStoreSummary
  stores: MobileStoreUsage[]
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const usageApi = {
  async getOverview(location_id?: string): Promise<UsageOverviewResponse> {
    const response = await axios.get(`${API_BASE}/org/usage/overview`, {
      params: { location_id },
      headers: getAuthHeaders()
    })
    return response.data
  },

  async getMobileStores(): Promise<MobileStoresResponse> {
    const response = await axios.get(`${API_BASE}/org/usage/mobile-stores`, {
      headers: getAuthHeaders()
    })
    return response.data
  }
}