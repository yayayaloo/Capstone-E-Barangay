'use client'

import React, { forwardRef } from 'react'
import Image from 'next/image'

export interface CertificateData {
    residentName: string
    documentType: string
    purpose: string
    dateIssued: string
    expirationDate?: string
}

interface Props {
    data: CertificateData | null
}

const CertificateTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    if (!data) return null;

    const renderBody = () => {
        const type = data.documentType.toLowerCase()
        const upperName = data.residentName.toUpperCase()

        if (type.includes('job seeker')) {
            return (
                <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '22px', textTransform: 'uppercase', marginBottom: '40px', letterSpacing: '1px', color: '#111827' }}>
                        FIRST TIME JOB SEEKER CERTIFICATE <br/> <span style={{fontSize: '16px'}}>(R.A. 11261)</span>
                    </h1>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                    <p style={{ textIndent: '40px' }}>
                        This is to certify that <strong>{upperName}</strong>, of legal age, is a bonafide resident of Barangay Gordon Heights, Olongapo City.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This certification is issued pursuant to <strong>Republic Act No. 11261</strong>, otherwise known as the "First Time Jobseekers Assistance Act", to attest that the above-named individual is a first-time job seeker and is qualified to avail of the benefits and privileges granted under the said law.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        I further certify that the applicant has been informed of his/her rights and responsibilities and has executed the Oath of Undertaking before me this day.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '30px' }}>
                        Issued this <strong>{data.dateIssued}</strong> at the Office of the Punong Barangay, Gordon Heights, Olongapo City.
                    </p>
                </div>
            )
        }

        if (type.includes('indigency')) {
            return (
                <div style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '28px', textTransform: 'uppercase', marginBottom: '40px', letterSpacing: '2px', color: '#111827' }}>
                        CERTIFICATE OF INDIGENCY
                    </h1>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                    <p style={{ textIndent: '40px' }}>
                        This is to certify that <strong>{upperName}</strong>, of legal age, is a bonafide resident of Barangay Gordon Heights, Olongapo City.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        Based on the records and evaluation of this office, it is hereby certified that the above-named individual belongs to an indigent family and/or marginalized sector within our barangay jurisdiction.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This <strong>Certificate of Indigency</strong> is being issued upon the request of the aforementioned person to be used for <strong>{data.purpose || 'medical assistance, scholarship, or financial aid'}</strong>.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '30px' }}>
                        Issued this <strong>{data.dateIssued}</strong> at the Office of the Punong Barangay, Gordon Heights, Olongapo City.
                    </p>
                </div>
            )
        }

        if (type.includes('clearance') && !type.includes('business')) {
            return (
                <div style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '30px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '28px', textTransform: 'uppercase', marginBottom: '40px', letterSpacing: '2px', color: '#111827' }}>
                        BARANGAY CLEARANCE
                    </h1>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                    <p style={{ textIndent: '40px' }}>
                        This is to certify that <strong>{upperName}</strong>, of legal age, is a bonafide resident of Barangay Gordon Heights, Olongapo City.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        Based on the records of this office, the above-named individual is known to be of good moral character, a law-abiding citizen, and has <strong>NO PENDING DEROGATORY RECORD</strong> or criminal case filed against them at the barangay level as of this date.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This <strong>Barangay Clearance</strong> is being issued upon the request of the aforementioned person for <strong>{data.purpose || 'employment or legal purposes'}</strong>.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '30px', marginBottom: '30px' }}>
                        Issued this <strong>{data.dateIssued}</strong> at the Office of the Punong Barangay, Gordon Heights, Olongapo City.
                    </p>

                    <div style={{ display: 'flex', gap: '40px', marginTop: '20px', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
                        <div style={{ width: '120px', height: '120px', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#aaa', fontSize: '12px', textAlign: 'center' }}>Right<br/>Thumbmark</span>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, maxWidth: '250px' }}>
                            <div style={{ borderBottom: '1px solid #000', height: '40px', width: '100%' }}></div>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontWeight: 'bold' }}>{upperName}</p>
                            <p style={{ margin: '0', fontSize: '12px' }}>Signature of Applicant</p>
                        </div>
                    </div>
                </div>
            )
        }

        if (type.includes('lot') || type.includes('building')) {
            return (
                <div style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '28px', textTransform: 'uppercase', marginBottom: '40px', letterSpacing: '2px', color: '#111827' }}>
                        LOT / BUILDING CERTIFICATION
                    </h1>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                    <p style={{ textIndent: '40px' }}>
                        This is to certify that <strong>{upperName}</strong> is a bonafide resident of Barangay Gordon Heights, Olongapo City, and is the recognized occupant/claimant of a lot/structure located within the jurisdiction of this barangay.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This further certifies that, as per records of the Barangay Lupon, there are currently <strong>no boundary disputes, conflicts, or pending cases</strong> filed against the said property at the barangay level.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This <strong>Lot/Building Certification</strong> is issued upon the request of the aforementioned person in connection with <strong>{data.purpose || 'building permit application or electrical/water connection'}</strong>.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '30px' }}>
                        Issued this <strong>{data.dateIssued}</strong> at the Office of the Punong Barangay, Gordon Heights, Olongapo City.
                    </p>
                </div>
            )
        }

        if (type.includes('business')) {
            return (
                <div style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '28px', textTransform: 'uppercase', marginBottom: '40px', letterSpacing: '2px', color: '#111827' }}>
                        BARANGAY BUSINESS CLEARANCE
                    </h1>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                    <p style={{ textIndent: '40px' }}>
                        This clearance is hereby granted to <strong>{upperName}</strong> to establish, operate, and maintain a business/enterprise within the territorial jurisdiction of Barangay Gordon Heights, Olongapo City.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This certifies that the business operation does not violate any existing barangay ordinances and that the operator has complied with the preliminary requirements set forth by the barangay.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This <strong>Barangay Business Clearance</strong> is issued for the purpose of securing a Mayor's Permit or Business License, subject to the provisions of the City Revenue Code and other applicable laws.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '30px' }}>
                        Issued this <strong>{data.dateIssued}</strong> at the Office of the Punong Barangay, Gordon Heights, Olongapo City.
                    </p>
                </div>
            )
        }

        // Default Certification
        return (
            <div style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                <h1 style={{ textAlign: 'center', fontSize: '28px', textTransform: 'uppercase', marginBottom: '40px', letterSpacing: '2px', color: '#111827' }}>
                    BARANGAY CERTIFICATION
                </h1>
                <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                <p style={{ textIndent: '40px' }}>
                    This is to certify that <strong>{upperName}</strong>, of legal age, is a bonafide resident of Barangay Gordon Heights, Olongapo City.
                </p>
                <p style={{ textIndent: '40px' }}>
                    Based on the records of this office, the above-named individual is known to be of good moral character, a law-abiding citizen, and has no pending derogatory record/s filed against them as of this date.
                </p>
                <p style={{ textIndent: '40px' }}>
                    This <strong>{data.documentType}</strong> is being issued upon the request of the aforementioned person for the purpose of <strong>{data.purpose || 'general requirements'}</strong>.
                </p>
                <p style={{ textIndent: '40px', marginTop: '30px' }}>
                    Issued this <strong>{data.dateIssued}</strong> at the Office of the Punong Barangay, Gordon Heights, Olongapo City, Philippines.
                </p>
            </div>
        )
    }

    return (
        <div
            ref={ref}
            id="certificate-template"
            style={{
                width: '794px', // A4 width at 96 DPI
                height: '1123px', // A4 height at 96 DPI
                padding: '60px 80px',
                background: '#ffffff',
                color: '#000000',
                fontFamily: '"Times New Roman", Times, serif',
                position: 'fixed', // Keep it out of view but rendered
                top: '-9999px',
                left: '-9999px',
                zIndex: -100,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Background transparent logo watermark */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.1,
                zIndex: 0,
            }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Watermark" style={{ width: '400px', height: '400px', objectFit: 'contain' }} crossOrigin="anonymous" />
            </div>

            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ width: '120px', height: '120px', position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Barangay Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    </div>

                    <div style={{ textAlign: 'center', flex: 1, paddingTop: '10px' }}>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>REPUBLIC OF THE PHILIPPINES</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>City of Olongapo</p>
                        <h2 style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>BARANGAY GORDON HEIGHTS</h2>
                        <p style={{ margin: '5px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>Block 12 Long Road, Gordon Heights, Olongapo City</p>
                        <p style={{ margin: '0', fontSize: '11px', fontWeight: 'bold' }}>Telephone No. 223-5497</p>
                        <p style={{ margin: '0', fontSize: '11px', fontWeight: 'bold' }}>E-mail: barangaygordonheights2018@gmail.com</p>
                    </div>

                    <div style={{ width: '120px', height: '120px', position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/olongapo-logo.png" alt="Olongapo City Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '4px solid #000', marginBottom: '10px' }} />

                <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif', textTransform: 'uppercase', margin: '0', letterSpacing: '1px' }}>
                    OFFICE OF THE PUNONG BARANGAY
                </h2>

                <hr style={{ border: 'none', borderTop: '2px solid #000', marginTop: '10px', marginBottom: '40px' }} />

                {renderBody()}

                {/* Footer & Signature Block */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    {/* Notes on the left */}
                    <div style={{ fontSize: '12px', color: '#333' }}>
                        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold' }}>Issued on: {data.dateIssued}</p>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#dc2626' }}>
                            Valid until: {data.expirationDate || 'N/A'}
                        </p>
                        <p style={{ margin: 0 }}>Not valid without the official dry seal.</p>
                    </div>

                    {/* Signature on the right */}
                    <div style={{ textAlign: 'center', width: '300px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Hon. PRISCILLA B. PONGE</h3>
                        <p style={{ margin: 0, fontSize: '16px' }}>Punong Barangay</p>
                    </div>
                </div>

            </div>
        </div>
    )
})

CertificateTemplate.displayName = 'CertificateTemplate'

export default CertificateTemplate
