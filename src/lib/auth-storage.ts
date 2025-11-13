/**
 * Client-side storage utilities for authentication tokens and user data
 */

import type { TokenOut, UserOut } from '@/types/auth'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const TOKEN_EXPIRY_KEY = 'auth_token_expiry'

export const authStorage = {
  /**
   * Save authentication data to localStorage
   */
  saveAuth(tokenData: TokenOut): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(TOKEN_KEY, tokenData.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(tokenData.user))

      // Calculate expiry timestamp (current time + expires_in seconds)
      const expiryTime = Date.now() + tokenData.expires_in * 1000
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
    } catch (error) {
      console.error('Error saving auth data:', error)
    }
  },

  /**
   * Get authentication token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      // Check if token is expired
      if (token && this.isTokenExpired()) {
        this.clearAuth()
        return null
      }

      return token
    } catch (error) {
      console.error('Error getting token:', error)
      return null
    }
  },

  /**
   * Get user data
   */
  getUser(): UserOut | null {
    if (typeof window === 'undefined') return null

    try {
      const userJson = localStorage.getItem(USER_KEY)
      if (!userJson) return null

      return JSON.parse(userJson) as UserOut
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true

    try {
      const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY)
      if (!expiryTime) return true

      return Date.now() >= parseInt(expiryTime)
    } catch (error) {
      console.error('Error checking token expiry:', error)
      return true
    }
  },

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_EXPIRY_KEY)
    } catch (error) {
      console.error('Error clearing auth data:', error)
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken()
    return token !== null && !this.isTokenExpired()
  },

  /**
   * Get user role
   */
  getUserRole(): 'admin' | 'user' | null {
    const user = this.getUser()
    return user?.role || null
  },
}

