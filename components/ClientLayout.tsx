'use client'

import { useEffect } from 'react'
import AuthProvider from '@/components/AuthProvider'
import { ToastProvider } from '@/components/Toast'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => console.log('SW registered'))
                .catch((err) => console.log('SW registration failed:', err))
        }
    }, [])

    return (
        <AuthProvider>
            <ToastProvider>
                {children}
            </ToastProvider>
        </AuthProvider>
    )
}
