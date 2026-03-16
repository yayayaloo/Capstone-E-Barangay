'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './forgot-password.module.css'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        // Mock delay to simulate sending email
        await new Promise((resolve) => setTimeout(resolve, 1500))
        setLoading(false)
        setSubmitted(true)
    }

    return (
        <div className={styles.container}>
            <div className={styles.background}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
            </div>

            <div className={styles.card}>
                <div className={styles.logoSection}>
                    <Link href="/login" className={styles.backLink}>← Back to Login</Link>
                    <div className={styles.logoIcon}>
                        {submitted ? '📬' : '🔐'}
                    </div>
                    <h1>{submitted ? 'Check Your Inbox!' : 'Forgot Password'}</h1>
                    <p>
                        {submitted
                            ? `We've sent a password reset link to ${email}`
                            : 'Enter your email address and we\'ll send you a reset link.'}
                    </p>
                </div>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                ) : (
                    <div className={styles.successBox}>
                        <p>Didn&apos;t receive an email? Check your spam folder or try again.</p>
                        <button
                            className={styles.retryButton}
                            onClick={() => { setSubmitted(false); setEmail('') }}
                        >
                            Try Again
                        </button>
                    </div>
                )}

                <div className={styles.footer}>
                    <p>Remember your password?{' '}
                        <Link href="/login" className={styles.link}>Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
