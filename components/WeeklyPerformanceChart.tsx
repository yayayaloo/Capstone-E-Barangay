'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './WeeklyPerformanceChart.module.css'

interface WeekData {
    weekLabel: string
    weekStart: Date
    total: number
    completed: number
    pending: number
    rejected: number
    processing: number
}

interface Insight {
    type: 'increase' | 'decrease' | 'stable' | 'peak' | 'low'
    message: string
    weekLabel: string
    icon: string
}

export default function WeeklyPerformanceChart() {
    const [weeklyData, setWeeklyData] = useState<WeekData[]>([])
    const [loading, setLoading] = useState(true)
    const [hoveredBar, setHoveredBar] = useState<number | null>(null)
    const [activeMetric, setActiveMetric] = useState<'total' | 'completed' | 'pending' | 'rejected'>('total')

    useEffect(() => {
        fetchWeeklyData()
    }, [])

    const fetchWeeklyData = async () => {
        setLoading(true)
        try {
            // Fetch all requests from the last 8 weeks
            const eightWeeksAgo = new Date()
            eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

            const { data, error } = await supabase
                .from('service_requests')
                .select('id, status, created_at')
                .gte('created_at', eightWeeksAgo.toISOString())
                .order('created_at', { ascending: true })

            if (error) throw error

            // Group data by week
            const weeks: WeekData[] = []
            for (let i = 7; i >= 0; i--) {
                const weekStart = new Date()
                weekStart.setDate(weekStart.getDate() - (i * 7))
                weekStart.setHours(0, 0, 0, 0)
                // Set to Monday
                const day = weekStart.getDay()
                const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
                weekStart.setDate(diff)

                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekEnd.getDate() + 7)

                const weekRequests = (data || []).filter(r => {
                    const d = new Date(r.created_at)
                    return d >= weekStart && d < weekEnd
                })

                weeks.push({
                    weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    weekStart,
                    total: weekRequests.length,
                    completed: weekRequests.filter(r => r.status === 'completed').length,
                    pending: weekRequests.filter(r => r.status === 'pending').length,
                    rejected: weekRequests.filter(r => r.status === 'rejected').length,
                    processing: weekRequests.filter(r => r.status === 'processing' || r.status === 'ready').length,
                })
            }

            setWeeklyData(weeks)
        } catch (err) {
            console.error('Error fetching weekly data:', err)
        } finally {
            setLoading(false)
        }
    }

    // Generate insights
    const insights = useMemo<Insight[]>(() => {
        if (weeklyData.length < 2) return []
        const result: Insight[] = []

        for (let i = 1; i < weeklyData.length; i++) {
            const curr = weeklyData[i]
            const prev = weeklyData[i - 1]

            if (prev.total === 0 && curr.total === 0) continue

            const change = prev.total > 0
                ? ((curr.total - prev.total) / prev.total) * 100
                : curr.total > 0 ? 100 : 0

            if (change > 30) {
                const reasons: string[] = []
                if (curr.pending > prev.pending) reasons.push('more pending requests')
                if (curr.completed > prev.completed) reasons.push('higher completion rate')
                if (curr.processing > prev.processing) reasons.push('active processing surge')

                result.push({
                    type: 'increase',
                    message: `+${Math.round(change)}% spike${reasons.length > 0 ? ` — likely due to ${reasons.join(', ')}` : ' — possible event-driven demand'}`,
                    weekLabel: curr.weekLabel,
                    icon: '📈'
                })
            } else if (change < -30) {
                const reasons: string[] = []
                if (curr.completed < prev.completed) reasons.push('fewer completions')
                if (curr.pending < prev.pending) reasons.push('reduced incoming requests')
                if (curr.rejected > prev.rejected) reasons.push('increased rejection rate')

                result.push({
                    type: 'decrease',
                    message: `${Math.round(change)}% drop${reasons.length > 0 ? ` — possibly from ${reasons.join(', ')}` : ' — typical low-activity period'}`,
                    weekLabel: curr.weekLabel,
                    icon: '📉'
                })
            }
        }

        // Find peak week
        const maxWeek = weeklyData.reduce((max, w) => w.total > max.total ? w : max, weeklyData[0])
        if (maxWeek.total > 0) {
            result.push({
                type: 'peak',
                message: `Peak activity: ${maxWeek.total} requests — highest volume in 8-week window`,
                weekLabel: maxWeek.weekLabel,
                icon: '🔥'
            })
        }

        // Find lowest week (that has data)
        const weeksWithData = weeklyData.filter(w => w.total > 0)
        if (weeksWithData.length > 1) {
            const minWeek = weeksWithData.reduce((min, w) => w.total < min.total ? w : min, weeksWithData[0])
            if (minWeek.weekLabel !== maxWeek.weekLabel) {
                result.push({
                    type: 'low',
                    message: `Lowest activity: ${minWeek.total} requests — may indicate holidays or reduced staffing`,
                    weekLabel: minWeek.weekLabel,
                    icon: '💤'
                })
            }
        }

        return result
    }, [weeklyData])

    // Calculate chart dimensions
    const chartWidth = 700
    const chartHeight = 280
    const padding = { top: 20, right: 20, bottom: 50, left: 50 }
    const plotWidth = chartWidth - padding.left - padding.right
    const plotHeight = chartHeight - padding.top - padding.bottom

    const maxValue = useMemo(() => {
        const values = weeklyData.map(w => w[activeMetric])
        return Math.max(...values, 1) // minimum of 1 to avoid division by zero
    }, [weeklyData, activeMetric])

    const getMetricColor = (metric: string) => {
        switch (metric) {
            case 'total': return { main: '#6366f1', gradient: '#8b5cf6', glow: 'rgba(99,102,241,0.3)' }
            case 'completed': return { main: '#10b981', gradient: '#34d399', glow: 'rgba(16,185,129,0.3)' }
            case 'pending': return { main: '#f59e0b', gradient: '#fbbf24', glow: 'rgba(245,158,11,0.3)' }
            case 'rejected': return { main: '#ef4444', gradient: '#f87171', glow: 'rgba(239,68,68,0.3)' }
            default: return { main: '#6366f1', gradient: '#8b5cf6', glow: 'rgba(99,102,241,0.3)' }
        }
    }

    const colors = getMetricColor(activeMetric)

    // Compute trend line (simple linear regression)
    const trendLine = useMemo(() => {
        if (weeklyData.length < 2) return null
        const values = weeklyData.map(w => w[activeMetric])
        const n = values.length
        const sumX = values.reduce((s, _, i) => s + i, 0)
        const sumY = values.reduce((s, v) => s + v, 0)
        const sumXY = values.reduce((s, v, i) => s + i * v, 0)
        const sumX2 = values.reduce((s, _, i) => s + i * i, 0)

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
        const intercept = (sumY - slope * sumX) / n

        const startY = intercept
        const endY = slope * (n - 1) + intercept

        return { startY, endY, slope }
    }, [weeklyData, activeMetric])

    const trendDirection = trendLine
        ? trendLine.slope > 0.5 ? 'upward' : trendLine.slope < -0.5 ? 'downward' : 'stable'
        : 'stable'

    // Compute week-over-week change
    const latestChange = useMemo(() => {
        if (weeklyData.length < 2) return 0
        const curr = weeklyData[weeklyData.length - 1][activeMetric]
        const prev = weeklyData[weeklyData.length - 2][activeMetric]
        if (prev === 0) return curr > 0 ? 100 : 0
        return Math.round(((curr - prev) / prev) * 100)
    }, [weeklyData, activeMetric])

    if (loading) {
        return (
            <div className={styles.chartContainer}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingPulse}></div>
                    <p>Loading weekly performance data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.chartContainer}>
            {/* Header */}
            <div className={styles.chartHeader}>
                <div>
                    <h3 className={styles.chartTitle}>
                        <span className={styles.chartTitleIcon}>📊</span>
                        Weekly Performance
                    </h3>
                    <p className={styles.chartSubtitle}>Service request trends over the last 8 weeks</p>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.trendBadge} data-trend={trendDirection}>
                        {trendDirection === 'upward' && '↗ Trending Up'}
                        {trendDirection === 'downward' && '↘ Trending Down'}
                        {trendDirection === 'stable' && '→ Stable'}
                    </div>
                    {latestChange !== 0 && (
                        <div className={`${styles.changeBadge} ${latestChange > 0 ? styles.changeUp : styles.changeDown}`}>
                            {latestChange > 0 ? '+' : ''}{latestChange}% vs last week
                        </div>
                    )}
                </div>
            </div>

            {/* Metric Toggles */}
            <div className={styles.metricToggles}>
                {(['total', 'completed', 'pending', 'rejected'] as const).map(metric => (
                    <button
                        key={metric}
                        className={`${styles.metricBtn} ${activeMetric === metric ? styles.metricActive : ''}`}
                        data-metric={metric}
                        onClick={() => setActiveMetric(metric)}
                    >
                        <span className={styles.metricDot} style={{ background: getMetricColor(metric).main }}></span>
                        {metric.charAt(0).toUpperCase() + metric.slice(1)}
                    </button>
                ))}
            </div>

            {/* SVG Chart */}
            <div className={styles.chartWrapper}>
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className={styles.chart}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.gradient} stopOpacity="1" />
                            <stop offset="100%" stopColor={colors.main} stopOpacity="0.8" />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.main} stopOpacity="0.15" />
                            <stop offset="100%" stopColor={colors.main} stopOpacity="0" />
                        </linearGradient>
                        <filter id="barGlow">
                            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={colors.main} floodOpacity="0.3" />
                        </filter>
                        <filter id="dotGlow">
                            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={colors.main} floodOpacity="0.5" />
                        </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = padding.top + plotHeight * (1 - ratio)
                        return (
                            <g key={i}>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={chartWidth - padding.right}
                                    y2={y}
                                    stroke="rgba(255,255,255,0.06)"
                                    strokeDasharray={i === 0 ? "none" : "4,4"}
                                />
                                <text
                                    x={padding.left - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fill="rgba(255,255,255,0.35)"
                                    fontSize="11"
                                    fontFamily="inherit"
                                >
                                    {Math.round(maxValue * ratio)}
                                </text>
                            </g>
                        )
                    })}

                    {/* Area under curve */}
                    {weeklyData.length > 1 && (
                        <path
                            d={
                                `M ${padding.left + (plotWidth / weeklyData.length) * 0.5} ${padding.top + plotHeight}` +
                                weeklyData.map((w, i) => {
                                    const x = padding.left + (plotWidth / weeklyData.length) * (i + 0.5)
                                    const y = padding.top + plotHeight - (w[activeMetric] / maxValue) * plotHeight
                                    return ` L ${x} ${y}`
                                }).join('') +
                                ` L ${padding.left + (plotWidth / weeklyData.length) * (weeklyData.length - 0.5)} ${padding.top + plotHeight} Z`
                            }
                            fill="url(#areaGradient)"
                            className={styles.areaPath}
                        />
                    )}

                    {/* Bars */}
                    {weeklyData.map((w, i) => {
                        const barWidth = (plotWidth / weeklyData.length) * 0.55
                        const x = padding.left + (plotWidth / weeklyData.length) * (i + 0.5) - barWidth / 2
                        const barHeight = (w[activeMetric] / maxValue) * plotHeight
                        const y = padding.top + plotHeight - barHeight
                        const isHovered = hoveredBar === i

                        return (
                            <g
                                key={i}
                                onMouseEnter={() => setHoveredBar(i)}
                                onMouseLeave={() => setHoveredBar(null)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Hover highlight column */}
                                <rect
                                    x={padding.left + (plotWidth / weeklyData.length) * i}
                                    y={padding.top}
                                    width={plotWidth / weeklyData.length}
                                    height={plotHeight}
                                    fill={isHovered ? 'rgba(255,255,255,0.03)' : 'transparent'}
                                    rx="4"
                                />

                                {/* Bar */}
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={Math.max(barHeight, 2)}
                                    fill="url(#barGradient)"
                                    rx="4"
                                    ry="4"
                                    filter={isHovered ? 'url(#barGlow)' : 'none'}
                                    opacity={isHovered ? 1 : 0.85}
                                    className={styles.bar}
                                />

                                {/* Value on hover */}
                                {isHovered && (
                                    <g>
                                        <rect
                                            x={padding.left + (plotWidth / weeklyData.length) * (i + 0.5) - 28}
                                            y={y - 30}
                                            width="56"
                                            height="24"
                                            rx="6"
                                            fill="rgba(15,15,35,0.9)"
                                            stroke={colors.main}
                                            strokeWidth="1"
                                        />
                                        <text
                                            x={padding.left + (plotWidth / weeklyData.length) * (i + 0.5)}
                                            y={y - 14}
                                            textAnchor="middle"
                                            fill="#fff"
                                            fontSize="12"
                                            fontWeight="700"
                                            fontFamily="inherit"
                                        >
                                            {w[activeMetric]}
                                        </text>
                                    </g>
                                )}

                                {/* Week label */}
                                <text
                                    x={padding.left + (plotWidth / weeklyData.length) * (i + 0.5)}
                                    y={chartHeight - 10}
                                    textAnchor="middle"
                                    fill={isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'}
                                    fontSize="11"
                                    fontFamily="inherit"
                                    fontWeight={isHovered ? '600' : '400'}
                                >
                                    {w.weekLabel}
                                </text>
                            </g>
                        )
                    })}

                    {/* Line connecting points */}
                    {weeklyData.length > 1 && (
                        <polyline
                            points={weeklyData.map((w, i) => {
                                const x = padding.left + (plotWidth / weeklyData.length) * (i + 0.5)
                                const y = padding.top + plotHeight - (w[activeMetric] / maxValue) * plotHeight
                                return `${x},${y}`
                            }).join(' ')}
                            fill="none"
                            stroke={colors.main}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={styles.trendLine}
                        />
                    )}

                    {/* Data points */}
                    {weeklyData.map((w, i) => {
                        const x = padding.left + (plotWidth / weeklyData.length) * (i + 0.5)
                        const y = padding.top + plotHeight - (w[activeMetric] / maxValue) * plotHeight
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r={hoveredBar === i ? 6 : 4}
                                fill={colors.main}
                                stroke="#0f0f23"
                                strokeWidth="2"
                                filter="url(#dotGlow)"
                                className={styles.dataPoint}
                            />
                        )
                    })}

                    {/* Trend line (regression) */}
                    {trendLine && (
                        <line
                            x1={padding.left + (plotWidth / weeklyData.length) * 0.5}
                            y1={padding.top + plotHeight - (Math.max(trendLine.startY, 0) / maxValue) * plotHeight}
                            x2={padding.left + (plotWidth / weeklyData.length) * (weeklyData.length - 0.5)}
                            y2={padding.top + plotHeight - (Math.max(trendLine.endY, 0) / maxValue) * plotHeight}
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth="1.5"
                            strokeDasharray="6,4"
                            className={styles.regressionLine}
                        />
                    )}
                </svg>
            </div>

            {/* Tooltip on hover */}
            {hoveredBar !== null && weeklyData[hoveredBar] && (
                <div className={styles.tooltip}>
                    <div className={styles.tooltipHeader}>
                        Week of {weeklyData[hoveredBar].weekLabel}
                    </div>
                    <div className={styles.tooltipGrid}>
                        <span className={styles.tooltipDot} style={{ background: '#6366f1' }}></span>
                        <span>Total</span>
                        <strong>{weeklyData[hoveredBar].total}</strong>
                        <span className={styles.tooltipDot} style={{ background: '#10b981' }}></span>
                        <span>Completed</span>
                        <strong>{weeklyData[hoveredBar].completed}</strong>
                        <span className={styles.tooltipDot} style={{ background: '#f59e0b' }}></span>
                        <span>Pending</span>
                        <strong>{weeklyData[hoveredBar].pending}</strong>
                        <span className={styles.tooltipDot} style={{ background: '#3b82f6' }}></span>
                        <span>Processing</span>
                        <strong>{weeklyData[hoveredBar].processing}</strong>
                        <span className={styles.tooltipDot} style={{ background: '#ef4444' }}></span>
                        <span>Rejected</span>
                        <strong>{weeklyData[hoveredBar].rejected}</strong>
                    </div>
                </div>
            )}

            {/* Insights Section */}
            {insights.length > 0 && (
                <div className={styles.insightsSection}>
                    <h4 className={styles.insightsTitle}>
                        <span>💡</span> Trend Insights
                    </h4>
                    <div className={styles.insightsList}>
                        {insights.map((insight, i) => (
                            <div key={i} className={`${styles.insightCard} ${styles[`insight_${insight.type}`]}`}>
                                <span className={styles.insightIcon}>{insight.icon}</span>
                                <div className={styles.insightContent}>
                                    <span className={styles.insightWeek}>{insight.weekLabel}</span>
                                    <p className={styles.insightMessage}>{insight.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
