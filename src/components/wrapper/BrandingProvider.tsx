'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/context/useAuthContext'
import { isOrgUser } from '@/types/auth'

/**
 * BrandingProvider applies organization-specific branding (colors)
 * by injecting CSS variables into the document root.
 */
const BrandingProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth()

    useEffect(() => {
        if (user && isOrgUser(user) && user.organization?.color_scheme) {
            const colors = user.organization.color_scheme
            if (colors.length >= 1) {
                const root = document.documentElement
                const primary = colors[0]
                const secondary = colors[1] || '#6c757d'

                // Apply to project-specific variables
                root.style.setProperty('--taplox-primary', primary)
                root.style.setProperty('--taplox-secondary', secondary)

                // Apply to standard Bootstrap variables
                // We also need to set the RGB versions for some Bootstrap utilities
                root.style.setProperty('--bs-primary', primary)
                root.style.setProperty('--bs-secondary', secondary)

                // Helper to convert hex to rgb
                const hexToRgb = (hex: string) => {
                    let r = 0, g = 0, b = 0;
                    // 3 digits
                    if (hex.length === 4) {
                        r = parseInt(hex[1] + hex[1], 16);
                        g = parseInt(hex[2] + hex[2], 16);
                        b = parseInt(hex[3] + hex[3], 16);
                    }
                    // 6 digits
                    else if (hex.length === 7) {
                        r = parseInt(hex.slice(1, 3), 16);
                        g = parseInt(hex.slice(3, 5), 16);
                        b = parseInt(hex.slice(5, 7), 16);
                    }
                    return `${r}, ${g}, ${b}`
                }

                try {
                    const primaryRgb = hexToRgb(primary)
                    const secondaryRgb = hexToRgb(secondary)

                    root.style.setProperty('--bs-primary-rgb', primaryRgb)
                    root.style.setProperty('--bs-secondary-rgb', secondaryRgb)
                    root.style.setProperty('--taplox-primary-rgb', primaryRgb)
                    root.style.setProperty('--taplox-secondary-rgb', secondaryRgb)
                } catch (e) {
                    console.error('Error applying branding colors:', e)
                }
            }
        } else {
            // Reset to defaults if no branding found or user logged out
            const root = document.documentElement
            root.style.removeProperty('--taplox-primary')
            root.style.removeProperty('--taplox-secondary')
            root.style.removeProperty('--bs-primary')
            root.style.removeProperty('--bs-secondary')
            root.style.removeProperty('--bs-primary-rgb')
            root.style.removeProperty('--bs-secondary-rgb')
        }
    }, [user])

    return <>{children}</>
}

export default BrandingProvider
