'use client'

import type { Metadata } from 'next'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Row, Col, Card, CardBody, CardHeader, CardTitle, Spinner, Alert, Badge, Button, ButtonGroup } from 'react-bootstrap'
import Link from 'next/link'
import IconifyIcon from '@/components/wrapper/IconifyIcon'
import { ApexOptions } from 'apexcharts'
// import ReactApexChart from 'react-apexcharts'
import { analyticsApi, type DashboardResponse, type AnalyticsPeriod, type StoreComparisonResponse } from '@/api/org/analytics'
import { actionItemsApi } from '@/api/org/action-items'
import { appointmentsApi } from '@/api/org/appointments'
import { ordersApi } from '@/api/org/orders'
import { orgUsersApi } from '@/api/org/users'
import { supportApi } from '@/api/org/support'
import { complaintsApi } from '@/api/org/complaints'
import { useAuth } from '@/context/useAuthContext'
import { isOrgUser } from '@/types/auth'

import dynamic from 'next/dynamic'

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
})



type PeriodOption = {
  value: AnalyticsPeriod
  label: string
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'all_time', label: 'All Time' },
]

// Custom styles for the dashboard
const CustomStyles = () => (
  <style>{`
    .transition-all { transition: all 0.2s ease-in-out; }
    .hover-shadow:hover { 
      transform: translateY(-4px);
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1) !important;
    }
    .uppercase { text-transform: uppercase; }
    .tracking-wider { letter-spacing: 0.05em; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
  `}</style>
)

const DashboardPage = () => {
  const { user } = useAuth()
  const isHR = isOrgUser(user) && user.organization?.vertical_key === 'hr'
  const complaintLabel = isHR ? 'Incident Reports' : 'Complaints'

  const [period, setPeriod] = useState<AnalyticsPeriod>('last_7_days')
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [actionStats, setActionStats] = useState<any>(null)
  const [appointmentStats, setAppointmentStats] = useState<any>(null)
  const [orderStats, setOrderStats] = useState<any>(null)
  const [userStats, setUserStats] = useState<any>(null)
  const [supportStats, setSupportStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [complaintsStats, setComplaintsStats] = useState<any>(null)
  const [storeComparison, setStoreComparison] = useState<StoreComparisonResponse | null>(null)


  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [dashboardData, actionData, appointmentData, orderData, userData, supportData, complaintsData] =
        await Promise.all([
          analyticsApi.getDashboard(period),
          actionItemsApi.getStats(period),
          appointmentsApi.getStats(period),
          ordersApi.getStats(period),
          orgUsersApi.getStats(),
          supportApi.getStats(period),
          complaintsApi.getStats(period),
        ])


      setDashboard(dashboardData)
      setActionStats(actionData)
      setAppointmentStats(appointmentData)
      setOrderStats(orderData)
      setUserStats(userData)
      setSupportStats(supportData)
      setComplaintsStats(complaintsData)

      // Fetch store comparison data
      const storeCompData = await analyticsApi.getStoreComparison(period)
      setStoreComparison(storeCompData)

    } catch (err: any) {
      console.error('Error loading dashboard:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadDashboardData()
  }, [period, loadDashboardData])

  const processedStores = useMemo(() => {
    const rawStores = storeComparison?.stores || [];
    const known = rawStores.filter(s => {
      const loc = s.store_location?.toLowerCase().trim() || '';
      return loc && loc !== '' && !loc.includes('unknown') && !loc.includes('not mentioned');
    });
    const unknown = rawStores.filter(s => {
      const loc = s.store_location?.toLowerCase().trim() || '';
      return !loc || loc === '' || loc.includes('unknown') || loc.includes('not mentioned');
    });

    if (unknown.length === 0) return known;

    const otherStore = {
      location_id: 'other',
      store_location: 'Others',
      store_number: 'N/A',
      call_count: unknown.reduce((acc, s) => acc + (s.call_count || 0), 0),
      percentage_of_total: unknown.reduce((acc, s) => acc + (s.percentage_of_total || 0), 0),
      avg_duration_seconds: unknown.reduce((acc, s) => acc + (s.avg_duration_seconds || 0), 0) / unknown.length,
      success_rate: unknown.reduce((acc, s) => acc + (s.success_rate || 0), 0) / unknown.length,
      avg_duration: 'N/A',
      trend: 'stable'
    };

    return [...known, otherStore];
  }, [storeComparison]);

  const hotStore = useMemo(() => {
    if (!processedStores || processedStores.length === 0) return null;
    return [...processedStores].sort((a, b) => b.call_count - a.call_count)[0];
  }, [processedStores]);

  // Calls Over Time Chart
  const callsOverTimeChart: ApexOptions = useMemo(() => ({
    chart: {
      height: 350,
      type: 'area',
      toolbar: { show: true },
      zoom: { enabled: true }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
      }
    },
    series: [{
      name: 'Calls',
      data: dashboard?.calls_over_time.map(d => ({ x: new Date(d.date).getTime(), y: d.count })) || []
    }],
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false
      }
    },
    yaxis: {
      title: { text: 'Number of Calls' },
      labels: {
        formatter: (val) => Math.floor(val).toString()
      }
    },
    colors: ['#6658dd'],
    grid: { borderColor: '#f1f3fa' },
    tooltip: {
      x: { format: 'dd MMM yyyy' }
    }
  }), [dashboard])

  const storeSuccessRatesChart: ApexOptions = useMemo(() => {
    const stores = processedStores
    const topStores = stores
      .sort((a, b) => b.call_count - a.call_count)
      .slice(0, 10)

    return {
      chart: {
        height: 320,
        type: 'bar',
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%',
          borderRadius: 4,
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`,
        offsetY: -20,
        style: {
          fontSize: '11px',
          colors: ['#304758']
        }
      },
      series: [{
        name: 'Success Rate',
        data: topStores.map(s => s.success_rate)
      }],
      xaxis: {
        categories: topStores.map(s => s.store_location?.substring(0, 15) || `Store ${s.store_number || 'N/A'}`),
        labels: {
          rotate: -45,
          style: {
            fontSize: '10px'
          }
        }
      },
      yaxis: {
        title: { text: 'Success Rate (%)' },
        max: 100,
        labels: {
          formatter: (val: number) => `${val.toFixed(0)}%`
        }
      },
      colors: ['#1abc9c'],
      grid: { borderColor: '#f1f3fa' },
      tooltip: {
        y: {
          formatter: (val: number) => `${val.toFixed(1)}%`
        }
      }
    }
  }, [storeComparison])

  // Duration Distribution Chart
  const durationDistChart: ApexOptions = useMemo(() => {
    const distribution = dashboard?.duration_distribution || {}
    return {
      chart: {
        height: 350,
        type: 'bar',
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4
        }
      },
      dataLabels: { enabled: false },
      series: [{
        name: 'Calls',
        data: Object.values(distribution)
      }],
      xaxis: {
        categories: Object.keys(distribution),
        title: { text: 'Duration Range' }
      },
      yaxis: {
        title: { text: 'Number of Calls' }
      },
      colors: ['#1abc9c'],
      grid: { borderColor: '#f1f3fa' }
    }
  }, [dashboard])

  // Hourly Volume Chart
  const hourlyVolumeChart: ApexOptions = useMemo(() => ({
    chart: {
      height: 300,
      type: 'heatmap',
      toolbar: { show: false }
    },
    series: [{
      name: 'Calls',
      data: dashboard?.hourly_volume.map(d => ({ x: `${d.hour}:00`, y: d.count })) || []
    }],
    plotOptions: {
      heatmap: {
        colorScale: {
          ranges: [
            { from: 0, to: 5, color: '#e3f2fd', name: 'Low' },
            { from: 6, to: 15, color: '#90caf9', name: 'Medium' },
            { from: 16, to: 30, color: '#42a5f5', name: 'High' },
            { from: 31, to: 100, color: '#1976d2', name: 'Very High' }
          ]
        }
      }
    },
    dataLabels: { enabled: true },
    xaxis: { title: { text: 'Hour of Day' } }
  }), [dashboard])

  // Store Comparison Chart
  const storeComparisonChart: ApexOptions = useMemo(() => {
    const stores = processedStores
    const topStores = stores
      .sort((a, b) => b.call_count - a.call_count)
      .slice(0, 10)

    return {
      chart: {
        height: 350,
        type: 'bar',
        toolbar: { show: true }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          barHeight: '70%',
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => val.toString(),
        offsetX: 30,
        style: {
          fontSize: '12px',
          colors: ['#304758']
        }
      },
      series: [{
        name: 'Calls',
        data: topStores.map(s => s.call_count)
      }],
      xaxis: {
        categories: topStores.map(s => s.store_location || `Store ${s.store_number || 'Unknown'}`),
        title: { text: 'Number of Calls' }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '11px'
          }
        }
      },
      colors: ['#6658dd', '#1abc9c', '#4fc6e1', '#f7b84b', '#f1556c', '#6c757d', '#39afd1', '#fa5c7c', '#0acf97', '#727cf5'],
      grid: { borderColor: '#f1f3fa' },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const store = topStores[opts.dataPointIndex]
            return `${val} calls (${store?.percentage_of_total.toFixed(1)}% of total)`
          }
        }
      }
    }
  }, [storeComparison])


  // Store Average Duration Chart
  const storeAvgDurationChart: ApexOptions = useMemo(() => {
    const stores = processedStores
    const topStores = stores
      .sort((a, b) => b.call_count - a.call_count)
      .slice(0, 10)

    return {
      chart: {
        height: 320,
        type: 'bar',
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%',
          borderRadius: 4,
          distributed: true
        }
      },
      dataLabels: {
        enabled: false
      },
      series: [{
        name: 'Avg Duration (seconds)',
        data: topStores.map(s => s.avg_duration_seconds)
      }],
      xaxis: {
        categories: topStores.map(s => s.store_location?.substring(0, 15) || `Store ${s.store_number || 'N/A'}`),
        labels: {
          rotate: -45,
          style: {
            fontSize: '10px'
          }
        }
      },
      yaxis: {
        title: { text: 'Average Duration (seconds)' },
        labels: {
          formatter: (val: number) => `${val.toFixed(0)}s`
        }
      },
      colors: ['#6658dd', '#1abc9c', '#4fc6e1', '#f7b84b', '#f1556c', '#6c757d', '#39afd1', '#fa5c7c', '#0acf97', '#727cf5'],
      grid: { borderColor: '#f1f3fa' },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const store = topStores[opts.dataPointIndex]
            return `${val.toFixed(0)}s (${store?.avg_duration})`
          }
        }
      }
    }
  }, [storeComparison])

  const storePerformanceMatrixChart: ApexOptions = useMemo(() => {
    const stores = processedStores
    const topStores = stores
      .sort((a, b) => b.call_count - a.call_count)
      .slice(0, 8)

    return {
      chart: {
        height: 320,
        type: 'radar',
        toolbar: { show: false }
      },
      series: topStores.slice(0, 5).map(store => ({
        name: store.store_location?.substring(0, 20) || `Store ${store.store_number}`,
        data: [
          store.success_rate,
          (store.call_count / (storeComparison?.total_calls || 1)) * 100,
          Math.min((store.avg_duration_seconds / 300) * 100, 100), // Normalize to 0-100
        ]
      })),
      xaxis: {
        categories: ['Success Rate', 'Call Volume %', 'Efficiency']
      },
      yaxis: {
        show: false,
        max: 100
      },
      colors: ['#6658dd', '#1abc9c', '#4fc6e1', '#f7b84b', '#f1556c'],
      stroke: {
        width: 2
      },
      fill: {
        opacity: 0.2
      },
      markers: {
        size: 4
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center'
      }
    }
  }, [storeComparison])

  // Action Items Status Chart
  const actionItemsChart: ApexOptions = useMemo(() => {
    const statuses = actionStats?.by_status || {}
    return {
      chart: {
        height: 300,
        type: 'donut'
      },
      series: Object.values(statuses) as number[],
      labels: Object.keys(statuses).map(s => s.replace('_', ' ').toUpperCase()),
      colors: ['#f7b84b', '#4fc6e1', '#1abc9c', '#6c757d'],
      legend: {
        position: 'bottom',
        horizontalAlign: 'center'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%'
          }
        }
      }
    }
  }, [actionStats])

  // Orders Revenue Chart
  const ordersRevenueChart: ApexOptions = useMemo(() => {
    const statuses = orderStats?.by_status || {}
    return {
      chart: {
        height: 300,
        type: 'radialBar'
      },
      series: [
        ((statuses.completed || 0) / (orderStats?.total_orders || 1)) * 100,
        ((statuses.in_progress || 0) / (orderStats?.total_orders || 1)) * 100,
        ((statuses.pending || 0) / (orderStats?.total_orders || 1)) * 100
      ],
      labels: ['Completed', 'In Progress', 'Pending'],
      colors: ['#1abc9c', '#4fc6e1', '#f7b84b'],
      plotOptions: {
        radialBar: {
          dataLabels: {
            total: {
              show: true,
              label: 'Total Orders',
              formatter: () => orderStats?.total_orders?.toString() || '0'
            }
          }
        }
      }
    }
  }, [orderStats])

  // Support Tickets Trend
  const supportTicketsChart: ApexOptions = useMemo(() => {
    const types = supportStats?.by_type || {}
    return {
      chart: {
        height: 280,
        type: 'bar',
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%'
        }
      },
      dataLabels: { enabled: false },
      series: [{
        name: 'Tickets',
        data: Object.values(types) as number[]
      }],
      xaxis: {
        categories: Object.keys(types).map(t => t.replace('_', ' ').toUpperCase())
      },
      colors: ['#6658dd'],
      grid: { borderColor: '#f1f3fa' }
    }
  }, [supportStats])

  // User Growth Chart
  const userGrowthChart: ApexOptions = useMemo(() => {
    const statuses = userStats?.by_status || {}
    return {
      chart: {
        height: 280,
        type: 'pie'
      },
      series: Object.values(statuses) as any,
      labels: Object.keys(statuses).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      colors: ['#1abc9c', '#f7b84b', '#f1556c'],
      legend: {
        position: 'bottom'
      }
    }
  }, [userStats])

  // Tasks Status Chart
  const tasksChart: ApexOptions = useMemo(() => {
    const statuses = actionStats?.by_status || {}
    return {
      chart: {
        height: 300,
        type: 'donut'
      },
      labels: Object.keys(statuses).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      series: Object.values(statuses) as number[],
      colors: ['#6658dd', '#1abc9c', '#4fc6e1', '#f7b84b', '#f1556c', '#6c757d'],
      legend: {
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%'
          }
        }
      }
    }
  }, [actionStats])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-4">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>{error}</p>
        <Button variant="primary" onClick={loadDashboardData}>
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <>
      <CustomStyles />
      {/* Page Title */}
      <Row>
        <Col xs={12}>
          <div className="page-title-box">
            <div className="d-flex flex-column flex-md-row align-items-md-center gap-3 w-100">
              <div>
                <h4 className="mb-2">Analytics Dashboard</h4>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link href="/">AI Assistant</Link>
                  </li>
                  <div className="mx-1" style={{ height: 24, paddingRight: '8px' }}>
                    <IconifyIcon icon="bx:chevron-right" height={16} width={16} />
                  </div>
                  <li className="breadcrumb-item active">Dashboard</li>
                </ol>
              </div>
              <ButtonGroup className="ms-md-auto">
                {PERIOD_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    variant={period === option.value ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setPeriod(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>

            </div>
          </div>
        </Col>
      </Row>

      {/* Performance Summary Cards */}
      <Row className="">
        <Col md={3}>
          <Card className="border-0 shadow-sm transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-success bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:clock-circle-bold" className="text-success" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Total Duration</p>
                  <h4 className="mb-0 font-bold">{dashboard?.overview.total_duration || '0s'}</h4>
                  <small className="text-muted">Accumulated time</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>



        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-success bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:clock-circle-bold" className="text-success" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Avg Duration</p>
                  <h4 className="mb-0 font-bold">{dashboard?.overview.avg_duration || '0s'}</h4>
                  <small className="text-muted">Per call average</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-info bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:users-group-rounded-bold" className="text-info" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Team Members</p>
                  <h4 className="mb-0 font-bold">{userStats?.total_users || 0}</h4>
                  <small className="text-muted">Active workforce</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-warning bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:shield-check-bold" className="text-warning" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Admin Users</p>
                  <h4 className="mb-0 font-bold">{userStats?.admin_users || 0}</h4>
                  <small className="text-muted">System managers</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Row 1: Call Metrics */}
      <Row className="">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-primary bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:phone-calling-bold" className="text-primary" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Total Calls</p>
                  <h4 className="mb-0 font-bold">{dashboard?.overview.total_calls.toLocaleString() || 0}</h4>
                  <small className="text-muted">Over {period.replace('_', ' ')}</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>



        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-warning bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:users-group-rounded-bold" className="text-warning" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Unique Callers</p>
                  <h4 className="mb-0 font-bold">{dashboard?.overview.unique_callers.toLocaleString() || 0}</h4>
                  <small className="text-muted">{dashboard?.overview.repeat_callers || 0} repeat callers</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-info bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:graph-up-bold" className="text-info" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Peak Hour</p>
                  <h4 className="mb-0 font-bold">
                    {dashboard?.hourly_volume?.length > 0
                      ? `${dashboard.hourly_volume.reduce((max, curr) => curr.count > max.count ? curr : max).hour}:00`
                      : 'N/A'}
                  </h4>
                  <small className="text-muted">High volume window</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-danger bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:fire-bold" className="text-danger" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Hot Store</p>
                  <h4 className="mb-0 font-bold text-truncate" title={hotStore?.store_location}>
                    {hotStore?.store_location || 'N/A'}
                  </h4>
                  <small className="text-muted">{hotStore?.call_count || 0} calls</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Row 2: Complaints / Incident Reports */}
      <Row className="">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-success bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:check-circle-bold" className="text-success" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Resolved {complaintLabel}</p>
                  <h4 className="mb-0 font-bold">{complaintsStats?.resolved_complaints || 0}</h4>
                  <small className="text-muted">Total processed</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-warning bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:danger-triangle-bold" className="text-warning" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Pending {complaintLabel}</p>
                  <h4 className="mb-0 font-bold">{complaintsStats?.by_status?.pending || 0}</h4>
                  <small className="text-muted">Awaiting action</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-danger bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:fire-bold" className="text-danger" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Urgent {complaintLabel}</p>
                  <h4 className="mb-0 font-bold">{complaintsStats?.urgent_complaints || 0}</h4>
                  <small className="text-danger">High priority</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm rounded bg-info bg-opacity-10 d-flex align-items-center justify-content-center">
                    <IconifyIcon icon="solar:phone-calling-bold" className="text-info" width={24} height={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Followups Needed</p>
                  <h4 className="mb-0 font-bold">{complaintsStats?.followups_needed || 0}</h4>
                  <small className="text-info">Callback requested</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Tasks & Services */}
      <Row className="">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Tasks</p>
                  <h4 className="mb-0 font-bold">{actionStats?.total_items || 0}</h4>
                  <small className="text-muted">
                    <span className="text-success">{actionStats?.resolved_tasks || 0} resolved</span> • <span className="text-warning">{actionStats?.pending_tasks || 0} pending</span>
                  </small>
                </div>
                <Link href="/action-items" className="avatar-sm rounded bg-primary bg-opacity-10 d-flex align-items-center justify-content-center">
                  <IconifyIcon icon="solar:checklist-bold" className="text-primary" width={20} height={20} />
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Appointments</p>
                  <h4 className="mb-0 font-bold">{appointmentStats?.total_appointments || 0}</h4>
                  <Badge bg="success" className="bg-opacity-10 text-success mt-1">
                    {appointmentStats?.upcoming_appointments || 0} upcoming
                  </Badge>
                </div>
                <Link href="/appointments" className="avatar-sm rounded bg-success bg-opacity-10 d-flex align-items-center justify-content-center">
                  <IconifyIcon icon="solar:calendar-date-bold" className="text-success" width={20} height={20} />
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col> */}

        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Support Tickets</p>
                  <h4 className="mb-0 font-bold">{supportStats?.total_tickets || 0}</h4>
                  <Badge bg="warning" className="bg-opacity-10 text-warning mt-1">
                    {supportStats?.open_tickets || 0} open
                  </Badge>
                </div>
                <Link href="/contact-support" className="avatar-sm rounded bg-warning bg-opacity-10 d-flex align-items-center justify-content-center">
                  <IconifyIcon icon="solar:list-bold" className="text-warning" width={20} height={20} />
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm  transition-all hover-shadow">
            <CardBody className="p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small uppercase tracking-wider font-semibold">Total Revenue</p>
                  <h4 className="mb-0 font-bold">${orderStats?.total_revenue?.toLocaleString() || 0}</h4>
                  <small className="text-muted">{orderStats?.total_orders || 0} orders</small>
                </div>
                <Link href="/orders" className="avatar-sm rounded bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center">
                  <IconifyIcon icon="solar:dollar-minimalistic-bold" className="text-secondary" width={20} height={20} />
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col> */}
      </Row>

      {/* Main Charts Row */}
      <Row>
        <Col lg={12} xl={12}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as="h5" className="mb-0">
                <IconifyIcon icon="solar:chart-2-bold" width={20} height={20} className="me-2" />
                Call Volume Trend (Overall)
              </CardTitle>
              <Badge bg="primary">{period.replace('_', ' ')}</Badge>
            </CardHeader>
            <CardBody>
              <ReactApexChart
                options={callsOverTimeChart}
                series={callsOverTimeChart.series}
                type="area"
                height={350}
              />
            </CardBody>
          </Card>
        </Col>

        {storeComparison && storeComparison.stores.length > 0 && (
          <Col lg={6} xl={6}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <IconifyIcon icon="solar:buildings-2-bold" width={20} height={20} className="me-2" />
                  Top 10 Stores by Volume
                </CardTitle>
              </CardHeader>
              <CardBody>
                <ReactApexChart
                  options={storeComparisonChart}
                  series={storeComparisonChart.series}
                  type="bar"
                  height={350}
                />
              </CardBody>
            </Card>
          </Col>
        )}

        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <IconifyIcon icon="solar:clock-circle-bold" width={20} height={20} className="me-2" />
                Call Duration Distribution
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ReactApexChart
                options={durationDistChart}
                series={durationDistChart.series}
                type="bar"
                height={350}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Secondary Charts Row */}
      <Row>
        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <IconifyIcon icon="solar:graph-bold" width={20} height={20} className="me-2" />
                Hourly Call Volume Heatmap
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ReactApexChart
                options={hourlyVolumeChart}
                series={hourlyVolumeChart.series}
                type="heatmap"
                height={300}
              />
            </CardBody>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <IconifyIcon icon="solar:checklist-minimalistic-bold" width={20} height={20} className="me-2" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ReactApexChart
                options={tasksChart}
                series={tasksChart.series}
                type="donut"
                height={300}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Store Comparison Row */}
      {storeComparison && storeComparison.stores.length > 0 && (
        <Row>
          {/* <Col lg={4}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <IconifyIcon icon="solar:chart-square-bold" width={20} height={20} className="me-2" />
                  Store Success Rates
                </CardTitle>
              </CardHeader>
              <CardBody>
                <ReactApexChart
                  options={storeSuccessRatesChart}
                  series={storeSuccessRatesChart.series}
                  type="bar"
                  height={320}
                />
              </CardBody>
            </Card>
          </Col> */}

          <Col lg={6}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <IconifyIcon icon="solar:clock-square-bold" width={20} height={20} className="me-2" />
                  Avg Call Duration by Store
                </CardTitle>
              </CardHeader>
              <CardBody>
                <ReactApexChart
                  options={storeAvgDurationChart}
                  series={storeAvgDurationChart.series}
                  type="bar"
                  height={320}
                />
              </CardBody>
            </Card>
          </Col>
          <Col lg={6}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle as="h5" className="mb-0">
                  <IconifyIcon icon="solar:target-bold" width={20} height={20} className="me-2" />
                  Store Performance Matrix
                </CardTitle>
              </CardHeader>
              <CardBody>
                <ReactApexChart
                  options={storePerformanceMatrixChart}
                  series={storePerformanceMatrixChart.series}
                  type="radar"
                  height={320}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tertiary Charts Row */}
      {/* <Row>
        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <IconifyIcon icon="solar:bag-check-bold" width={20} height={20} className="me-2" />
                Orders Completion
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ReactApexChart
                options={ordersRevenueChart}
                series={ordersRevenueChart.series}
                type="radialBar"
                height={300}
              />
            </CardBody>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <IconifyIcon icon="solar:help-bold" width={20} height={20} className="me-2" />
                Support Tickets by Type
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ReactApexChart
                options={supportTicketsChart}
                series={supportTicketsChart.series}
                type="bar"
                height={280}
              />
            </CardBody>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                <IconifyIcon icon="solar:users-group-two-rounded-bold" width={20} height={20} className="me-2" />
                User Status Distribution
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ReactApexChart
                options={userGrowthChart}
                series={userGrowthChart.series}
                type="pie"
                height={280}
              />
            </CardBody>
          </Card>
        </Col>
      </Row> */}


      {/* Quick Actions */}
      {/* <Row>
        <Col xs={12}>
          <Card className="border-0 shadow-sm">
            <CardBody>
              <h5 className="mb-3">
                <IconifyIcon icon="solar:widget-5-bold" width={20} height={20} className="me-2" />
                Quick Actions
              </h5>
              <div className="d-flex flex-wrap gap-2">
                <Link href="/call-records" className="btn btn-outline-primary">
                  <IconifyIcon icon="solar:phone-calling-linear" width={18} height={18} className="me-2" />
                  View All Calls
                </Link>
                <Link href="/action-items?status=pending" className="btn btn-outline-warning">
                  <IconifyIcon icon="solar:checklist-linear" width={18} height={18} className="me-2" />
                  Pending Tasks
                </Link>
                <Link href="/appointments?sort=upcoming" className="btn btn-outline-success">
                  <IconifyIcon icon="solar:calendar-linear" width={18} height={18} className="me-2" />
                  Upcoming Appointments
                </Link>
                <Link href="/orders?urgency=true" className="btn btn-outline-danger">
                  <IconifyIcon icon="solar:bag-bold" width={18} height={18} className="me-2" />
                  Urgent Orders
                </Link>
                <Link href="/incidents" className="btn btn-outline-info">
                  <IconifyIcon icon="solar:danger-triangle-linear" width={18} height={18} className="me-2" />
                  Active Incidents
                </Link>
                <Link href="/user-management" className="btn btn-outline-secondary">
                  <IconifyIcon icon="solar:users-group-rounded-linear" width={18} height={18} className="me-2" />
                  Manage Users
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row> */}
    </>
  )
}

export default DashboardPage