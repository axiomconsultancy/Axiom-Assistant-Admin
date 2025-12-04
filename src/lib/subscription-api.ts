import { apiClient } from './api-client'
import type {
  SubscriptionPlan,
  SubscriptionPlanListResponse,
  SubscriptionPlanPayload,
  SubscribeRequest,
  SubscribeResponse,
} from '@/types/billing'

const ADMIN_PLANS_ENDPOINT = '/auth/admin/billing/plans'
const USER_SUBSCRIPTION_BASE = '/subscription'

// Admin-facing subscription plan management
export const subscriptionApi = {
  listPlans(token: string) {
    return apiClient.get<SubscriptionPlanListResponse | SubscriptionPlan[]>(ADMIN_PLANS_ENDPOINT, token)
  },
  createPlan(token: string, payload: SubscriptionPlanPayload) {
    return apiClient.post<SubscriptionPlan>(ADMIN_PLANS_ENDPOINT, payload, token)
  },
  updatePlan(token: string, planId: string, payload: SubscriptionPlanPayload) {
    return apiClient.put<SubscriptionPlan>(`${ADMIN_PLANS_ENDPOINT}/${planId}`, payload, token)
  },
  deletePlan(token: string, planId: string) {
    return apiClient.delete<void>(`${ADMIN_PLANS_ENDPOINT}/${planId}`, token)
  },
}

// User-facing subscription flows (Stripe)
export const userSubscriptionApi = {
  subscribe(payload: SubscribeRequest, token?: string) {
    return apiClient.post<SubscribeResponse>(`${USER_SUBSCRIPTION_BASE}/subscribe`, payload, token)
  },
  // Optional helpers for future enhancements
  updatePrice(payload: { price_id: string }, token?: string) {
    return apiClient.post<SubscribeResponse>(`${USER_SUBSCRIPTION_BASE}/update-price`, payload, token)
  },
  applyCoupon(payload: { coupon_code: string }, token?: string) {
    return apiClient.post<SubscribeResponse>(`${USER_SUBSCRIPTION_BASE}/apply-coupon`, payload, token)
  },
}

