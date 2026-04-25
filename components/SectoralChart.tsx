'use client'

import { useState, useEffect, useMemo } from 'react'
import styles from './SectoralChart.module.css'

const SECTORS = [
    'Solo Parent',
    'OFW',
    'PWD',
    'Senior Citizen',
    'LGBTQ+',
    'Employed',
    'Unemployed',
    '4Ps Beneficiary',
    'Pregnant/Lactating',
    'Youth (15-30)',
    'Indigenous People',
    'OSC',
    'OSY',
    'OSA',
]

interface SectorCount {
    sector: string
    male: number
    female: number
    total: number
}

export default function SectoralChart({ profiles }: { profiles: any[] }) {
    const [data, setData] = useState<SectorCount[]>([])
    const [totalResidents, setTotalResidents] = useState(0)

    useEffect(() => {
        if (profiles) {
            processData(profiles)
        }
    }, [profiles])

    const processData = (profiles: any[]) => {
        setTotalResidents(profiles.length)

            // Count sectors by gender
            const counts: Record<string, { male: number; female: number }> = {}
            SECTORS.forEach(s => { counts[s] = { male: 0, female: 0 } })

            ;(profiles || []).forEach((p: any) => {
                const gender = (p.gender || '').toLowerCase()
                const isMale = gender === 'male'
                const isFemale = gender === 'female'

                ;(p.sectors || []).forEach((sector: string) => {
                    if (counts[sector]) {
                        if (isMale) counts[sector].male++
                        else if (isFemale) counts[sector].female++
                    }
                })
            })

            const result: SectorCount[] = SECTORS.map(s => ({
                sector: s,
                male: counts[s].male,
                female: counts[s].female,
                total: counts[s].male + counts[s].female,
            }))

            setData(result)
    }

    const maxValue = useMemo(() => {
        return Math.max(...data.map(d => d.total), 1)
    }, [data])

    const totalSectored = useMemo(() => {
        // Count unique residents who have at least one sector
        return data.reduce((sum, d) => sum + d.total, 0)
    }, [data])

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h3 className={styles.title}>
                        <span>📊</span> Sectoral Demographic
                    </h3>
                    <p className={styles.subtitle}>
                        Gender breakdown across {SECTORS.length} sectors • {totalResidents} registered residents
                    </p>
                </div>
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#4A90D9' }}></span>
                    Males
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#E8638A' }}></span>
                    Females
                </div>
            </div>

            {/* Chart */}
            <div className={styles.chartArea}>
                {data.map((item, i) => {
                    const maleWidth = maxValue > 0 ? (item.male / maxValue) * 100 : 0
                    const femaleWidth = maxValue > 0 ? (item.female / maxValue) * 100 : 0

                    return (
                        <div className={styles.row} key={item.sector}>
                            <div className={styles.label}>
                                {item.sector}
                            </div>
                            <div className={styles.barContainer}>
                                {/* Stacked bar */}
                                <div className={styles.barTrack}>
                                    {item.male > 0 && (
                                        <div
                                            className={styles.barMale}
                                            style={{ width: `${maleWidth}%` }}
                                            title={`Male: ${item.male}`}
                                        />
                                    )}
                                    {item.female > 0 && (
                                        <div
                                            className={styles.barFemale}
                                            style={{ width: `${femaleWidth}%` }}
                                            title={`Female: ${item.female}`}
                                        />
                                    )}
                                </div>
                                <span className={styles.barValue}>
                                    {item.total > 0 ? (
                                        <>
                                            <span style={{ color: '#4A90D9' }}>{item.male}</span>
                                            {' / '}
                                            <span style={{ color: '#E8638A' }}>{item.female}</span>
                                        </>
                                    ) : (
                                        <span style={{ opacity: 0.4 }}>0</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Summary Footer */}
            <div className={styles.footer}>
                <div className={styles.footerStat}>
                    <div className={styles.footerValue}>{data.reduce((s, d) => s + d.male, 0)}</div>
                    <div className={styles.footerLabel}>Total Males</div>
                </div>
                <div className={styles.footerStat}>
                    <div className={styles.footerValue}>{data.reduce((s, d) => s + d.female, 0)}</div>
                    <div className={styles.footerLabel}>Total Females</div>
                </div>
                <div className={styles.footerStat}>
                    <div className={styles.footerValue}>{totalSectored}</div>
                    <div className={styles.footerLabel}>Total Entries</div>
                </div>
            </div>
        </div>
    )
}
