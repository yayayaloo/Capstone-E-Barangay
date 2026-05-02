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
    return (
        <nav className={styles.bottomNav}>
            {items.map(item => (
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
