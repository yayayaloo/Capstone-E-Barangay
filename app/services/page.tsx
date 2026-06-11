'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import jsPDF from 'jspdf'
import { FileCheck, FileBadge, Store, Home, Briefcase, HeartHandshake } from 'lucide-react'
import styles from './services.module.css'

const DOCUMENTS = [
    {
        slug: 'barangay-clearance',
        name: 'Barangay Clearance',
        icon: <FileCheck size={24} />,
        desc: 'Verification of residency, good moral character, and no derogatory record within the barangay.',
        fee: 'Php 50.00',
        feeType: 'paid' as const,
        reqs: 'Valid ID',
        validity: '6 months',
    },
    {
        slug: 'certificate-of-residency',
        name: 'Certificate of Residency',
        icon: <FileBadge size={24} />,
        desc: 'Official certification for Residency, Loan applications, or Good Moral Character purposes.',
        fee: 'Php 50.00',
        feeType: 'paid' as const,
        reqs: 'Valid ID',
        validity: '6 months',
    },
    {
        slug: 'business-clearance',
        name: 'Business Clearance',
        icon: <Store size={24} />,
        desc: 'Compliance document required for business permit applications within Gordon Heights.',
        fee: 'Free',
        feeType: 'free' as const,
        reqs: 'DTI Certificate',
        validity: 'Renewed annually',
    },
    {
        slug: 'lot-certification',
        name: 'Lot / Building Certification',
        icon: <Home size={24} />,
        desc: 'Issued to actual lot occupants for compliance to government agencies.',
        fee: 'Php 1.00/sqm',
        feeType: 'paid' as const,
        reqs: 'Purok Cert, Tax Dec, Latest Tax Payment',
        validity: '6 months',
    },
    {
        slug: 'first-time-job-seeker',
        name: 'First Time Job Seeker',
        icon: <Briefcase size={24} />,
        desc: 'Waives fees for pre-employment requirements. Available for ages 18–30.',
        fee: 'Free',
        feeType: 'free' as const,
        reqs: 'Valid ID',
        validity: '1 year',
    },
    {
        slug: 'indigency',
        name: 'Certificate of Indigency',
        icon: <HeartHandshake size={24} />,
        desc: 'Certification of financial status for medical, educational, or social assistance.',
        fee: 'Free',
        feeType: 'free' as const,
        reqs: 'Valid ID',
        validity: '6 months',
    },
]

export default function ServicesPage() {
    const [zoomedDoc, setZoomedDoc] = useState<typeof DOCUMENTS[0] | null>(null)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    return (
        <div className={styles.pageWrapper}>
            {/* Hero Banner */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <Link href="/" className={styles.backHomeBtn}>
                        Back to Home
                    </Link>
                    <div className={styles.heroLogo}>
                        <Image src="/logo.png" alt="Barangay Gordon Heights" width={44} height={44} className={styles.heroLogoImg} />
                        <span className={styles.heroLogoText}>E-Barangay Gordon Heights</span>
                    </div>
                    <h1 className={styles.heroTitle}>Barangay Document Services</h1>
                    <p className={styles.heroSubtitle}>
                        Request official barangay documents online. Scan a QR code or tap "Apply Now" to get started — fast, easy, and paperless.
                    </p>
                    <div className={styles.heroBadge}>
                        <span className={styles.heroPulse}></span>
                        Available 24/7 Online
                    </div>
                </div>
            </section>

            {/* Document Cards */}
            <div className={styles.mainContent}>
                <h2 className={styles.sectionTitle}>Available Documents</h2>
                <p className={styles.sectionSubtitle}>Each document has its own QR code. Scan it or tap the card to apply.</p>

                <div className={styles.docGrid}>
                    {DOCUMENTS.map((doc) => {
                        const url = `${origin}/request/${doc.slug}`
                        return (
                            <div className={styles.docCard} key={doc.slug}>
                                <div className={styles.docCardHeader}>
                                    <div className={styles.docCardInfo}>
                                        <span className={styles.docIcon}>{doc.icon}</span>
                                        <h3 className={styles.docName}>{doc.name}</h3>
                                        <p className={styles.docDesc}>{doc.desc}</p>
                                    </div>
                                    <div
                                        className={styles.docQRBox}
                                        onClick={() => setZoomedDoc(doc)}
                                        title="Tap to enlarge QR"
                                    >
                                        <QRCodeSVG
                                            value={url || `https://ebarangay.app/request/${doc.slug}`}
                                            size={80}
                                            level="M"
                                            data-qr-slug={doc.slug}
                                        />
                                        <span className={styles.qrScanHint}>Scan Me</span>
                                    </div>
                                </div>
                                <div className={styles.docCardBody}>
                                    <div className={styles.docMeta}>
                                        <span className={`${styles.feeBadge} ${doc.feeType === 'free' ? styles.feeFree : styles.feePaid}`}>
                                            {doc.fee}
                                        </span>
                                        <span className={styles.reqPill} title="Requirements">{doc.reqs}</span>
                                        <span className={styles.reqPill} title="Validity Period" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>Valid: {doc.validity}</span>
                                    </div>
                                    <Link href={`/request/${doc.slug}`} className={styles.applyBtn}>
                                        Apply Now
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer */}
            <footer className={styles.footer}>
                <p className={styles.footerText}>© 2026 E-Barangay Gordon Heights. All rights reserved.</p>
                <div className={styles.footerLinks}>
                    <Link href="/login">Login</Link>
                    <Link href="/register">Sign Up</Link>
                    <Link href="/">Home</Link>
                </div>
            </footer>

            {/* QR Zoom Modal */}
            {zoomedDoc && (
                <div className={styles.qrModal} onClick={() => setZoomedDoc(null)}>
                    <div className={styles.qrModalCard} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.qrModalTitle}>{zoomedDoc.name}</h3>
                        <p className={styles.qrModalSubtitle}>Scan this QR code to apply for this document</p>
                        <div className={styles.qrModalImage}>
                            <QRCodeSVG
                                value={`${origin}/request/${zoomedDoc.slug}`}
                                size={200}
                                level="H"
                            />
                        </div>
                        <div className={styles.qrModalUrl}>
                            {origin}/request/{zoomedDoc.slug}
                        </div>
                        <button className={styles.qrModalClose} onClick={() => setZoomedDoc(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
