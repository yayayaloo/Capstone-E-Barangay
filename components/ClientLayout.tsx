'use client'

import { useEffect } from 'react'
import AuthProvider from '@/components/AuthProvider'
import { ToastProvider } from '@/components/Toast'
import InstallPWA from '@/components/InstallPWA'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('SW registered successfully:', registration.scope)
                    // Check for updates on page load
                    registration.update()
                })
                .catch((err) => console.error('SW registration failed:', err))
        }
    }, [])

    return (
        <ToastProvider>
            <AuthProvider>
                {children}
                <InstallPWA />
            </AuthProvider>
        </ToastProvider>
    )
}
