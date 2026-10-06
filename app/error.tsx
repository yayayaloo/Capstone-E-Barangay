'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Unhandled application error:', error)
    }, [error])

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.5rem',
            background: 'radial-gradient(circle at 15% 20%, #e2f4e8 0%, #edf7f0 35%, #f4fbf6 70%, #ebf5ee 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                maxWidth: '480px',
                width: '100%',
                background: '#ffffff',
                borderRadius: '20px',
                padding: '2.5rem 2rem',
                boxShadow: '0 20px 60px -15px rgba(6, 78, 59, 0.16), 0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#fef2f2',
                    border: '2px solid #fecaca',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem'
                }}>
                    <AlertTriangle size={32} />
                </div>

                <h1 style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: '#111827',
                    margin: '0 0 0.5rem'
                }}>
                    Something went wrong
                </h1>

                <p style={{
                    fontSize: '0.88rem',
                    color: '#64748b',
                    lineHeight: 1.55,
                    margin: '0 0 1.75rem'
                }}>
                    An unexpected issue occurred while processing your request. Please try reloading the page or return to the sign in portal.
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    <button
                        type="button"
                        onClick={() => reset()}
                        style={{
                            width: '100%',
                            padding: '0.85rem 1.5rem',
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
                        }}
                    >
                        <RefreshCw size={16} />
                        <span>Try Again</span>
                    </button>

                    <Link
                        href="/login"
                        style={{
                            width: '100%',
                            padding: '0.8rem 1.5rem',
                            background: '#ffffff',
                            color: '#475569',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Home size={16} />
                        <span>Return to Sign In</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
