'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isDismissed, setIsDismissed] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Check if user already dismissed install banner in this session
        const dismissedAt = localStorage.getItem('pwa_prompt_dismissed')
        if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 3 * 24 * 60 * 60 * 1000) {
            // Dismissed within last 3 days
            setIsDismissed(true)
        }

        // Check if running in standalone mode (already installed)
        if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
            setIsInstalled(true)
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
            localStorage.removeItem('pwa_prompt_dismissed')
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the PWA install prompt')
        } else {
            console.log('User dismissed the PWA install prompt')
        }
        setDeferredPrompt(null)
    }

    const handleDismiss = () => {
        setIsDismissed(true)
        localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
    }

    if (!deferredPrompt || isDismissed || isInstalled) {
        return null
    }

    return (
        <div className="pwa-install-banner">
            <style jsx>{`
                .pwa-install-banner {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 9999;
                    max-width: 400px;
                    width: calc(100% - 48px);
                    background: rgba(2, 44, 34, 0.92);
                    border: 1px solid rgba(16, 185, 129, 0.35);
                    box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.6),
                                0 0 30px rgba(16, 185, 129, 0.15);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-radius: 16px;
                    padding: 1.1rem;
                    color: #ffffff;
                    animation: pwaSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    font-family: var(--font-inter), system-ui, sans-serif;
                }

                @keyframes pwaSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(40px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .pwa-content {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 12px;
                }

                .pwa-icon-wrapper {
                    position: relative;
                    flex-shrink: 0;
                    width: 50px;
                    height: 50px;
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }

                .pwa-icon {
                    width: 36px;
                    height: 36px;
                    object-fit: contain;
                }

                .pwa-info {
                    flex: 1;
                    min-width: 0;
                }

                .pwa-title {
                    font-size: 0.98rem;
                    font-weight: 700;
                    color: #f8fafc;
                    margin: 0 0 2px 0;
                    letter-spacing: -0.01em;
                }

                .pwa-desc {
                    font-size: 0.82rem;
                    color: #a7f3d0;
                    margin: 0;
                    opacity: 0.9;
                    line-height: 1.35;
                }

                .pwa-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 10px;
                }

                .pwa-btn-dismiss {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    font-size: 0.85rem;
                    font-weight: 600;
                    padding: 6px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .pwa-btn-dismiss:hover {
                    color: #f1f5f9;
                    background: rgba(255, 255, 255, 0.08);
                }

                .pwa-btn-install {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: #ffffff;
                    border: none;
                    font-size: 0.85rem;
                    font-weight: 700;
                    padding: 8px 18px;
                    border-radius: 10px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .pwa-btn-install:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.5);
                    background: linear-gradient(135deg, #34d399 0%, #059669 100%);
                }

                .pwa-btn-install:active {
                    transform: translateY(0);
                }

                @media (max-width: 480px) {
                    .pwa-install-banner {
                        bottom: 16px;
                        right: 16px;
                        left: 16px;
                        width: auto;
                    }
                }
            `}</style>

            <div className="pwa-content">
                <div className="pwa-icon-wrapper">
                    <img src="/logo.png" alt="E-Barangay Logo" className="pwa-icon" />
                </div>
                <div className="pwa-info">
                    <h4 className="pwa-title">Install E-Barangay App</h4>
                    <p className="pwa-desc">Get fast, offline access & QR services from your home screen.</p>
                </div>
            </div>

            <div className="pwa-actions">
                <button type="button" onClick={handleDismiss} className="pwa-btn-dismiss">
                    Not now
                </button>
                <button type="button" onClick={handleInstallClick} className="pwa-btn-install">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Install App
                </button>
            </div>
        </div>
    )
}
