import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import styles from './page.module.css'
import InstallPWAButton from '@/components/InstallPWAButton'

export const revalidate = 3600; // Cache the page and revalidate every hour

export default async function Home() {
    let stats = { residents: '0', requests: '0' }
    let showStats = false

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey)
            const { data, error } = await supabase.rpc('get_public_stats')
            if (!error && data) {
                stats = {
                    residents: data?.residents?.toLocaleString() || '0',
                    requests: data?.requests?.toLocaleString() || '0'
                }
                showStats = true
            }
        }
    } catch (e) {
        console.error('Error loading public stats:', e)
    }

    return (
        <>
            {/* Semantic Navigation Landmark outside main */}
            <nav className={styles.nav}>
                <div className="container flex-between">
                    <div className={styles.logo}>
                        <Image src="/logo.png" alt="Barangay Gordon Heights Logo" width={40} height={40} className={styles.logoImage} />
                        <span>E-Barangay</span>
                    </div>

                    {/* CSS-Only Responsive Hamburger Menu */}
                    <input type="checkbox" id="nav-toggle" className={styles.navToggle} />
                    <label htmlFor="nav-toggle" className={styles.navMenuButton} aria-label="Toggle navigation menu">
                        <span className={styles.navIcon}></span>
                    </label>

                    <div className={styles.navLinks}>
                        <a href="#services">Services</a>
                        <a href="#about">About</a>
                        <Link href="/login" className="btn btn-outline">Login</Link>
                        <Link href="/register" className="btn btn-outline">Sign Up</Link>
                    </div>
                </div>
            </nav>

            <main className={styles.main}>
                {/* Hero Section */}
                <section className={styles.hero}>
                    <div className="container" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className={styles.heroContent} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className={`${styles.badge} badge badge-info`} style={{ margin: '0 auto 1.5rem' }}>
                                Official Civic Portal • 24/7 Digital Access
                            </div>
                            <h1 className="animate-fadeIn">
                                E-Barangay<br />Gordon Heights
                            </h1>
                            <p className={styles.heroSubtitle} style={{ textAlign: 'center' }}>
                                {showStats ? (
                                    <>
                                        Skip the queues and access official barangay services online. Request documents, 
                                        track applications, and verify certificates with secure QR codes—serving {stats.residents} residents with {stats.requests} requests processed.
                                    </>
                                ) : (
                                    <>
                                        Skip the queues and access official barangay services online. Request documents, 
                                        track applications, and verify certificates with secure QR codes—anytime, anywhere.
                                    </>
                                )}
                            </p>
                             <div className={styles.heroCTA} style={{ justifyContent: 'center', alignItems: 'center' }}>
                                 <Link href="/register" className="btn btn-primary">
                                     Get Started
                                 </Link>
                                 <Link href="/login" className="btn btn-outline">
                                     Sign In
                                 </Link>
                             </div>
                             <div style={{ marginTop: '0.5rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'center' }}>
                                 <InstallPWAButton />
                             </div>

                            {/* Real Stats */}
                            <div className={styles.stats} style={{ justifyContent: 'center' }}>
                                <div className={styles.statItem}>
                                    <div className={styles.statNumber}>24/7</div>
                                    <div className={styles.statLabel}>Active Portal</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statNumber}>{showStats ? stats.residents : 'Verified'}</div>
                                    <div className={styles.statLabel}>Residents</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statNumber}>AI</div>
                                    <div className={styles.statLabel}>Assisted</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Animated Background Elements */}
                    <div className={styles.bgGradient1}></div>
                    <div className={styles.bgGradient2}></div>
                </section>

                {/* Services Section */}
                <section id="services" className="section">
                    <div className="container">
                        <div className={styles.sectionHeader}>
                            <h2>Secure Digital Services</h2>
                            <p>Apply for certificates, clearances, and permits online with automated verification and zero queues.</p>
                        </div>

                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', maxWidth: '1200px', margin: '0 auto' }}>
                            <Link href="/login" className={`glass-card ${styles.serviceCard}`}>
                                <div className={styles.serviceCardIcon}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        <path d="m9 12 2 2 4-4"/>
                                    </svg>
                                </div>
                                <div className={styles.serviceCardContent}>
                                    <h3>Barangay Clearance</h3>
                                    <p>Official clearance verifying your residency status and clean local record.</p>
                                    <ul className={styles.serviceFeatures}>
                                        <li>Residency verification</li>
                                        <li>Standard fee: ₱50.00</li>
                                        <li>Requires valid ID</li>
                                        <li>Real-time status tracking</li>
                                    </ul>
                                </div>
                            </Link>

                            <Link href="/login" className={`glass-card ${styles.serviceCard}`}>
                                <div className={styles.serviceCardIcon}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                                    </svg>
                                </div>
                                <div className={styles.serviceCardContent}>
                                    <h3>Business Clearance</h3>
                                    <p>Locational clearance required for processing commercial permits in Gordon Heights.</p>
                                    <ul className={styles.serviceFeatures}>
                                        <li>Commercial compliance</li>
                                        <li>DTI Certificate required</li>
                                        <li>Free of Charge</li>
                                        <li>Digital document upload</li>
                                    </ul>
                                </div>
                            </Link>

                            <Link href="/login" className={`glass-card ${styles.serviceCard}`}>
                                <div className={styles.serviceCardIcon}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9 22 9 12 15 12 15 22"/>
                                    </svg>
                                </div>
                                <div className={styles.serviceCardContent}>
                                    <h3>Certificate of Residency</h3>
                                    <p>Official proof of residence and duration of stay in the barangay community.</p>
                                    <ul className={styles.serviceFeatures}>
                                        <li>Proof of address</li>
                                        <li>Standard fee: ₱50.00</li>
                                        <li>Requires valid ID</li>
                                        <li>Quick online approval</li>
                                    </ul>
                                </div>
                            </Link>

                            <Link href="/login" className={`glass-card ${styles.serviceCard}`}>
                                <div className={styles.serviceCardIcon}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                                    </svg>
                                </div>
                                <div className={styles.serviceCardContent}>
                                    <h3>Certificate of Indigency</h3>
                                    <p>Official declaration of financial status for educational or medical assistance.</p>
                                    <ul className={styles.serviceFeatures}>
                                        <li>Social services assistance</li>
                                        <li>Free of Charge</li>
                                        <li>Requires valid ID</li>
                                        <li>Standard fee exemption</li>
                                    </ul>
                                </div>
                            </Link>

                            <Link href="/login" className={`glass-card ${styles.serviceCard}`}>
                                <div className={styles.serviceCardIcon}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
                                        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                                    </svg>
                                </div>
                                <div className={styles.serviceCardContent}>
                                    <h3>First Time Job Seeker</h3>
                                    <p>No-fee certificate waiving public pre-employment requirements under RA 11261.</p>
                                    <ul className={styles.serviceFeatures}>
                                        <li>Pre-employment helper</li>
                                        <li>Free of Charge (Ages 18-30)</li>
                                        <li>Requires valid ID</li>
                                        <li>First-time job seekers</li>
                                    </ul>
                                </div>
                            </Link>

                            <Link href="/login" className={`glass-card ${styles.serviceCard}`}>
                                <div className={styles.serviceCardIcon}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M2 22h20"/>
                                        <path d="M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18"/>
                                        <path d="M9 18h6v4H9v-4Z"/>
                                        <path d="M8 6h2v2H8V6Z"/>
                                        <path d="M14 6h2v2h-2V6Z"/>
                                    </svg>
                                </div>
                                <div className={styles.serviceCardContent}>
                                    <h3>Lot & Building Certification</h3>
                                    <p>Property certificate indicating official occupancy status for municipal compliance.</p>
                                    <ul className={styles.serviceFeatures}>
                                        <li>Occupancy status proof</li>
                                        <li>Rate: ₱1.00/sqm</li>
                                        <li>Tax dec. & Purok Cert reqs</li>
                                        <li>Compliance processing</li>
                                    </ul>
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Innovations Section */}
                <section className="section" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <div className="container">
                        <div className={styles.sectionHeader}>
                            <h2>Platform Innovations</h2>
                            <p>Cutting-edge civic tech built for Barangay Gordon Heights</p>
                        </div>

                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(450px, 100%), 1fr))', maxWidth: '1100px', margin: '0 auto' }}>
                            <div className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.75rem', borderRadius: '12px', display: 'flex' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        <path d="M8 10h.01"/>
                                        <path d="M12 10h.01"/>
                                        <path d="M16 10h.01"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>AI Citizen Assistant</h4>
                                    <p style={{ fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                                        Chat with our intelligent chatbot to query local ordinances, guidelines, and FAQs instantly. 
                                        Get guided assistance on document requirements without waiting for office hours.
                                    </p>
                                </div>
                            </div>

                            <div className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.75rem', borderRadius: '12px', display: 'flex' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        <path d="m9 12 2 2 4-4"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>Tamper-Proof QR Codes</h4>
                                    <p style={{ fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                                        Every certificate issued features a secure, tamper-proof QR code. Employers and government 
                                        offices can scan the code to instantly verify its authenticity online, preventing document forgery.
                                    </p>
                                </div>
                            </div>

                            <div className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.75rem', borderRadius: '12px', display: 'flex' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 12h18M3 6h18M3 18h18"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>PWA & Offline Capability</h4>
                                    <p style={{ fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                                        Install E-Barangay directly to your home screen. Access profiles and prepare request forms offline; 
                                        they will queue and auto-synchronize as soon as you regain internet connectivity.
                                    </p>
                                </div>
                            </div>

                            <div className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                                <div style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.75rem', borderRadius: '12px', display: 'flex' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="9" y1="9" x2="15" y2="9"/>
                                        <line x1="9" y1="13" x2="15" y2="13"/>
                                        <line x1="9" y1="17" x2="13" y2="17"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>Blotter & System Audits</h4>
                                    <p style={{ fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                                        Centralized case logs record official disputes and administrative actions. System audit records 
                                        are automatically secured, maintaining absolute integrity and service transparency.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section id="about" className={`section ${styles.aboutSection}`}>
                    <div className="container" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                        <div className={styles.aboutContent}>
                            <h2>Pioneering Smart Governance</h2>
                            <p>
                                E-Barangay is a state-of-the-art civic platform built to bring Barangay Gordon Heights 
                                into the digital age. By integrating cloud services, cryptographic QR verification, 
                                and AI-powered citizen inquiry systems, we are eliminating manual bureaucracy and 
                                administrative delays.
                            </p>
                            <p>
                                Our mission is transparent, secure, and instant service delivery, fostering a faster, 
                                greener, and more resilient local government for our entire community.
                            </p>
                            <div className={styles.aboutStats} style={{ justifyContent: 'center' }}>
                                <div>
                                    <strong>100%</strong>
                                    <span>Paperless Workflow</span>
                                </div>
                                <div>
                                    <strong>Instant</strong>
                                    <span>QR Code Verification</span>
                                </div>
                                <div>
                                    <strong>24/7</strong>
                                    <span>Digital Self-Service</span>
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
                                <h3>E-Barangay Gordon Heights</h3>
                                <p>Barangay Gordon Heights is committed to delivering modern, efficient, and secure digital services to promote community development and resident welfare.</p>
                            </div>

                            <div className={styles.footerSection}>
                                <h3>Quick Links</h3>
                                <ul>
                                    <li><a href="#services">Services</a></li>
                                    <li><a href="#about">About</a></li>
                                    <li><Link href="/resident">Resident Portal</Link></li>
                                    <li><Link href="/admin">Admin Login</Link></li>
                                </ul>
                            </div>

                            <div className={styles.footerSection}>
                                <h3>Contact</h3>
                                <p>Barangay Hall, Gordon Heights</p>
                                <p>(123) 456-7890</p>
                                <p>info@ebarangay-gh.gov.ph</p>
                            </div>
                        </div>

                        <div className={styles.footerBottom}>
                            <p>&copy; 2026 E-Barangay Gordon Heights. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </main>
        </>
    )
}
