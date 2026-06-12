'use client'

import { useState, useEffect } from 'react'
import styles from './InstallPWAButton.module.css'

export default function InstallPWAButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isInstallable, setIsInstallable] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown')
    const [showInstructions, setShowInstructions] = useState(false)
    const [statusMessage, setStatusMessage] = useState('')

    useEffect(() => {
        // 1. Detect if running in standalone mode (already installed)
        const checkStandalone = () => {
            const isMapStandalone = window.matchMedia('(display-mode: standalone)').matches
            const isNavStandalone = (window.navigator as any).standalone === true
            return isMapStandalone || isNavStandalone
        }
        setIsStandalone(checkStandalone())

        // 2. Detect Platform
        const detectPlatform = () => {
            const ua = window.navigator.userAgent.toLowerCase()
            if (/iphone|ipad|ipod/.test(ua)) {
                return 'ios'
            } else if (/android/.test(ua)) {
                return 'android'
            } else {
                return 'desktop'
            }
        }
        const currentPlatform = detectPlatform()
        setPlatform(currentPlatform)

        // 3. Listen to beforeinstallprompt (Chrome, Android, Edge, etc.)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setIsInstallable(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Listen for standard installation event
        const handleAppInstalled = () => {
            setIsStandalone(true)
            setIsInstallable(false)
            setDeferredPrompt(null)
            setStatusMessage('Thank you for installing E-Barangay!')
            setTimeout(() => setStatusMessage(''), 5000)
        }

        window.addEventListener('appinstalled', handleAppInstalled)

        // For iOS or browsers where prompt doesn't fire, we show button if not in standalone
        if (currentPlatform === 'ios' && !checkStandalone()) {
            setIsInstallable(true)
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstallClick = async () => {
        setStatusMessage('')

        // If already running in standalone app mode
        if (isStandalone) {
            setStatusMessage('E-Barangay Gordon Heights is already installed on this device!')
            setTimeout(() => setStatusMessage(''), 4000)
            return
        }

        // If beforeinstallprompt prompt is available
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setIsInstallable(false)
                setDeferredPrompt(null)
            }
            return
        }

        // If iOS Safari
        if (platform === 'ios') {
            setShowInstructions(true)
            return
        }

        // Otherwise (non-Chrome desktop / generic browser that doesn't trigger prompt)
        setShowInstructions(true)
    }

    // Render nothing if standalone or not installable and we don't have instructions open
    if (isStandalone && !statusMessage) {
        return (
            <div className={styles.installedBadge}>
                <span className={styles.installedIcon}>✓</span> Running on E-Barangay App
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <button 
                onClick={handleInstallClick}
                className="btn btn-primary"
                style={{ 
                    gap: '0.75rem', 
                    padding: '0.875rem 2rem', 
                    fontSize: '1.05rem', 
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    border: '1.5px solid transparent'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateY(-1px)' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download App
            </button>

            {/* In-browser status updates */}
            {statusMessage && (
                <div className={styles.statusToast}>
                    {statusMessage}
                </div>
            )}

            {/* Custom Modal Instructions overlay */}
            {showInstructions && (
                <div className={styles.modalBackdrop} onClick={() => setShowInstructions(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>How to Install E-Barangay</h3>
                            <button className={styles.closeButton} onClick={() => setShowInstructions(false)}>✕</button>
                        </div>
                        <div className={styles.modalBody}>
                            {platform === 'ios' ? (
                                <div className={styles.instructions}>
                                    <p>Follow these quick steps to install the app on your Apple iOS device using Safari:</p>
                                    <ol>
                                        <li>
                                            Tap the <strong>Share</strong> button at the bottom of the screen (the square icon with the up arrow <span className={styles.inlineIcon}>⎋</span>).
                                        </li>
                                        <li>
                                            Scroll down the menu list and select <strong>Add to Home Screen</strong>.
                                        </li>
                                        <li>
                                            Tap <strong>Add</strong> in the top right corner to complete the installation.
                                        </li>
                                    </ol>
                                    <div className={styles.iosTip}>
                                        Note: iOS PWA installations are only supported natively on Apple's default <strong>Safari browser</strong>.
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.instructions}>
                                    <p>To install E-Barangay on your current browser:</p>
                                    <ol>
                                        <li>
                                            Look at your browser's address bar at the top of the screen.
                                        </li>
                                        <li>
                                            Click the <strong>Install App</strong> icon (usually a computer screen with a down arrow, or a plus icon <span className={styles.inlineIcon}>⊕</span>) on the right side of the address bar.
                                        </li>
                                        <li>
                                            Alternatively, open your browser menu (the three dots <span className={styles.inlineIcon}>⋮</span> or lines) and select <strong>Install E-Barangay</strong>.
                                        </li>
                                    </ol>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowInstructions(false)}>
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
