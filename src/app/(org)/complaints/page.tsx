'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Row, Col, Button, Badge, Modal, Card, Form, Spinner, Dropdown } from 'react-bootstrap'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import IconifyIcon from '@/components/wrapper/IconifyIcon'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/context/useAuthContext'
import { DataTable } from '@/components/table'
import type { DataTableColumn, DataTableFilterControl } from '@/components/table'
import { toast } from 'react-toastify'
import { complaintsApi, type Complaint, type ComplaintsListParams, type ComplaintSeverity, type ComplaintStatus } from '@/api/org/complaints'
import { callLogsApi, type CallLog } from '@/api/org/call-logs'
import { locationsApi, type Location } from '@/api/org/locations'
import { useFeatureGuard } from '@/hooks/useFeatureGuard'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { IncidentDescriptionViewer } from '@/components/IncidentDescriptionViewer'

// Custom Status Dropdown Component
const StatusDropdown = ({
  currentStatus,
  onStatusChange,
  isUpdating = false,
  disabled = false
}: {
  currentStatus: ComplaintStatus
  onStatusChange: (newStatus: ComplaintStatus) => void
  isUpdating?: boolean
  disabled?: boolean
}) => {
  const statusConfig = {
    pending: {
      label: 'New',
      icon: 'solar:clock-circle-bold',
      color: '#dc3545',
      bgColor: '#fff5f500'
    },
    in_progress: {
      label: 'In Progress',
      icon: 'solar:settings-bold',
      color: '#fd7e14',
      bgColor: '#fff8f000'
    },
    resolved: {
      label: 'Resolved',
      icon: 'solar:check-circle-bold',
      color: '#198754',
      bgColor: '#f0fdf400'
    }
  }

  const current = statusConfig[currentStatus]

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant="light"
        disabled={disabled || isUpdating}
        bsPrefix="dropdown-toggle-no-caret"
        style={{
          backgroundColor: current.bgColor,
          border: `1.5px solid ${current.color}`,
          color: current.color,
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          minWidth: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}
      >
        {isUpdating ? (
          <>
            <Spinner size="sm" />
            <span>Updating...</span>
          </>
        ) : (
          <>
            <div className="d-flex align-items-center gap-2">
              <IconifyIcon icon={current.icon} width={16} height={16} />
              <span>{current.label}</span>
            </div>
          </>
        )}
        <IconifyIcon icon="solar:alt-arrow-down-bold" />

      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: '180px' }}>
        {Object.entries(statusConfig).map(([status, config]) => (
          <Dropdown.Item
            key={status}
            onClick={() => onStatusChange(status as ComplaintStatus)}
            active={currentStatus === status}
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: currentStatus === status ? 600 : 400
            }}
          >
            <IconifyIcon
              icon={config.icon}
              width={18}
              height={18}
              style={{ color: config.color }}
            />
            <span>{config.label}</span>
            {currentStatus === status && (
              <IconifyIcon
                icon="solar:check-circle-bold"
                width={16}
                height={16}
                className="ms-auto"
                style={{ color: config.color }}
              />
            )}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  )
}

// Enhanced Progress Button for Audio
const ProgressButton = ({
  progress,
  onClick,
  title,
  icon,
  variant = "outline-danger",
}: {
  progress: number
  onClick: (e?: any) => void
  title: string
  icon: React.ReactNode
  variant?: string
}) => {
  const size = 36
  const stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#198754"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.1s linear",
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />
      </svg>

      <Button
        variant={variant as any}
        size="sm"
        onClick={onClick}
        title={title}
        style={{
          width: size,
          height: size,
          padding: 0,
          position: "relative",
          zIndex: 2,
          borderRadius: '8px',
        }}
      >
        {icon}
      </Button>
    </div>
  )
}

const ComplaintsPage = () => {
  useFeatureGuard()
  const { token, isAuthenticated, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const verticalKey = user && 'organization' in user ? user.organization?.vertical_key : undefined
  const isHR = verticalKey === 'hr'

  const terminology = {
    complaint: isHR ? 'Incident' : 'Complaint',
    complaints: isHR ? 'Incidents' : 'Complaints',
    incident_report: isHR ? 'Incident Report' : 'Complaint',
    incident_reports: isHR ? 'Incident Reports' : 'Complaints',
    issue_type: isHR ? 'Incident Type' : 'Issue Type',
    description: isHR ? 'Incident Details' : 'Description',
  }

  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | ComplaintSeverity>('all')
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [callLogIdFilter, setCallLogIdFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null)
  const [showCallLogModal, setShowCallLogModal] = useState(false)
  const [loadingCallLog, setLoadingCallLog] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [showCallbackModal, setShowCallbackModal] = useState(false)
  const [callbackComplaint, setCallbackComplaint] = useState<Complaint | null>(null)

  const shownNotifications = useRef<Set<string>>(new Set())

  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playProgress, setPlayProgress] = useState<Record<string, number>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const playingIdRef = useRef<string | null>(null)

  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (statusParam) {
      const validStatuses: ComplaintStatus[] = ['pending', 'in_progress', 'resolved']
      if (validStatuses.includes(statusParam as ComplaintStatus)) {
        setStatusFilter(statusParam as ComplaintStatus)
      }
    }

    const callLogIdParam = searchParams.get('call_log_id')
    if (callLogIdParam) {
      setCallLogIdFilter(callLogIdParam)
    }
  }, [searchParams])

  const stopAudio = useCallback((silent = true) => {
    const audio = audioRef.current
    const currentId = playingIdRef.current

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }

    playingIdRef.current = null
    setPlayingId(null)

    if (currentId) {
      setPlayProgress((prev) => ({ ...prev, [currentId]: 0 }))
    }
  }, [])

  const playAudio = useCallback(async (id: string, recordingLink: string) => {
    if (!recordingLink) return

    if (playingIdRef.current === id) {
      stopAudio()
      return
    }

    stopAudio(true)

    const audio = new Audio(recordingLink)
    audioRef.current = audio
    playingIdRef.current = id
    setPlayingId(id)

    const updateProgress = () => {
      const a = audioRef.current
      if (!a) return

      const duration = a.duration || 0
      const current = a.currentTime || 0
      const progress = duration > 0 ? current / duration : 0

      setPlayProgress((prev) => ({ ...prev, [id]: progress }))
      rafRef.current = requestAnimationFrame(updateProgress)
    }

    audio.onended = () => stopAudio()
    audio.onerror = () => {
      toast.error("Unable to play recording")
      stopAudio()
    }

    try {
      await audio.play()
      rafRef.current = requestAnimationFrame(updateProgress)
    } catch (err: any) {
      if (err?.name === "AbortError") return
      toast.error("Unable to play recording")
      console.error("Audio playback error:", err)
      stopAudio()
    }
  }, [stopAudio])

  useEffect(() => {
    return () => stopAudio()
  }, [stopAudio])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase())
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, severityFilter, selectedLocationIds])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (locationDropdownOpen && !target.closest('.location-dropdown-container')) {
        setLocationDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [locationDropdownOpen])

  const fetchLocations = useCallback(async () => {
    if (!token || !isAuthenticated) return

    setLoadingLocations(true)
    try {
      const response = await locationsApi.list({ skip: 0, limit: 500 })
      setLocations(response.locations)
    } catch (err: any) {
      console.error('Failed to load locations:', err)
    } finally {
      setLoadingLocations(false)
    }
  }, [token, isAuthenticated])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const fetchComplaints = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params: ComplaintsListParams = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        sort: 'newest',
      }

      if (debouncedSearch) {
        params.search = debouncedSearch
      }

      if (statusFilter !== 'all') {
        params.status_filter = statusFilter
      }

      if (severityFilter !== 'all') {
        params.severity_filter = severityFilter
      }

      if (selectedLocationIds.length > 0) {
        params.location_ids = selectedLocationIds
      }

      if (callLogIdFilter) {
        params.call_log_id = callLogIdFilter
      }

      const response = await complaintsApi.list(params)

      setComplaints(response.complaints)
      setTotal(response.total)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to fetch complaints')
      toast.error('Unable to load complaints')
      setComplaints([])
    } finally {
      setLoading(false)
    }
  }, [token, isAuthenticated, currentPage, pageSize, debouncedSearch, statusFilter, severityFilter, selectedLocationIds, callLogIdFilter])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  useEffect(() => {
    if (!loading && callLogIdFilter && complaints.length > 0) {
      // Auto-open if we're filtering by call_log_id
      const matchingComplaint = complaints.find(c => c.call_log_id === callLogIdFilter)
      if (matchingComplaint) {
        setSelectedComplaint(matchingComplaint)
        setShowDetailModal(true)
      }
    }
  }, [complaints, loading, callLogIdFilter])

  // useRealtimeRefresh(fetchComplaints)
  useRealtimeRefresh(fetchComplaints, ['call_logs_refresh'])



  const fetchAndUpdateBadgeCounts = useCallback(async () => {
    if (!token || !isAuthenticated) return

    try {
      const [pendingResponse, inProgressResponse] = await Promise.all([
        complaintsApi.getPendingCount(),
        complaintsApi.getInProgressCount()
      ])

      window.dispatchEvent(new CustomEvent('complaintsCountUpdated', {
        detail: {
          pendingCount: pendingResponse.pending_count,
          inProgressCount: inProgressResponse.in_progress_count
        }
      }))
    } catch (err) {
      console.error('Failed to fetch complaint counts:', err)
    }
  }, [token, isAuthenticated])

  useEffect(() => {
    if (!loading && complaints.length >= 0) {
      fetchAndUpdateBadgeCounts()
    }
  }, [complaints, loading, fetchAndUpdateBadgeCounts])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startIndex = (currentPage - 1) * pageSize

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handlePlayFromComplaint = useCallback(async (complaint: Complaint) => {
    if (!complaint.call_log_id) return

    try {
      const callLog = await callLogsApi.getById(complaint.call_log_id)

      if (!callLog.recording_link) {
        toast.info('Recording not available')
        return
      }

      playAudio(complaint.id, callLog.recording_link)
    } catch (err) {
      toast.error("Unable to load recording")
    }
  }, [playAudio])

  const handleStatusChange = useCallback(async (complaint: Complaint, newStatus: ComplaintStatus) => {
    setUpdatingStatusId(complaint.id)
    try {
      await complaintsApi.updateStatus(complaint.id, { status: newStatus })

      setComplaints(prev => prev.map(c =>
        c.id === complaint.id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c
      ))

      if (selectedComplaint && selectedComplaint.id === complaint.id) {
        setSelectedComplaint({ ...selectedComplaint, status: newStatus, updated_at: new Date().toISOString() })
      }

      window.dispatchEvent(new CustomEvent('complaintStatusChanged'))

      toast.success(`Status updated successfully`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setUpdatingStatusId(null)
    }
  }, [selectedComplaint])

  const handleViewDetails = useCallback((complaint: Complaint) => {
    setSelectedComplaint(complaint)
    setShowDetailModal(true)
  }, [])

  const handleViewCallLog = useCallback(async (callLogId: string) => {
    if (!token || !isAuthenticated) return

    setLoadingCallLog(true)
    setAudioError(null)

    try {
      const callLog = await callLogsApi.getById(callLogId)
      setShowDetailModal(false)
      setSelectedCallLog(callLog)
      setShowCallLogModal(true)
    } catch (err: any) {
      toast.error('Unable to load call details')
      console.error('Failed to fetch call log:', err)
    } finally {
      setLoadingCallLog(false)
    }
  }, [token, isAuthenticated])

  const handleNavigateToCallLog = useCallback((callLogId: string) => {
    setShowDetailModal(false)
    setShowCallLogModal(false)
    router.push(`/call-records?openCallId=${callLogId}`)
  }, [router])

  const handleOpenCallbackModal = useCallback((complaint: Complaint) => {
    setCallbackComplaint(complaint)
    setShowCallbackModal(true)
  }, [])

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateDuration = (start: string, end: string): string => {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const durationMs = endTime - startTime
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const getSeverityBadgeColor = (severity?: string): string => {
    switch (severity) {
      case 'critical': return 'danger'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getSeverityLabel = (severity?: string): string => {
    switch (severity) {
      case 'critical': return 'URGENT'
      case 'high': return 'HIGH'
      case 'medium': return 'MEDIUM'
      case 'low': return 'LOW'
      default: return 'N/A'
    }
  }

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocationIds(prev => {
      if (prev.includes(locationId)) {
        return prev.filter(id => id !== locationId)
      } else {
        return [...prev, locationId]
      }
    })
  }

  const getPageTitle = () => {
    if (statusFilter === 'pending') return `New ${terminology.complaints}`
    if (statusFilter === 'in_progress') return `${terminology.complaints} In Progress`
    if (statusFilter === 'resolved') return `Resolved ${terminology.complaints}`
    return isHR ? terminology.incident_reports : 'Customer Complaints'
  }

  const dataTableColumns: DataTableColumn<Complaint>[] = useMemo(
    () => [
      {
        key: 'rowNumber',
        header: '#',
        width: 60,
        align: 'left',
        render: (_, { rowIndex }) => (
          <span className="text-muted fw-semibold">{startIndex + rowIndex + 1}</span>
        )
      },
      {
        key: 'customer',
        header: 'Customer Details',
        minWidth: 180,
        render: (complaint) => (
          <div>
            <div className="fw-bold mb-1" style={{ fontSize: '0.95rem' }}>
              {(!complaint.customer.customer_name || complaint.customer.customer_name.toLowerCase() === 'unknown' || complaint.customer.customer_name.toLowerCase() === 'unknown customer') ? 'Not Mentioned' : complaint.customer.customer_name}
            </div>
            {complaint.customer.contact_phone && (
              <small className="text-muted d-flex align-items-center gap-1">
                <IconifyIcon icon="solar:phone-linear" width={14} height={14} />
                {complaint.customer.contact_phone}
              </small>
            )}
            {complaint.customer.contact_email && (
              <small className="text-muted d-flex align-items-center gap-1 mt-1">
                <IconifyIcon icon="solar:letter-linear" width={14} height={14} />
                {complaint.customer.contact_email}
              </small>
            )}
          </div>
        )
      },
      {
        key: 'store_info',
        header: 'Store Location',
        minWidth: 150,
        render: (complaint) => (
          <div>
            {complaint.store.store_location && (
              <div className="fw-semibold mb-1">
                {complaint.store.store_location}
              </div>
            )}
            {complaint.store.store_number && (
              <div className="d-flex align-items-center gap-2 mt-1">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 20,
                    height: 20,
                    background: '#E3F2FD',
                    color: '#1976D2'
                  }}
                >
                  <IconifyIcon icon="solar:shop-bold" width={12} height={12} />
                </div>
                <span style={{ fontSize: '0.85rem', color: '#1976D2', fontWeight: 600 }}>
                  Store #{complaint.store.store_number}
                </span>
              </div>
            )}
            {!complaint.store.store_number && !complaint.store.store_location && (
              <span className="text-muted fst-italic">Not specified</span>
            )}
          </div>
        )
      },
      {
        key: 'complaint_type',
        header: terminology.issue_type,
        minWidth: 150,
        render: (complaint) => (
          <div>
            <div className="fw-semibold mb-1">{complaint.complaint_type || (isHR ? 'General Incident' : 'General Complaint')}</div>
            {complaint.receipt_status !== 'unknown' && (
              <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                Receipt: <span className="text-capitalize">{complaint.receipt_status}</span>
              </small>
            )}
          </div>
        )
      },
      {
        key: 'description',
        header: 'Description',
        minWidth: 300,
        render: (complaint) => (
          <div
            className="text-truncate"
            style={{ maxWidth: '300px' }}
            title={complaint.complaint_description || ''}
          >
            {complaint.complaint_description || 'No description provided'}
          </div>
        )
      },
      {
        key: 'severity',
        header: 'Priority',
        width: 120,
        align: 'left',
        render: (complaint) => {
          const severityConfig = {
            critical: { bg: '#FFEBEE', color: '#C62828', icon: 'solar:danger-triangle-bold', label: 'URGENT' },
            high: { bg: '#FFF3E0', color: '#F57C00', icon: 'solar:danger-bold', label: 'HIGH' },
            medium: { bg: '#E1F5FE', color: '#0288D1', icon: 'solar:info-circle-bold', label: 'MEDIUM' },
            low: { bg: '#F5F5F5', color: '#757575', icon: 'solar:check-circle-bold', label: 'LOW' }
          }[complaint.complaint_severity || 'low'] || { bg: '#F5F5F5', color: '#757575', icon: 'solar:question-circle-bold', label: 'N/A' }

          return (
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: 24,
                  height: 24,
                  background: severityConfig.bg,
                  color: severityConfig.color
                }}
              >
                <IconifyIcon icon={severityConfig.icon} width={14} height={14} />
              </div>
              <span className="fw-semibold" style={{ fontSize: '0.85rem', color: severityConfig.color }}>
                {severityConfig.label}
              </span>
            </div>
          )
        }
      },
      {
        key: 'status',
        header: `${terminology.complaint} Status`,
        width: 180,
        align: 'left',
        sticky: 'right',
        render: (complaint) => (
          <StatusDropdown
            currentStatus={complaint.status}
            onStatusChange={(newStatus) => handleStatusChange(complaint, newStatus)}
            isUpdating={updatingStatusId === complaint.id}
          />
        )
      },
      {
        key: 'escalation',
        header: 'Needs Callback',
        width: 140,
        align: 'center',
        sticky: 'right',
        defaultSticky: true,
        render: (complaint) => (
          <div className="d-flex justify-content-center">
            {complaint.escalation.manager_callback_needed ? (
              <Badge
                bg="danger"
                className="d-flex align-items-center gap-1"
                onClick={() => handleOpenCallbackModal(complaint)}
                style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}
              >
                <IconifyIcon icon="solar:phone-calling-bold" width={14} height={14} />
                Yes
              </Badge>
            ) : (
              <Badge
                bg="light"
                text="muted"
                style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
              >
                No
              </Badge>
            )}
          </div>
        )
      },
      {
        key: 'created_at',
        header: 'Submitted',
        minWidth: 160,
        render: (complaint) => (
          <div className="small text-muted">{formatDateTime(complaint.created_at)}</div>
        )
      },
      {
        key: 'actions',
        header: 'Staff Actions',
        width: 160,
        align: 'left',
        sticky: 'right',
        render: (complaint) => {
          const isPlaying = playingId === complaint.id
          const progress = playProgress[complaint.id] || 0

          return (
            <div className="d-flex gap-2 align-items-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleViewDetails(complaint)}
                title="View Full Details"
                style={{ borderRadius: '8px' }}
              >
                {/* <IconifyIcon icon="solar:eye-bold" width={16} height={16} /> */}
                View
              </Button>

              {complaint.call_log_id ? (
                isPlaying ? (
                  <ProgressButton
                    progress={progress}
                    onClick={(e) => {
                      e?.stopPropagation?.()
                      stopAudio()
                    }}
                    title="Stop Recording"
                    variant="outline-danger"
                    icon={<IconifyIcon icon="solar:stop-bold" width={16} height={16} />}
                  />
                ) : (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={(e) => {
                      e?.stopPropagation?.()
                      handlePlayFromComplaint(complaint)
                    }}
                    title="Play Call Recording"
                    style={{ borderRadius: '8px' }}
                  >
                    <IconifyIcon icon="solar:play-bold" width={16} height={16} />
                  </Button>
                )
              ) : (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled
                  title="No Recording Available"
                  style={{ opacity: 0.4, borderRadius: '8px' }}
                >
                  <IconifyIcon icon="solar:play-bold" width={16} height={16} />
                </Button>
              )}
            </div>
          )
        }
      }
    ],
    [
      startIndex,
      handleViewDetails,
      playingId,
      playProgress,
      handlePlayFromComplaint,
      stopAudio,
      updatingStatusId,
      handleStatusChange
    ]
  )

  const toolbarFilters: DataTableFilterControl[] = useMemo(
    () => [
      {
        id: 'status-filter',
        label: 'Status',
        type: 'select',
        value: statusFilter === 'all' ? '' : statusFilter,
        options: [
          { label: 'All Statuses', value: '' },
          { label: 'New', value: 'pending' },
          { label: 'Working On It', value: 'in_progress' },
          { label: 'Resolved', value: 'resolved' }
        ],
        onChange: (value) => {
          const newStatus = (value || 'all') as 'all' | ComplaintStatus
          setStatusFilter(newStatus)
          setCurrentPage(1)

          const params = new URLSearchParams(window.location.search)
          if (newStatus === 'all') {
            params.delete('status')
          } else {
            params.set('status', newStatus)
          }
          router.replace(`/complaints${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
        },
        onClear: statusFilter !== 'all' ? () => {
          setStatusFilter('all')
          setCurrentPage(1)

          const params = new URLSearchParams(window.location.search)
          params.delete('status')
          router.replace(`/complaints${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
        } : undefined,
        width: 4
      },
      {
        id: 'severity-filter',
        label: 'Priority Level',
        type: 'select',
        value: severityFilter === 'all' ? '' : severityFilter,
        options: [
          { label: 'All Priorities', value: '' },
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Urgent', value: 'critical' }
        ],
        onChange: (value) => {
          setSeverityFilter((value || 'all') as any)
          setCurrentPage(1)
        },
        onClear: severityFilter !== 'all' ? () => {
          setSeverityFilter('all')
          setCurrentPage(1)
        } : undefined,
        width: 4
      }
    ],
    [statusFilter, severityFilter, router]
  )

  if (!isAuthenticated) {
    return (
      <Row>
        <Col xs={12}>
          <div className="text-center py-5">
            <IconifyIcon icon="solar:lock-password-linear" width={64} height={64} className="text-muted mb-3" />
            <h4 className="mb-3">Authentication Required</h4>
            <p className="text-muted mb-4">Please sign in to view and manage customer complaints.</p>
            <Link href="/auth/sign-in">
              <Button variant="primary" size="lg">Sign In</Button>
            </Link>
          </div>
        </Col>
      </Row>
    )
  }



  return (
    <>
      <Row>
        <Col xs={12}>
          <div className="page-title-box d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h4 className="mb-2">{getPageTitle()}</h4>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link href="/">AI Assistant</Link>
                </li>
                <div className="mx-1" style={{ height: 24, paddingRight: '8px' }}>
                  <IconifyIcon icon="bx:chevron-right" height={16} width={16} />
                </div>
                <li className="breadcrumb-item active">{terminology.complaints}</li>
              </ol>
            </div>
          </div>
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <DataTable
            id="complaints-table"
            title={getPageTitle()}
            description={`Track and manage ${terminology.complaint.toLowerCase()} reports across all locations`}
            columns={dataTableColumns}
            data={complaints}
            rowKey={(complaint) => complaint.id}
            loading={loading}
            error={error}
            onRetry={fetchComplaints}
            toolbar={{
              showFilters,
              onToggleFilters: () => setShowFilters((prev) => !prev),
              search: {
                value: searchQuery,
                placeholder: 'Search by customer name, phone, email, or issue description...',
                onChange: setSearchQuery,
                onClear: () => setSearchQuery('')
              },
              filters: toolbarFilters,
              extra: showFilters ? (
                <div
                  className="position-relative d-flex location-dropdown-container flex-grow-1"
                  style={{ width: 350 }}
                >
                  <button
                    type="button"
                    className="btn shadow-sm border w-100 d-flex justify-content-between align-items-center"
                    style={{ borderRadius: '8px', padding: '0.625rem 1rem' }}
                    onClick={() => setLocationDropdownOpen((v) => !v)}
                  >
                    <span className="text-truncate d-flex align-items-center gap-2">
                      <IconifyIcon icon="solar:map-point-linear" width={18} height={18} />
                      {selectedLocationIds.length === 0
                        ? 'Filter by Store Location'
                        : `${selectedLocationIds.length} location${selectedLocationIds.length > 1 ? 's' : ''} selected`}
                    </span>

                    <div className="d-flex align-items-center gap-2">
                      {selectedLocationIds.length > 0 && (
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                          style={{
                            width: 20,
                            height: 20,
                            backgroundColor: '#1976D2',
                            color: '#fff',
                            fontSize: '0.7rem'
                          }}
                        >
                          {selectedLocationIds.length}
                        </div>
                      )}
                      <IconifyIcon
                        icon={
                          locationDropdownOpen
                            ? 'solar:alt-arrow-up-linear'
                            : 'solar:alt-arrow-down-linear'
                        }
                        width={16}
                        height={16}
                      />
                    </div>
                  </button>

                  {selectedLocationIds.length > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="position-absolute p-0 text-muted"
                      style={{
                        right: 42,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 5
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLocationIds([])
                      }}
                      title="Clear location filters"
                    >
                      <IconifyIcon icon="solar:close-circle-linear" width={18} height={18} />
                    </Button>
                  )}

                  {locationDropdownOpen && (
                    <div
                      className="position-absolute w-100 mt-2 bg-white border rounded shadow-lg"
                      style={{
                        maxHeight: 360,
                        overflowY: 'auto',
                        zIndex: 1050,
                        top: '100%',
                        borderRadius: '8px'
                      }}
                    >
                      <div className="px-3 py-2 border-bottom bg-light">
                        <Form.Check
                          type="checkbox"
                          checked={selectedLocationIds.length === 0}
                          label={<strong>All Locations</strong>}
                          onChange={() => setSelectedLocationIds([])}
                        />
                      </div>

                      {loadingLocations && (
                        <div className="px-3 py-3 text-center">
                          <Spinner size="sm" className="me-2" />
                          <span className="text-muted small">Loading locations...</span>
                        </div>
                      )}

                      {!loadingLocations && locations.length === 0 && (
                        <div className="px-3 py-3 text-center text-muted small">
                          <IconifyIcon icon="solar:map-point-linear" width={24} height={24} className="mb-2" />
                          <div>No locations available</div>
                        </div>
                      )}

                      {!loadingLocations &&
                        locations.map((location) => {
                          const label = location.store_number
                            ? `Store #${location.store_number} – ${location.store_location}`
                            : location.store_location

                          return (
                            <div key={location.id} className="px-3 py-2 hover-bg-light">
                              <Form.Check
                                type="checkbox"
                                checked={selectedLocationIds.includes(location.id)}
                                onChange={() => handleLocationToggle(location.id)}
                                label={
                                  <span className="d-block text-truncate" title={label}>
                                    {label}
                                  </span>
                                }
                              />
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              ) : undefined
            }}
            columnPanel={{
              enableColumnVisibility: true,
              enableSticky: true,
              maxSticky: 4
            }}
            pagination={{
              currentPage,
              pageSize,
              totalRecords: total,
              totalPages,
              onPageChange: setCurrentPage,
              onPageSizeChange: setPageSize,
              pageSizeOptions: [10, 25, 50],
              startRecord: startIndex + 1,
              endRecord: Math.min(startIndex + pageSize, total)
            }}
            emptyState={{
              title: `No ${terminology.complaints} Found`,
              description: debouncedSearch
                ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                : `There are no ${terminology.complaint.toLowerCase()} reports at this time. New ${terminology.complaints.toLowerCase()} will appear here.`
            }}
          />
        </Col>
      </Row>

      {/* Complaint Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">{terminology.incident_report} Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedComplaint && (
            <>
              {/* Status Badge at Top */}
              <div className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted d-block mb-2">Current Status</small>
                  <StatusDropdown
                    currentStatus={selectedComplaint.status}
                    onStatusChange={(newStatus) => handleStatusChange(selectedComplaint, newStatus)}
                    isUpdating={updatingStatusId === selectedComplaint.id}
                  />
                </div>
                <div className="text-end">
                  <small className="text-muted d-block mb-1">Priority Level</small>
                  <strong style={{ fontSize: '0.95rem', color: getSeverityBadgeColor(selectedComplaint.complaint_severity) === 'danger' ? '#C62828' : getSeverityBadgeColor(selectedComplaint.complaint_severity) === 'warning' ? '#F57C00' : getSeverityBadgeColor(selectedComplaint.complaint_severity) === 'info' ? '#0288D1' : '#757575' }}>
                    {getSeverityLabel(selectedComplaint.complaint_severity)}
                  </strong>
                </div>
              </div>

              {/* Customer Info Card */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light border-0">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <IconifyIcon icon="solar:user-bold" width={20} height={20} className="text-primary" />
                    Customer Information
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Name</small>
                      <strong>{(!selectedComplaint.customer.customer_name || selectedComplaint.customer.customer_name.toLowerCase() === 'unknown' || selectedComplaint.customer.customer_name.toLowerCase() === 'unknown customer') ? 'Not Mentioned' : selectedComplaint.customer.customer_name}</strong>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Phone Number</small>
                      <strong>{selectedComplaint.customer.contact_phone || 'Not provided'}</strong>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Email Address</small>
                      <strong>{selectedComplaint.customer.contact_email || 'Not provided'}</strong>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Callback Number Verified</small>
                      <strong>{selectedComplaint.customer.callback_phone_confirmed ? 'Yes' : 'No'}</strong>
                    </Col>
                    {selectedComplaint.customer.mailing_address && (
                      <Col xs={12}>
                        <small className="text-muted d-block mb-1">Mailing Address</small>
                        <strong>{selectedComplaint.customer.mailing_address}</strong>
                      </Col>
                    )}
                  </Row>
                </Card.Body>
              </Card>

              {/* Store Info Card */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light border-0">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <IconifyIcon icon="solar:shop-bold" width={20} height={20} className="text-primary" />
                    Store Information
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {selectedComplaint.store.store_number && (
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Store Number</small>
                        <strong>#{selectedComplaint.store.store_number}</strong>
                      </Col>
                    )}
                    {selectedComplaint.store.store_location && (
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Location</small>
                        <strong style={{ fontSize: '0.95rem' }}>{selectedComplaint.store.store_location}</strong>
                      </Col>
                    )}
                    {selectedComplaint.store.store_phone && (
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Store Phone</small>
                        <strong>{selectedComplaint.store.store_phone}</strong>
                      </Col>
                    )}
                    {selectedComplaint.store.store_address && (
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Store Address</small>
                        <strong>{selectedComplaint.store.store_address}</strong>
                      </Col>
                    )}
                    {selectedComplaint.store.store_zip_code && (
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Zip Code</small>
                        <strong>{selectedComplaint.store.store_zip_code}</strong>
                      </Col>
                    )}
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Customer Currently at Store</small>
                      <strong>{selectedComplaint.store.customer_at_store ? 'Yes' : 'No'}</strong>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Complaint Details Card */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light border-0">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <IconifyIcon icon="solar:document-text-bold" width={20} height={20} className="text-primary" />
                    {isHR ? 'Incident Report' : 'Issue Details'}
                  </h6>
                </Card.Header>
                <Card.Body>
                  {isHR ? (
                    <IncidentDescriptionViewer
                      description={selectedComplaint.complaint_description || 'No description provided'}
                    />
                  ) : (
                    <Row className="g-3">
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">{terminology.issue_type}</small>
                        <strong>{selectedComplaint.complaint_type || 'General Complaint'}</strong>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Receipt Status</small>
                        <strong className="text-capitalize">{(!selectedComplaint.receipt_status || selectedComplaint.receipt_status.toLowerCase() === 'unknown') ? 'Not Mentioned' : selectedComplaint.receipt_status}</strong>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Delivery Method</small>
                        <strong className="text-capitalize">{selectedComplaint.delivery_method || 'Not specified'}</strong>
                      </Col>
                      <Col xs={12}>
                        <small className="text-muted d-block mb-2">Description</small>
                        <p className="mb-0 p-3 bg-light rounded">
                          {selectedComplaint.complaint_description || 'No description provided'}
                        </p>
                      </Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>

              {/* Resolution Card */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light border-0">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <IconifyIcon icon="solar:check-circle-bold" width={20} height={20} className="text-success" />
                    Resolution Offered
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {selectedComplaint.resolution.voucher_type && (
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Voucher Type</small>
                        <strong className="text-capitalize">{selectedComplaint.resolution.voucher_type}</strong>
                      </Col>
                    )}
                    {selectedComplaint.resolution.voucher_value && (
                      <Col md={6}>
                        <small className="text-muted d-block mb-1">Voucher Value</small>
                        <strong>{selectedComplaint.resolution.voucher_value}</strong>
                      </Col>
                    )}
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Immediate Replacement</small>
                      <strong>{selectedComplaint.resolution.immediate_replacement_offered ? 'Offered' : 'Not Offered'}</strong>
                    </Col>
                    {selectedComplaint.resolution.replacement_details && (
                      <Col xs={12}>
                        <small className="text-muted d-block mb-2">Replacement Details</small>
                        <p className="mb-0 p-3 bg-light rounded">{selectedComplaint.resolution.replacement_details}</p>
                      </Col>
                    )}
                  </Row>
                </Card.Body>
              </Card>

              {/* Escalation Card */}
              {selectedComplaint.escalation.manager_callback_needed && (
                <Card className="mb-3 border-danger shadow-sm">
                  <Card.Header className="bg-danger bg-opacity-10 border-danger">
                    <h6 className="mb-0 text-danger d-flex align-items-center gap-2">
                      <IconifyIcon icon="solar:danger-circle-bold" width={20} height={20} />
                      Manager Callback Required
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      {selectedComplaint.escalation.callback_timeline && (
                        <Col md={6}>
                          <small className="text-muted d-block mb-1">Callback Timeline</small>
                          <strong>{selectedComplaint.escalation.callback_timeline}</strong>
                        </Col>
                      )}
                      {selectedComplaint.escalation.callback_reasons && selectedComplaint.escalation.callback_reasons.length > 0 && (
                        <Col xs={12}>
                          <small className="text-muted d-block mb-2">Reasons for Callback</small>
                          <ul className="mb-0">
                            {selectedComplaint.escalation.callback_reasons.map((reason, idx) => (
                              <li key={idx}><strong>{reason}</strong></li>
                            ))}
                          </ul>
                        </Col>
                      )}
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* Metadata Card */}
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light border-0">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <IconifyIcon icon="solar:info-circle-bold" width={20} height={20} className="text-primary" />
                    Timeline
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Submitted On</small>
                      <strong className="small">{formatDateTime(selectedComplaint.created_at)}</strong>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Last Updated</small>
                      <strong className="small">{formatDateTime(selectedComplaint.updated_at)}</strong>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 justify-content-between">
          <div className="d-flex gap-2">
            {selectedComplaint && (
              <>
                <Link href={`/call-records?openCallId=${selectedComplaint.call_log_id}`} passHref legacyBehavior>
                  <Button
                    variant="outline-info"
                    style={{ borderRadius: '8px' }}
                    className="d-flex align-items-center"
                  >
                    <IconifyIcon icon="solar:phone-bold" width={18} height={18} className="me-2" />
                    View Original Call
                  </Button>
                </Link>
                <Link href={`/action-items?call_id=${selectedComplaint.call_log_id}`} passHref legacyBehavior>
                  <Button
                    variant="outline-info"
                    style={{ borderRadius: '8px' }}
                    className="d-flex align-items-center"
                  >
                    <IconifyIcon icon="solar:checklist-bold" width={18} height={18} className="me-2" />
                    View Action Items
                  </Button>
                </Link>
              </>
            )}
          </div>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)} style={{ borderRadius: '8px' }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Call Log Detail Modal */}
      <Modal
        show={showCallLogModal}
        onHide={() => setShowCallLogModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Call Recording Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedCallLog && (
            <>
              {/* Caller Info Card */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light border-0">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <IconifyIcon icon="solar:user-bold" width={20} height={20} className="text-primary" />
                    Caller Information
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <small className="text-muted d-block mb-1">Name</small>
                      <strong>{selectedCallLog.caller.name}</strong>
                    </Col>
                    <Col md={4}>
                      <small className="text-muted d-block mb-1">Phone Number</small>
                      <strong>{selectedCallLog.caller.number}</strong>
                    </Col>
                    <Col md={4}>
                      <small className="text-muted d-block mb-1">Email</small>
                      <strong>{selectedCallLog.caller.email || 'Not provided'}</strong>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Store Info Card */}
              {(selectedCallLog.store_number || selectedCallLog.store_location) && (
                <Card className="mb-3 border-0 shadow-sm">
                  <Card.Header className="bg-light border-0">
                    <h6 className="mb-0 d-flex align-items-center gap-2">
                      <IconifyIcon icon="solar:shop-bold" width={20} height={20} className="text-primary" />
                      Store Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      {selectedCallLog.store_number && (
                        <Col md={6}>
                          <small className="text-muted d-block mb-1">Store Number</small>
                          <strong>#{selectedCallLog.store_number}</strong>
                        </Col>
                      )}
                      {selectedCallLog.store_location && (
                        <Col md={6}>
                          <small className="text-muted d-block mb-1">Location</small>
                          <div className="d-flex align-items-center gap-2">
                            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 24, height: 24, background: '#F5F5F5', color: '#616161' }}>
                              <IconifyIcon icon="solar:shop-bold" width={14} height={14} />
                            </div>
                            <strong style={{ fontSize: '0.875rem' }}>{selectedCallLog.store_location}</strong>
                          </div>
                        </Col>
                      )}
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* Call Details Card */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light border-0">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <IconifyIcon icon="solar:phone-bold" width={20} height={20} className="text-primary" />
                    Call Information
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Call Started</small>
                      <strong>{formatDateTime(selectedCallLog.call_timing.started_at)}</strong>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted d-block mb-1">Call Ended</small>
                      <strong>{formatDateTime(selectedCallLog.call_timing.ended_at)}</strong>
                    </Col>
                    <Col md={4}>
                      <small className="text-muted d-block mb-1">Duration</small>
                      <div className="d-flex align-items-center gap-2 py-1 px-2 rounded border" style={{ width: 'fit-content' }}>
                        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 20, height: 20, background: '#E1F5FE', color: '#0288D1' }}>
                          <IconifyIcon icon="solar:clock-circle-bold" width={12} height={12} />
                        </div>
                        <strong style={{ fontSize: '0.875rem', color: '#0288D1' }}>
                          {calculateDuration(
                            selectedCallLog.call_timing.started_at,
                            selectedCallLog.call_timing.ended_at
                          )}
                        </strong>
                      </div>
                    </Col>
                    <Col md={4}>
                      <small className="text-muted d-block mb-1">Call Status</small>
                      <div className="d-flex align-items-center gap-2 py-1 px-2 rounded border" style={{ width: 'fit-content' }}>
                        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 20, height: 20, background: selectedCallLog.call_success ? '#E8F5E9' : '#FFEBEE', color: selectedCallLog.call_success ? '#2E7D32' : '#C62828' }}>
                          <IconifyIcon icon={selectedCallLog.call_success ? 'solar:check-circle-bold' : 'solar:close-circle-bold'} width={12} height={12} />
                        </div>
                        <strong style={{ fontSize: '0.875rem', color: selectedCallLog.call_success ? '#2E7D32' : '#C62828' }}>
                          {selectedCallLog.call_success ? 'Successful' : 'Failed'}
                        </strong>
                      </div>
                    </Col>
                    <Col md={4}>
                      <small className="text-muted d-block mb-1">Read Status</small>
                      <div className="d-flex align-items-center gap-2 py-1 px-2 rounded border" style={{ width: 'fit-content' }}>
                        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 20, height: 20, background: selectedCallLog.view_status ? '#E8F5E9' : '#FFF3E0', color: selectedCallLog.view_status ? '#2E7D32' : '#F57C00' }}>
                          <IconifyIcon icon={selectedCallLog.view_status ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={12} height={12} />
                        </div>
                        <strong style={{ fontSize: '0.875rem', color: selectedCallLog.view_status ? '#2E7D32' : '#F57C00' }}>
                          {selectedCallLog.view_status ? 'Read' : 'Unread'}
                        </strong>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Summaries Card */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-light border-0">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <IconifyIcon icon="solar:document-text-bold" width={20} height={20} className="text-primary" />
                    Call Summary
                  </h6>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <small className="text-muted d-block mb-2">Brief Summary</small>
                    <p className="mb-0 p-3 bg-light rounded">{selectedCallLog.summaries.brief}</p>
                  </div>
                  <div>
                    <small className="text-muted d-block mb-2">Detailed Summary</small>
                    <p className="mb-0 p-3 bg-light rounded">{selectedCallLog.summaries.detailed}</p>
                  </div>
                </Card.Body>
              </Card>

              {/* Questions Asked Card */}
              {selectedCallLog?.questions_asked && selectedCallLog.questions_asked.length > 0 && (
                <Card className="mb-3 border-0 shadow-sm">
                  <Card.Header className="bg-light border-0">
                    <h6 className="mb-0 d-flex align-items-center gap-2">
                      <IconifyIcon icon="solar:chat-round-line-bold" width={20} height={20} className="text-primary" />
                      Questions Asked During Call
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <ul className="mb-0">
                      {selectedCallLog.questions_asked.map((question, idx) => (
                        <li key={idx} className="mb-2"><strong>{question}</strong></li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              )}

              {/* Action Flag */}
              {selectedCallLog.action_flag && (
                <Card className="mb-3 border-danger shadow-sm">
                  <Card.Body>
                    <div className="d-flex align-items-center gap-3">
                      <IconifyIcon icon="solar:danger-circle-bold" width={28} height={28} className="text-danger" />
                      <div>
                        <strong className="text-danger d-block mb-1">Action Required</strong>
                        <p className="mb-0 small text-muted">This call requires immediate follow-up attention</p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {/* Recording Player */}
              {selectedCallLog.recording_link && (
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-light border-0">
                    <h6 className="mb-0 d-flex align-items-center gap-2">
                      <IconifyIcon icon="solar:music-library-2-bold" width={20} height={20} className="text-primary" />
                      Call Recording
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-grid">
                      <audio
                        controls
                        className="w-100"
                        src={selectedCallLog.recording_link}
                        onError={() => setAudioError('Unable to load audio file')}
                        style={{ borderRadius: '8px' }}
                      >
                        Your browser does not support audio playback.
                      </audio>
                      {audioError && (
                        <div className="alert alert-danger mt-3 mb-0">
                          <small><strong>Error:</strong> {audioError}</small>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="secondary"
            onClick={() => setShowCallLogModal(false)}
            style={{ borderRadius: '8px' }}
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => handleNavigateToCallLog(selectedCallLog!.id)}
            style={{ borderRadius: '8px' }}
          >
            <IconifyIcon icon="solar:arrow-right-bold" width={18} height={18} className="me-2" />
            Go to Call Records
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Callback Contact Modal */}
      <Modal
        show={showCallbackModal}
        onHide={() => setShowCallbackModal(false)}
        centered
        style={{ backdropFilter: 'blur(4px)' }}
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Contact Customer</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {callbackComplaint && (
            <div className="text-center pb-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: 'rgba(239, 84, 84, 0.1)',
                  color: '#ef5454'
                }}
              >
                <IconifyIcon icon="solar:phone-calling-bold" width={32} height={32} />
              </div>
              <h5 className="mb-1 fw-bold">
                {(!callbackComplaint.customer.customer_name || callbackComplaint.customer.customer_name.toLowerCase() === 'unknown' || callbackComplaint.customer.customer_name.toLowerCase() === 'unknown customer') ? 'Not Mentioned' : callbackComplaint.customer.customer_name}
              </h5>
              <p className="text-muted mb-4">Customer needs a callback regarding their complaint.</p>

              <div className="d-grid gap-3">
                {callbackComplaint.customer.contact_phone ? (
                  <Button
                    variant="danger"
                    className="py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                    href={`tel:${callbackComplaint.customer.contact_phone}`}
                    style={{ borderRadius: '12px' }}
                  >
                    <IconifyIcon icon="solar:phone-calling-bold" width={20} height={20} />
                    Call {callbackComplaint.customer.contact_phone}
                  </Button>
                ) : (
                  <Button variant="outline-secondary" disabled className="py-2" style={{ borderRadius: '12px' }}>
                    Phone Number Not Available
                  </Button>
                )}

                {callbackComplaint.customer.contact_email ? (
                  <Button
                    variant="outline-primary"
                    className="py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                    href={`mailto:${callbackComplaint.customer.contact_email}`}
                    style={{ borderRadius: '12px' }}
                  >
                    <IconifyIcon icon="solar:letter-bold" width={20} height={20} />
                    Send Email
                  </Button>
                ) : (
                  <Button variant="outline-secondary" disabled className="py-2" style={{ borderRadius: '12px' }}>
                    Email Not Available
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="light"
            className="w-100 py-2 fw-semibold"
            onClick={() => setShowCallbackModal(false)}
            style={{ borderRadius: '12px' }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Footer />
    </>
  )
}

export default ComplaintsPage

export const dynamic = 'force-dynamic'