// src/config/verticals.ts

/**
 * Vertical Configurations
 * Maps vertical keys to their allowed menu items
 */

export type VerticalKey =
  | 'complaint'
  | 'food'
  | 'ecommerce'
  | 'hr'
  | 'spa'
  | 'salon'
  | 'clinic'
  | string // Allow dynamic verticals

export interface VerticalConfig {
  key: VerticalKey
  name: string
  allowedMenuKeys: string[]
  features?: {
    showAppEnabler?: boolean
  }
}

/**
 * Common menu items available to all verticals
 */
const COMMON_MENU_ITEMS = [
  'org-dashboard',
  'agent',
  'users-roles',
  'action-items',
  'call-records',
  'locations',
  'usage-billing',
  'faqs',
  'contact-support',
]

/**
 * Vertical-specific configurations
 */
export const VERTICAL_CONFIGS: Record<string, VerticalConfig> = {
  complaint: {
    key: 'complaint',
    name: 'Complaint Organization',
    allowedMenuKeys: [
      ...COMMON_MENU_ITEMS,
      'complaints',
    ],
    features: {
      showAppEnabler: true
    }
  },

  food: {
    key: 'food',
    name: 'Food Service',
    allowedMenuKeys: [
      ...COMMON_MENU_ITEMS,
      'orders',
    ],
    features: {
      showAppEnabler: false
    }
  },

  ecommerce: {
    key: 'ecommerce',
    name: 'E-Commerce',
    allowedMenuKeys: [
      ...COMMON_MENU_ITEMS,
      'orders',
    ],
    features: {
      showAppEnabler: false
    }
  },

  hr: {
    key: 'hr',
    name: 'Human Resources',
    allowedMenuKeys: [
      ...COMMON_MENU_ITEMS,
      'incident-reports',
    ],
    features: {
      showAppEnabler: false
    }
  },

  spa: {
    key: 'spa',
    name: 'Spa Services',
    allowedMenuKeys: [
      ...COMMON_MENU_ITEMS,
      'appointments',
    ],
    features: {
      showAppEnabler: false
    }
  },

  salon: {
    key: 'salon',
    name: 'Salon Services',
    allowedMenuKeys: [
      ...COMMON_MENU_ITEMS,
      'appointments',
    ],
    features: {
      showAppEnabler: false
    }
  },

  clinic: {
    key: 'clinic',
    name: 'Medical Clinic',
    allowedMenuKeys: [
      ...COMMON_MENU_ITEMS,
      'appointments',
    ],
    features: {
      showAppEnabler: false
    }
  },
}

/**
 * Get vertical configuration by key
 */
export const getVerticalConfig = (verticalKey?: string): VerticalConfig | null => {
  if (!verticalKey) return null
  return VERTICAL_CONFIGS[verticalKey] || null
}

/**
 * Check if a menu item is allowed for a vertical
 */
export const isMenuAllowedForVertical = (
  menuKey: string,
  verticalKey?: string
): boolean => {
  // Platform users see everything
  if (!verticalKey) return true

  const config = getVerticalConfig(verticalKey)
  if (!config) return true // Fallback: show if vertical not configured

  return config.allowedMenuKeys.includes(menuKey)
}