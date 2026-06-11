'use client'

import React, { forwardRef } from 'react'
import { CertHeader, CertFooter } from './certificates/Shared'

import BarangayClearance from './certificates/BarangayClearance'
import CertificateOfIndigency from './certificates/CertificateOfIndigency'
import CertificateOfResidency from './certificates/CertificateOfResidency'
import FirstTimeJobSeeker from './certificates/FirstTimeJobSeeker'
import LotCertification from './certificates/LotCertification'
import BusinessEndorsement from './certificates/BusinessEndorsement'

export interface CertificateData {
    residentName: string
    documentType: string
    purpose: string
    dateIssued: string
    expirationDate?: string
    formData?: Record<string, any>
}

interface Props {
    data: CertificateData | null
}

const CertificateTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    if (!data) return null

    const type = data.documentType.toLowerCase()

    const renderBody = () => {
        if (type.includes('indigency')) return <CertificateOfIndigency data={data} />
        if (type.includes('job seeker') || type.includes('first time')) return <FirstTimeJobSeeker data={data} />
        if (type.includes('residency') || (type.includes('certification') && !type.includes('lot'))) return <CertificateOfResidency data={data} />
        if (type.includes('lot') || type.includes('occupancy') || type.includes('building')) return <LotCertification data={data} />
        if (type.includes('business') || type.includes('endorsement')) return <BusinessEndorsement data={data} />
        // Default
        return <BarangayClearance data={data} />
    }

    return (
        <div
            ref={ref}
            id="certificate-template"
            style={{
                width: '816px', // 8.5 inches * 96 DPI
                height: '1248px', // 13 inches * 96 DPI
                padding: '96px', // 1 inch Normal margins
                background: '#ffffff',
                color: '#000000',
                fontFamily: '"Times New Roman", Times, serif',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <CertHeader />
                {renderBody()}
                <CertFooter />
            </div>
        </div>
    )
})

CertificateTemplate.displayName = 'CertificateTemplate'
export default CertificateTemplate
