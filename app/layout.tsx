import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import ClientLayout from '@/components/ClientLayout'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
})

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: '#059669',
}

export const metadata: Metadata = {
    title: 'E-Barangay Gordon Heights | Smart PWA Portal',
    description: 'Intelligent Cloud-Based PWA for Automated Resident Inquiries and QR-Enabled Services',
    manifest: '/manifest.json',
    icons: {
        icon: '/logo.png',
        apple: '/logo.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'E-Barangay',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={inter.variable}>
            <body>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    )
}
