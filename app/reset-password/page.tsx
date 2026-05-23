'use client'

import React, { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useToast } from '@/components/Toast'
import styles from '../forgot-password/forgot-password.module.css'
import registerStyles from '../register/register.module.css'

function ResetPasswordContent() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const { showToast } = useToast()
    const hasSuccessfullyUpdated = useRef(false)

    useEffect(() => {
        // Prevent auto-login if the user navigates away from this page without updating password
        return () => {
            if (!hasSuccessfullyUpdated.current) {
                supabase.auth.signOut().catch(console.error)
            }
        }
    }, [])

    useEffect(() => {
        const code = searchParams.get('code')

        // Supabase SSR client automatically exchanges the PKCE code in the background
        // We listen for the recovery event to know when it's done and clean up the URL
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
                console.log("Auth event triggered:", event)
                if (code) {
                    router.replace('/reset-password')
                }
            }
        })

        // Handle error returned from auth callback redirect, if any
        const errorDescription = searchParams.get('error_description')
        if (errorDescription) {
            setError(errorDescription)
            if (showToast) showToast('Link error', 'error')
        }

        return () => subscription.unsubscribe()
    }, [searchParams, router, showToast])

    // Real-time validation logic
    const hasMinLength = password.length >= 6
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[@$!%*#?&]/.test(password)
    const allCriteriaMet = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial

    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
    const showMatchStatus = confirmPassword.length > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!passwordsMatch) {
            const msg = 'Passwords do not match'
            setError(msg)
            if (showToast) showToast(msg, 'error')
            return
        }

        if (!allCriteriaMet) {
            const msg = 'Password does not meet all security requirements'
            setError(msg)
            if (showToast) showToast(msg, 'error')
            return
        }

        setLoading(true)

        const withTimeout = <T,>(promise: Promise<T>, ms: number, fallbackMessage: string): Promise<T> => {
            let timeoutId: any;
            const timeoutPromise = new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(fallbackMessage)), ms);
            });
            return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
        };

        try {
            // ULTIMATE FUNCTIONAL BYPASS: Avoid Supabase client entirely for the update
            // 1. Get the access token directly from Supabase or Cookies
            let accessToken = null;
            try {
                const sessionResult: any = await withTimeout(supabase.auth.getSession(), 3000, 'timeout');
                accessToken = sessionResult?.data?.session?.access_token;
            } catch (e) {
                // If getSession timed out or failed, try parsing cookies directly
                const match = document.cookie.match(/sb-[a-z0-9]+-auth-token=([^;]+)/);
                if (match && match[1]) {
                    try {
                        const parsed = JSON.parse(decodeURIComponent(match[1]));
                        if (Array.isArray(parsed) && parsed.length > 0) accessToken = parsed[0];
                    } catch (err) { }
                }
            }

            if (!accessToken) {
                const msg = 'Your reset link has expired or is invalid. Please go back and request a new link.';
                setError(msg);
                if (showToast) showToast('Session expired', 'error');
                setLoading(false);
                return;
            }

            // 2. Raw fetch to update password (bypasses ALL client locks/bugs)
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
            const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': apiKey
                },
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.msg || 'Failed to update password. Please try again.');
            }

            // 3. Success Path
            hasSuccessfullyUpdated.current = true;
            setSuccess(true);
            if (showToast) showToast('Password updated! Please sign in with your new password.', 'success');

            // Fire and forget logout to prevent auto-login, using raw fetch as well!
            fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': apiKey }
            }).catch(() => { });

            // Clear standard auth cookies to ensure complete sign out
            document.cookie.split(";").forEach((c) => {
                if (c.trim().startsWith("sb-")) {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                }
            });

            setTimeout(() => router.push('/login'), 3000);

        } catch (err: any) {
            console.error("Error during password update:", err)
            const msg = err.message || 'An unexpected error occurred'
            setError(msg)
            if (showToast) showToast(msg, 'error')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.card} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Password Updated!</h2>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Your password has been successfully reset. You will be redirected to the login page shortly.</p>
                    <Link href="/login" className={styles.submitButton} style={{ textDecoration: 'none', display: 'inline-block' }}>
                        Go to Login →
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.background}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
            </div>

            <div className={styles.card}>
                <div className={styles.logoSection}>
                    <div className={styles.logoIcon}></div>
                    <h1>Reset Password</h1>
                    <p>Enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div
                            style={{
                                color: '#ef4444',
                                textAlign: 'center',
                                background: '#fee2e2',
                                padding: '0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.875rem',
                                border: '1px solid #fecaca'
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">New Password</label>
                        <div className={registerStyles.passwordInputWrapper}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                className={registerStyles.passwordToggle}
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className={registerStyles.requirementList}>
                            <div className={`${registerStyles.requirementItem} ${hasMinLength ? registerStyles.validRequirement : registerStyles.invalidRequirement}`}>
                                {hasMinLength ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                <span>At least 6 characters</span>
                            </div>
                            <div className={`${registerStyles.requirementItem} ${hasUppercase ? registerStyles.validRequirement : registerStyles.invalidRequirement}`}>
                                {hasUppercase ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                <span>Uppercase letter</span>
                            </div>
                            <div className={`${registerStyles.requirementItem} ${hasLowercase ? registerStyles.validRequirement : registerStyles.invalidRequirement}`}>
                                {hasLowercase ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                <span>Lowercase letter</span>
                            </div>
                            <div className={`${registerStyles.requirementItem} ${hasNumber ? registerStyles.validRequirement : registerStyles.invalidRequirement}`}>
                                {hasNumber ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                <span>Number</span>
                            </div>
                            <div className={`${registerStyles.requirementItem} ${hasSpecial ? registerStyles.validRequirement : registerStyles.invalidRequirement}`}>
                                {hasSpecial ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                <span>Special character (@$!%*#?&)</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <div className={registerStyles.passwordInputWrapper}>
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                className={registerStyles.passwordToggle}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {showMatchStatus && (
                            <div className={`${registerStyles.matchStatus} ${passwordsMatch ? registerStyles.matchSuccess : registerStyles.matchError}`}>
                                {passwordsMatch ? (
                                    <>
                                        <ShieldCheck size={14} />
                                        <span>Passwords match</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldAlert size={14} />
                                        <span>Passwords do not match</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading || !allCriteriaMet || !passwordsMatch}
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className={styles.container}>
                <div className={styles.card}>
                    <p style={{ textAlign: 'center' }}>Loading...</p>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}