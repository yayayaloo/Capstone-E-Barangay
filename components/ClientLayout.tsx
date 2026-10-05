'use client'

import { useEffect } from 'react'
import AuthProvider from '@/components/AuthProvider'
import { ToastProvider } from '@/components/Toast'
import InstallPWA from '@/components/InstallPWA'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

        if (process.env.NODE_ENV === 'production') {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    registration.update()
                })
                .catch((err) => console.error('SW registration failed:', err))
        } else {
            // In development mode, unregister any active service workers so they don't cache HMR chunks or freeze the dev server
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister()
                }
            })
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
