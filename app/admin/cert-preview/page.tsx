'use client'

import React, { useRef } from 'react'
import CertificateTemplate from '@/components/CertificateTemplate'

export default function CertPreview() {
    const certRef = useRef<HTMLDivElement>(null)

    // Dummy data for preview
    const dummyData = {
        residentName: "JUAN DELA CRUZ",
        documentType: "Barangay Indigency",
        purpose: "EDUCATIONAL ASSISTANCE PURPOSES",
        dateIssued: "2026-04-27",
        formData: {
            age: 29,
            civilStatus: "single",
            birthdate: "1996-11-21",
            address: "Block 2 Gomez Street. Gordon Heights, Olongapo City"
        }
    }

    return (
        <div style={{ padding: '20px', background: '#e0e0e0', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
            {/* Wrapper to show the exact A4 size */}
            <div style={{ width: '794px', height: '1123px', position: 'relative', background: '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                {/* Override the 'fixed' positioning just for this preview */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
                    <CertificateTemplate ref={certRef} data={dummyData} />
                </div>
            </div>
        </div>
    )
}
