'use client'

import Link from 'next/link'
import styles from '@/app/components/legal-content.module.css'

export default function TermsPage() {
    return (
        <div className={styles.legalContainer}>
            <div className={styles.background}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
            </div>

            <div className={styles.contentCard}>
                <div className={styles.section}>
                    <div className={styles.sectionContent}>
                        <p>
                            These Terms and Conditions represent a binding contract between you (the user) and the E-Barangay application. By creating an account, you agree to:
                        </p>
                        <ul>
                            <li>Provide accurate and truthful information during registration.</li>
                            <li>Use the application services solely for legitimate barangay-related transactions.</li>
                            <li>Maintain the confidentiality of your account credentials and not share them with others.</li>
                            <li>Comply with all local and national laws while using the platform.</li>
                            <li>Acknowledge that any misuse of the platform may lead to account suspension.</li>
                        </ul>
                        
                        <p><strong>1. Acceptance of Terms</strong></p>
                        <p>
                            By accessing or using E-Barangay, you agree to be bound by these terms. If you do not agree, please do not use our services.
                        </p>
                        
                        <p><strong>2. Account Responsibility</strong></p>
                        <p>
                            You are responsible for all activities that occur under your account. You must notify us immediately of any unauthorized use.
                        </p>
                    </div>
                </div>

                <div className={styles.footer}>
                    <Link href="/register" className={styles.iconBackButton} title="Back to Registration">
                        <span>←</span>
                    </Link>
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    )
}
