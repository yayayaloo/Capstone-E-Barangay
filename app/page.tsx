'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import styles from './page.module.css'

export default function Home() {
    const [stats, setStats] = useState({ residents: '...', requests: '...' })

    useEffect(() => {
        async function fetchStats() {
            try {
                const { data, error } = await supabase.rpc('get_public_stats')
                
                if (error) throw error

                setStats({
                    residents: data?.residents?.toLocaleString() || '0',
                    requests: data?.requests?.toLocaleString() || '0'
                })
            } catch (e) {
                console.error(e)
            }
        }
        fetchStats()
    }, [])

    return (
        <main className={styles.main}>
            {/* Navigation (unchanged part) */}
            <nav className={styles.nav}>
                <div className="container flex-between">
                    <div className={styles.logo}>
                        <Image src="/logo.png" alt="Barangay Gordon Heights Logo" width={40} height={40} className={styles.logoImage} />
                        <span>E-Barangay</span>
                    </div>
                    <div className={styles.navLinks}>
                        <a href="#services">Services</a>
                        <a href="#features">Features</a>
                        <a href="#about">About</a>
                        <Link href="/login" className="btn btn-outline">Login</Link>
                        <Link href="/register" className="btn btn-primary">Sign Up</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={`container ${styles.heroContainer}`}>
                    <div className={styles.heroContent}>
                        <div className={`${styles.badge} badge badge-info`}>
                            ✨ Now Live - 24/7 Digital Services
                        </div>
                        <h1 className="animate-fadeIn">
                            E-Barangay<br />Gordon Heights
                        </h1>
                        <p className={styles.heroSubtitle}>
                            The most advanced community portal with AI assistance and secure QR document verification.
                            Processing {stats.requests} requests for our {stats.residents} residents.
                        </p>
                        <div className={styles.heroCTA}>
                            <Link href="/register" className="btn btn-primary">
                                <span>🚀</span>
                                Get Started
                            </Link>
                            <Link href="/login" className="btn btn-outline">
                                <span>🔐</span>
                                Sign In
                            </Link>
                        </div>

                        {/* Real Stats */}
                        <div className={styles.stats}>
                            <div className={styles.statItem}>
                                <div className={styles.statNumber}>24/7</div>
                                <div className={styles.statLabel}>Available</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statNumber}>{stats.residents}</div>
                                <div className={styles.statLabel}>Residents</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statNumber}>AI</div>
                                <div className={styles.statLabel}>Powered</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.heroVisual}>
                        <div className={`${styles.mockupCard} glass-card animate-float`}>
                            <div className={styles.mockupHeader}>
                                <div className={styles.mockupDots}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <span>E-Barangay Portal</span>
                            </div>
                            <div className={styles.mockupContent}>
                                <div className={styles.chatBubble}>
                                    <div className={styles.avatar}>🤖</div>
                                    <div>
                                        <strong>AI Assistant</strong>
                                        <p>How can I help you today?</p>
                                    </div>
                                </div>
                                <div className={styles.serviceGrid}>
                                    <div className={styles.serviceItem}>📄 Clearance</div>
                                    <div className={styles.serviceItem}>📝 Permits</div>
                                    <div className={styles.serviceItem}>🆔 ID Request</div>
                                    <div className={styles.serviceItem}>📱 QR Verify</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Animated Background Elements */}
                <div className={styles.bgGradient1}></div>
                <div className={styles.bgGradient2}></div>
            </section>

            {/* Features Section */}
            <section id="features" className="section">
                <div className="container">
                    <div className={styles.sectionHeader}>
                        <h2>Powered by Advanced Technology</h2>
                        <p>Bringing modern digital services to Barangay Gordon Heights</p>
                    </div>

                    <div className="grid grid-3">
                        <div className="glass-card">
                            <div className={styles.featureIcon}>🤖</div>
                            <h3>AI Chatbot</h3>
                            <p>
                                Get instant answers to your questions 24/7 through our intelligent
                                Natural Language Processing-powered assistant.
                            </p>
                        </div>

                        <div className="glass-card">
                            <div className={styles.featureIcon}>📱</div>
                            <h3>QR Verification</h3>
                            <p>
                                Secure document authentication with embedded QR codes.
                                Verify certificates instantly and prevent forgery.
                            </p>
                        </div>

                        <div className="glass-card">
                            <div className={styles.featureIcon}>☁️</div>
                            <h3>Cloud-Based</h3>
                            <p>
                                Access from any device, anywhere. Your data is secure,
                                backed up, and always available when you need it.
                            </p>
                        </div>

                        <div className="glass-card">
                            <div className={styles.featureIcon}>⚡</div>
                            <h3>Progressive Web App</h3>
                            <p>
                                Install on your phone like a native app. Works offline
                                and provides a seamless mobile experience.
                            </p>
                        </div>

                        <div className="glass-card">
                            <div className={styles.featureIcon}>🔒</div>
                            <h3>Secure & Private</h3>
                            <p>
                                Your personal information is encrypted and protected.
                                We follow strict data privacy regulations.
                            </p>
                        </div>

                        <div className="glass-card">
                            <div className={styles.featureIcon}>⏱️</div>
                            <h3>Fast Processing</h3>
                            <p>
                                Reduced waiting time for document requests.
                                Track your application status in real-time.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section id="services" className="section">
                <div className="container">
                    <div className={styles.sectionHeader}>
                        <h2>Available Services</h2>
                        <p>Request documents and access services digitally</p>
                    </div>

                    <div className="grid grid-2">
                        <div className={`glass-card ${styles.serviceCard}`}>
                            <div className={styles.serviceCardIcon}>📄</div>
                            <div>
                                <h3>Barangay Clearance</h3>
                                <p>Apply for barangay clearance online. Get QR-verified certificates.</p>
                                <ul className={styles.serviceFeatures}>
                                    <li>✓ Online application</li>
                                    <li>✓ Real-time tracking</li>
                                    <li>✓ QR verification</li>
                                    <li>✓ Digital download</li>
                                </ul>
                            </div>
                        </div>

                        <div className={`glass-card ${styles.serviceCard}`}>
                            <div className={styles.serviceCardIcon}>🏠</div>
                            <div>
                                <h3>Business Permits</h3>
                                <p>Process business permit applications and renewals digitally.</p>
                                <ul className={styles.serviceFeatures}>
                                    <li>✓ Digital forms</li>
                                    <li>✓ Document upload</li>
                                    <li>✓ Status updates</li>
                                    <li>✓ Payment tracking</li>
                                </ul>
                            </div>
                        </div>

                        <div className={`glass-card ${styles.serviceCard}`}>
                            <div className={styles.serviceCardIcon}>🆔</div>
                            <div>
                                <h3>Barangay ID</h3>
                                <p>Request your Barangay ID with photo upload and verification.</p>
                                <ul className={styles.serviceFeatures}>
                                    <li>✓ Photo upload</li>
                                    <li>✓ Digital signature</li>
                                    <li>✓ Quick approval</li>
                                    <li>✓ Claim scheduling</li>
                                </ul>
                            </div>
                        </div>

                        <div className={`glass-card ${styles.serviceCard}`}>
                            <div className={styles.serviceCardIcon}>📢</div>
                            <div>
                                <h3>Announcements & News</h3>
                                <p>Stay updated with barangay events, bulletins, and emergency alerts.</p>
                                <ul className={styles.serviceFeatures}>
                                    <li>✓ Push notifications</li>
                                    <li>✓ Event calendar</li>
                                    <li>✓ Emergency alerts</li>
                                    <li>✓ Community updates</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className={`section ${styles.aboutSection}`}>
                <div className="container">
                    <div className="grid grid-2">
                        <div className={styles.aboutContent}>
                            <h2>Modernizing Local Governance</h2>
                            <p>
                                E-Barangay is an innovative digital transformation initiative for
                                Barangay Gordon Heights, designed to streamline operations and provide
                                24/7 access to essential services.
                            </p>
                            <p>
                                By integrating Artificial Intelligence, Cloud Computing, and QR Technology,
                                we're reducing administrative overhead, eliminating physical inefficiencies,
                                and ensuring transparent, accessible service delivery.
                            </p>
                            <div className={styles.aboutStats}>
                                <div>
                                    <strong>Zero</strong>
                                    <span>Paper Wastage</span>
                                </div>
                                <div>
                                    <strong>Instant</strong>
                                    <span>Verification</span>
                                </div>
                                <div>
                                    <strong>Always</strong>
                                    <span>Accessible</span>
                                </div>
                            </div>
                        </div>

                        <div className={`glass-card ${styles.techStack}`}>
                            <h3>Powered By</h3>
                            <div className={styles.techList}>
                                <div className={styles.techItem}>
                                    <span>⚛️</span>
                                    <div>
                                        <strong>Next.js PWA</strong>
                                        <small>Modern web framework</small>
                                    </div>
                                </div>
                                <div className={styles.techItem}>
                                    <span>🤖</span>
                                    <div>
                                        <strong>AI & NLP</strong>
                                        <small>Natural language processing</small>
                                    </div>
                                </div>
                                <div className={styles.techItem}>
                                    <span>☁️</span>
                                    <div>
                                        <strong>Cloud Infrastructure</strong>
                                        <small>Scalable & secure</small>
                                    </div>
                                </div>
                                <div className={styles.techItem}>
                                    <span>🔐</span>
                                    <div>
                                        <strong>QR Technology</strong>
                                        <small>Document verification</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className="container">
                    <div className={styles.footerContent}>
                        <div className={styles.footerSection}>
                            <h4>E-Barangay Gordon Heights</h4>
                            <p>Your intelligent portal for barangay services</p>
                        </div>

                        <div className={styles.footerSection}>
                            <h4>Quick Links</h4>
                            <ul>
                                <li><a href="#services">Services</a></li>
                                <li><a href="#features">Features</a></li>
                                <li><Link href="/resident">Resident Portal</Link></li>
                                <li><Link href="/admin">Admin Login</Link></li>
                            </ul>
                        </div>

                        <div className={styles.footerSection}>
                            <h4>Contact</h4>
                            <p>📍 Barangay Hall, Gordon Heights</p>
                            <p>📞 (123) 456-7890</p>
                            <p>✉️ info@ebarangay-gh.gov.ph</p>
                        </div>
                    </div>

                    <div className={styles.footerBottom}>
                        <p>&copy; 2026 E-Barangay Gordon Heights. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </main>
    )
}
