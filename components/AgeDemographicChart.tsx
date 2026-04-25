'use client'

import { useState, useEffect, useMemo } from 'react'
import styles from './AgeDemographicChart.module.css'

const AGE_BRACKETS = [
    { label: 'Infant/Child', min: 0, max: 14 },
    { label: 'Youth', min: 15, max: 24 },
    { label: 'Young Adult', min: 25, max: 34 },
    { label: 'Adult', min: 35, max: 44 },
    { label: 'Middle-aged', min: 45, max: 54 },
    { label: 'Senior', min: 55, max: 64 },
    { label: 'Elderly', min: 65, max: 999 },
]

interface BracketCount {
    label: string
    range: string
    male: number
    female: number
    total: number
}

function calculateAge(birthdate: string): number {
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age
}

export default function AgeDemographicChart({ profiles }: { profiles: any[] }) {
    const [data, setData] = useState<BracketCount[]>([])
    const [noBirthdateCount, setNoBirthdateCount] = useState(0)
    const [totalResidents, setTotalResidents] = useState(0)

    useEffect(() => {
        if (profiles) {
            processData(profiles)
        }
    }, [profiles])

    const processData = (profiles: any[]) => {
        setTotalResidents(profiles.length)

        // Initialize bracket counts
            const counts: Record<string, { male: number; female: number }> = {}
            AGE_BRACKETS.forEach(b => { counts[b.label] = { male: 0, female: 0 } })

            let missing = 0

            ;(profiles || []).forEach((p: any) => {
                if (!p.birthdate) {
                    missing++
                    return
                }

                const age = calculateAge(p.birthdate)
                const gender = (p.gender || '').toLowerCase()
                const isMale = gender === 'male'
                const isFemale = gender === 'female'

                const bracket = AGE_BRACKETS.find(b => age >= b.min && age <= b.max)
                if (bracket && counts[bracket.label]) {
                    if (isMale) counts[bracket.label].male++
                    else if (isFemale) counts[bracket.label].female++
                }
            })

            setNoBirthdateCount(missing)

            const result: BracketCount[] = AGE_BRACKETS.map(b => ({
                label: b.label,
                range: b.max === 999 ? `${b.min}+` : `${b.min}–${b.max}`,
                male: counts[b.label].male,
                female: counts[b.label].female,
                total: counts[b.label].male + counts[b.label].female,
            }))

        setData(result)
    }

    const maxValue = useMemo(() => {
        return Math.max(...data.map(d => d.total), 1)
    }, [data])

    const avgAge = useMemo(() => {
        const total = data.reduce((sum, d) => sum + d.total, 0)
        if (total === 0) return 0
        // Weighted average using bracket midpoints
        const weighted = data.reduce((sum, d, i) => {
            const mid = AGE_BRACKETS[i].max === 999 ? 70 : (AGE_BRACKETS[i].min + AGE_BRACKETS[i].max) / 2
            return sum + mid * d.total
        }, 0)
        return Math.round(weighted / total)
    }, [data])

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h3 className={styles.title}>
                        <span>🎂</span> Age Demographic
                    </h3>
                    <p className={styles.subtitle}>
                        Population distribution by age bracket • {totalResidents} registered residents
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
                {data.map((item) => {
                    const maleWidth = maxValue > 0 ? (item.male / maxValue) * 100 : 0
                    const femaleWidth = maxValue > 0 ? (item.female / maxValue) * 100 : 0

                    return (
                        <div className={styles.row} key={item.label}>
                            <div className={styles.label}>
                                <span className={styles.labelName}>{item.label}</span>
                                <span className={styles.labelRange}>{item.range}</span>
                            </div>
                            <div className={styles.barContainer}>
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
                    <div className={styles.footerValue}>~{avgAge}</div>
                    <div className={styles.footerLabel}>Avg. Age</div>
                </div>
                <div className={styles.footerStat}>
                    <div className={styles.footerValue}>{data.reduce((s, d) => s + d.total, 0)}</div>
                    <div className={styles.footerLabel}>With Birthdate</div>
                </div>
            </div>

            {noBirthdateCount > 0 && (
                <p className={styles.note}>
                    ⚠️ {noBirthdateCount} resident{noBirthdateCount > 1 ? 's have' : ' has'} no birthdate on file and {noBirthdateCount > 1 ? 'are' : 'is'} excluded from this chart.
                </p>
            )}
        </div>
    )
}
