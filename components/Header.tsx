'use client'

import Link from 'next/link'
import styles from './Header.module.css'

interface HeaderProps {
    title: string
    userName: string
    onSignOut: () => void
    variant?: 'admin' | 'resident'
}

export default function Header({ title, userName, onSignOut, variant = 'resident' }: HeaderProps) {
    return (
        <header className={`${styles.header} ${variant === 'admin' ? styles.adminHeader : ''}`}>
            <div className="container flex-between">
                <Link href={variant === 'admin' ? '/admin' : '/resident'} className={styles.logo}>
                    <span className={styles.logoIcon}>🏛️</span>
                    <span>{title}</span>
                </Link>
                <div className={styles.userMenu}>
                    <span className={styles.userName}>👤 {userName}</span>
                    <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={onSignOut}>
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    )
}
