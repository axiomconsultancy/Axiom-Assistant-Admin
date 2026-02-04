// src/api/org/analytics.ts
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

export type AnalyticsPeriod = 'today' | 'last_7_days' | 'this_month' | 'all_time'

export interface TodayOverviewResponse {
  calls_today: number
  total_duration: string
  total_duration_seconds: number
  avg_duration: string
  avg_duration_seconds: number
  success_rate: number
  failed_calls: number
  unknown_calls: number
}

export interface TotalOverviewResponse {
  total_calls: number
  total_duration: string
  total_duration_seconds: number
  avg_call_duration: string
  avg_duration_seconds: number
  unique_callers: number
  repeat_callers: number
  new_callers: number
  total_success_rate: number
  total_failed_calls: number
  total_unknown_calls: number
}

export interface TimeSeriesDataPoint {
  date: string
  count: number
}

export interface CallsOverTimeResponse {
  period: AnalyticsPeriod
  time_series: TimeSeriesDataPoint[]
}

export interface CallDurationDistributionResponse {
  period: AnalyticsPeriod
  distribution: Record<string, number>
}

export interface HourlyVolumeDataPoint {
  hour: number
  count: number
}

export interface CallVolumeByHourResponse {
  period: AnalyticsPeriod
  hourly_volume: HourlyVolumeDataPoint[]
}

export interface DashboardOverview {
  total_calls: number
  total_duration: string
  total_duration_seconds: number
  avg_duration: string
  avg_duration_seconds: number
  success_rate: number
  failed_calls: number
  unknown_calls: number
  unique_callers: number
  repeat_callers: number
}

export interface DashboardResponse {
  period: AnalyticsPeriod
  overview: DashboardOverview
  calls_over_time: TimeSeriesDataPoint[]
  duration_distribution: Record<string, number>
  hourly_volume: HourlyVolumeDataPoint[]
}

export interface StoreAnalytics {
  location_id: string
  store_location: string
  store_number?: string
  call_count: number
  percentage_of_total: number
  avg_duration: string
  avg_duration_seconds: number
  success_rate: number
  trend: 'up' | 'down' | 'stable'
}

export interface StoreComparisonResponse {
  period: AnalyticsPeriod
  stores: StoreAnalytics[]
  total_calls: number
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const analyticsApi = {
  async getTodayOverview(location_id?: string): Promise<TodayOverviewResponse> {
    const response = await axios.get(`${API_BASE}/org/analytics/today-overview`, {
      params: { location_id },
      headers: getAuthHeaders()
    })
    return response.data
  },

  async getTotalOverview(location_id?: string): Promise<TotalOverviewResponse> {
    const response = await axios.get(`${API_BASE}/org/analytics/total-overview`, {
      params: { location_id },
      headers: getAuthHeaders()
    })
    return response.data
  },

  async getCallsOverTime(period: AnalyticsPeriod = 'last_7_days', location_id?: string): Promise<CallsOverTimeResponse> {
    const response = await axios.get(`${API_BASE}/org/analytics/calls-over-time`, {
      params: { period, location_id },
      headers: getAuthHeaders()
    })
    return response.data
  },

  async getCallDurationDistribution(period: AnalyticsPeriod = 'all_time', location_id?: string): Promise<CallDurationDistributionResponse> {
    const response = await axios.get(`${API_BASE}/org/analytics/call-duration-distribution`, {
      params: { period, location_id },
      headers: getAuthHeaders()
    })
    return response.data
  },

  async getCallVolumeByHour(period: AnalyticsPeriod = 'all_time', location_id?: string): Promise<CallVolumeByHourResponse> {
    const response = await axios.get(`${API_BASE}/org/analytics/call-volume-by-hour`, {
      params: { period, location_id },
      headers: getAuthHeaders()
    })
    return response.data
  },

  async getDashboard(period: AnalyticsPeriod = 'last_7_days', location_id?: string): Promise<DashboardResponse> {
    const response = await axios.get(`${API_BASE}/org/analytics/dashboard`, {
      params: { period, location_id },
      headers: getAuthHeaders()
    })
    return response.data
  },

  async getStoreComparison(period: AnalyticsPeriod = 'last_7_days'): Promise<StoreComparisonResponse> {
    const response = await axios.get(`${API_BASE}/org/analytics/store-comparison`, {
      params: { period },
      headers: getAuthHeaders()
    })
    return response.data
  }
}