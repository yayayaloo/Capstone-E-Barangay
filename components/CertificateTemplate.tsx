'use client'

import React, { forwardRef } from 'react'
import Image from 'next/image'

export interface CertificateData {
    residentName: string
    documentType: string
    purpose: string
    dateIssued: string
}

interface Props {
    data: CertificateData | null
}

const CertificateTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    if (!data) return null;

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

            <div style={{ position: 'relative', zIndex: 1 }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ width: '120px', height: '120px', position: 'relative' }}>
                         {/* We use standard img for perfect html2canvas capture because next/image sometimes lazy loads */}
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

                <hr style={{ border: 'none', borderTop: '2px solid #000', marginTop: '10px', marginBottom: '50px' }} />

                {/* Title */}
                <h1 style={{ textAlign: 'center', fontSize: '28px', textTransform: 'uppercase', marginBottom: '50px', letterSpacing: '2px', color: '#111827' }}>
                    {data.documentType.toUpperCase()}
                </h1>

                {/* Body Content */}
                <div style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '60px' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                    
                    <p style={{ textIndent: '40px' }}>
                        This is to certify that <strong>{data.residentName.toUpperCase()}</strong>, of legal age, is a bonafide resident of Barangay Gordon Heights, Olongapo City.
                    </p>

                    <p style={{ textIndent: '40px' }}>
                        Based on the records of this office, the above-named individual is known to be of good moral character and has no pending derogatory record/s filed against them as of this date.
                    </p>

                    <p style={{ textIndent: '40px' }}>
                        This {data.documentType} is being issued upon the request of the aforementioned person for the purpose of <strong>{data.purpose || 'General / Stated Requirement'}</strong>.
                    </p>

                    <p style={{ textIndent: '40px', marginTop: '40px' }}>
                        Issued this <strong>{data.dateIssued}</strong> at the Office of the Punong Barangay, Gordon Heights, Olongapo City, Philippines.
                    </p>
                </div>

                {/* Signature Block */}
                <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'center', width: '300px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Hon. PRISCILLA B. PONGE</h3>
                        <p style={{ margin: 0, fontSize: '16px' }}>Punong Barangay</p>
                    </div>
                </div>

                {/* Footer Notes */}
                <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', fontSize: '12px', color: '#666', paddingTop: '10px' }}>
                    <p style={{ margin: 0 }}>Not valid without the official dry seal.</p>
                </div>

            </div>
        </div>
    )
})

CertificateTemplate.displayName = 'CertificateTemplate'

export default CertificateTemplate
