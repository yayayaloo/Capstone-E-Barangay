'use client'

import Link from 'next/link'
import styles from '@/app/components/legal-content.module.css'

export default function PrivacyPage() {
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
                            We value your privacy and are committed to full compliance with Data Privacy Laws (e.g., Data Privacy Act of 2012). This policy explains our practices regarding your information.
                        </p>
                        
                        <p><strong>Data Collection & Storage</strong></p>
                        <p>
                            We collect personal information such as your name, email, birthdate, phone number, and address to facilitate barangay services. This data is stored securely using industry-standard encryption protocols provided by Supabase.
                        </p>
                        
                        <p><strong>User Rights</strong></p>
                        <p>
                            As a user, you have the following rights regarding your data:
                        </p>
                        <ul>
                            <li><strong>Right to be Informed:</strong> Know how your data is collected and processed.</li>
                            <li><strong>Right to Access:</strong> View the information we have on file for you.</li>
                            <li><strong>Right to Rectification:</strong> Request corrections to inaccurate data.</li>
                            <li><strong>Right to Erasure:</strong> Request deletion of your account and associated data.</li>
                            <li><strong>Right to Object:</strong> Object to unauthorized data processing.</li>
                        </ul>
                        
                        <p><strong>Compliance</strong></p>
                        <p>
                            E-Barangay adheres to the standards set by the National Privacy Commission and ensures that all data handlers are trained in privacy best practices.
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
