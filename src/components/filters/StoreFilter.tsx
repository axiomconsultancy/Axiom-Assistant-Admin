import React, { useEffect, useState } from 'react'
import { Form } from 'react-bootstrap'
import { locationsApi, type Location } from '@/api/org/locations'
import { toast } from 'react-toastify'

interface StoreFilterProps {
    onFilterChange: (locationId: string | undefined) => void
    selectedLocationId?: string
}

const StoreFilter: React.FC<StoreFilterProps> = ({ onFilterChange, selectedLocationId }) => {
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchLocations = async () => {
            setLoading(true)
            try {
                const response = await locationsApi.list({ limit: 500 })
                // Filter only those that have mobile app enabled
                const enabledLocations = response.locations.filter(loc => loc.mobile_account_enabled)
                setLocations(enabledLocations)
            } catch (err) {
                console.error('Failed to fetch locations:', err)
                // Only toast if there's an actual error (not 404/Empty)
                // toast.error('Failed to load stores for filtering')
            } finally {
                setLoading(false)
            }
        }

        fetchLocations()
    }, [])

    if (locations.length === 0 && !loading) {
        return null
    }

    return (
        <div className="d-flex align-items-center gap-2">
            <span className="text-muted small fw-medium text-nowrap">Filter by Store:</span>
            <Form.Select
                size="sm"
                value={selectedLocationId || ''}
                onChange={(e) => onFilterChange(e.target.value || undefined)}
                disabled={loading}
                className="form-select-sm"
                style={{ minWidth: '180px' }}
            >
                <option value="">All Stores</option>
                {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                        {loc.store_number ? `#${loc.store_number} - ` : ''}{loc.store_location}
                    </option>
                ))}
            </Form.Select>
        </div>
    )
}

export default StoreFilter
