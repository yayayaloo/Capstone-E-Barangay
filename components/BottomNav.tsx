'use client'

import styles from './BottomNav.module.css'

interface NavItem {
    id: string
    icon: string
    label: string
}

interface BottomNavProps {
    items: NavItem[]
    activeTab: string
    setActiveTab: (id: string) => void
}

export default function BottomNav({ items, activeTab, setActiveTab }: BottomNavProps) {
    // Only show 5 items max on bottom nav for clarity, rest could be under 'More' if needed
    // But for this app, 4-5 is fine.
    const displayItems = items.slice(0, 5)

    return (
        <nav className={styles.bottomNav}>
            {displayItems.map(item => (
                <button
                    key={item.id}
                    className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
                    onClick={() => setActiveTab(item.id)}
                >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                </button>
            ))}
        </nav>
    )
}
