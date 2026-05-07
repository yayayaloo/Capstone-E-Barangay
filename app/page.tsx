import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import styles from './page.module.css'

export const revalidate = 3600; // Cache the page and revalidate every hour

export default async function Home() {
    let stats = { residents: '...', requests: '...' }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data, error } = await supabase.rpc('get_public_stats')
        if (!error) {
            stats = {
                residents: data?.residents?.toLocaleString() || '0',
                requests: data?.requests?.toLocaleString() || '0'
            }
        }
    } catch (e) {
        console.error(e)
    }

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
                        <a href="#about">About</a>
                        <Link href="/login" className="btn btn-outline">Login</Link>
                        <Link href="/register" className="btn btn-outline">Sign Up</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className="container" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={styles.heroContent} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className={`${styles.badge} badge badge-info`} style={{ margin: '0 auto 1.5rem' }}>
                            Now Live - 24/7 Digital Services
                        </div>
                        <h1 className="animate-fadeIn">
                            E-Barangay<br />Gordon Heights
                        </h1>
                        <p className={styles.heroSubtitle} style={{ textAlign: 'center' }}>
                            The most advanced community portal with AI assistance and secure QR document verification.
                            Processing {stats.requests} requests for our {stats.residents} residents.
                        </p>
                        <div className={styles.heroCTA} style={{ justifyContent: 'center' }}>
                            <Link href="/register" className="btn btn-primary">
                                Register Now
                            </Link>
                            <Link href="/login" className="btn btn-outline">
                                Login
                            </Link>
                        </div>

                        {/* Real Stats */}
                        <div className={styles.stats} style={{ justifyContent: 'center' }}>
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
                </div>

                {/* Animated Background Elements */}
                <div className={styles.bgGradient1}></div>
                <div className={styles.bgGradient2}></div>
            </section>



            {/* Services Section */}
            <section id="services" className="section">
                <div className="container">
                    <div className={styles.sectionHeader}>
                        <h2>Available Services</h2>
                        <p>Request documents and access services digitally</p>
                    </div>

                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', maxWidth: '900px', margin: '0 auto' }}>
                        <div className={`glass-card ${styles.serviceCard}`}>
                            <div>
                                <h3>Barangay Clearance</h3>
                                <p>Apply for barangay clearance online. Get QR-verified certificates.</p>
                                <ul className={styles.serviceFeatures}>
                                    <li>Online application</li>
                                    <li>Real-time tracking</li>
                                    <li>QR verification</li>
                                    <li>Digital download</li>
                                </ul>
                            </div>
                        </div>

                        <div className={`glass-card ${styles.serviceCard}`}>
                            <div>
                                <h3>Business Permits</h3>
                                <p>Process business permit applications and renewals digitally.</p>
                                <ul className={styles.serviceFeatures}>
                                    <li>Digital forms</li>
                                    <li>Document upload</li>
                                    <li>Status updates</li>
                                    <li>Payment tracking</li>
                                </ul>
                            </div>
                        </div>

                        <div className={`glass-card ${styles.serviceCard}`}>
                            <div>
                                <h3>Barangay ID</h3>
                                <p>Request your Barangay ID with photo upload and verification.</p>
                                <ul className={styles.serviceFeatures}>
                                    <li>Photo upload</li>
                                    <li>Digital signature</li>
                                    <li>Quick approval</li>
                                    <li>Claim scheduling</li>
                                </ul>
                            </div>
                        </div>

                        <div className={`glass-card ${styles.serviceCard}`}>
                            <div>
                                <h3>Announcements & News</h3>
                                <p>Stay updated with barangay events, bulletins, and emergency alerts.</p>
                                <ul className={styles.serviceFeatures}>
                                    <li>Push notifications</li>
                                    <li>Event calendar</li>
                                    <li>Emergency alerts</li>
                                    <li>Community updates</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className={`section ${styles.aboutSection}`}>
                <div className="container" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
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
                        <div className={styles.aboutStats} style={{ justifyContent: 'center' }}>
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
                                <li><a href="#about">About</a></li>
                                <li><Link href="/resident">Resident Portal</Link></li>
                                <li><Link href="/admin">Admin Login</Link></li>
                            </ul>
                        </div>

                        <div className={styles.footerSection}>
                            <h4>Contact</h4>
                            <p> Barangay Hall, Gordon Heights</p>
                            <p> (123) 456-7890</p>
                            <p> info@ebarangay-gh.gov.ph</p>
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
