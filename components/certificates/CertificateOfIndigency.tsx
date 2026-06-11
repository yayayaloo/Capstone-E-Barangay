import React from 'react'
import { CertificateData } from '../CertificateTemplate'
import { bodyStyle, titleStyle, parseDate, CertTitle } from './Shared'

interface Props {
    data: CertificateData
}

export default function CertificateOfIndigency({ data }: Props) {
    const { dayStr, suffix, month, year } = parseDate(data.dateIssued)
    const upperName = data.residentName.toUpperCase()

    const fd = data.formData || {}
    const address = fd.address || '________________________________'
    const civilStatus = fd.civilStatus || '____________'
    const age = fd.age || '____'
    const rawBirthDate = fd.birthdate || fd.birthDate || ''
    let birthDate = '__________________'
    if (rawBirthDate && rawBirthDate !== 'NO_DATA') {
        const parsed = parseDate(rawBirthDate)
        if (parsed.month && parsed.dayStr && parsed.year) {
            birthDate = `${parsed.month} ${parsed.dayStr}, ${parsed.year}`
        } else {
            birthDate = parsed.full || '__________________'
        }
    }

    const residentSince = fd.residentSince ? fd.residentSince.toUpperCase() : 'BIRTH'

    return (
        <div style={{ ...bodyStyle, lineHeight: '1.6', fontFamily: 'Calibri, sans-serif' }}>
            {/* Document Title */}
            <CertTitle>CERTIFICATE OF INDIGENCY</CertTitle>

            {/* Salutation */}
            <p style={{ marginBottom: '16px', fontWeight: 'bold', color: '#000' }}>
                TO WHOM IT MAY CONCERN:
            </p>

            {/* Paragraph 1: Main Details */}
            <p style={{ textIndent: '40px', marginBottom: '16px', textAlign: 'justify' }}>
                <strong>THIS IS TO CERTIFY</strong> that <strong>{upperName}</strong>, {age} years old, {civilStatus}, born on {birthDate}, is a bona fide resident of this barangay with postal address at <strong>{address}</strong>, belongs to an <strong>indigent family</strong>.
            </p>

            {/* Paragraph 2: Clearance Records */}
            <p style={{ marginBottom: '16px', textAlign: 'justify' }}>
                As verified in our existing records and from other reliable sources, subject person has never been accused, investigated nor detained for any crime inimical to moral turpitude and other related criminal acts.
            </p>

            {/* Paragraph 3: Purpose */}
            <p style={{ marginBottom: '16px', textAlign: 'justify' }}>
                This certification is issued upon the request of <strong>{upperName}</strong> for <strong>{(data.purpose || 'RECORD PURPOSES').toUpperCase()}</strong> and for whatever <strong><span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>LEGAL INTENT</span></strong> it may serve.
            </p>

            {/* Paragraph 4: Date Issued Line */}
            <p style={{ marginBottom: '32px', fontFamily: 'Calibri, sans-serif', fontStyle: 'normal', lineHeight: '1.15', textAlign: 'justify' }}>
                Issued this <strong>{dayStr}<sup style={{ fontSize: '9px' }}>{suffix}</sup></strong> day of <strong>{month} {year}</strong> at <strong>Barangay Gordon Heights, Olongapo City, Philippines.</strong>
            </p>

            {/* Authority & Punong Barangay Signature Block */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <div style={{ textAlign: 'center', width: '320px' }}>
                    <p style={{ margin: '0 0 4px 0', lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>By the authority of the Punong Barangay:</p>
                    <p style={{ margin: 0, lineHeight: '1.0', fontSize: '12pt', fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
                </div>
            </div>

            {/* Barangay Secretary Signature Block */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '90px' }}>
                <div style={{ textAlign: 'center', width: '320px' }}>
                    <p style={{ margin: '0 0 4px 0', lineHeight: '1.0', fontSize: '12pt', fontWeight: 'bold', color: '#000' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                    <p style={{ margin: 0, lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>Barangay Secretary</p>
                </div>
            </div>

            {/* Applicant Signature Block */}
            <div style={{ marginTop: '192px', width: '240px', textAlign: 'center', marginLeft: '20px' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '12pt', lineHeight: '1.0' }}>
                    <span style={{ borderBottom: '1px solid #000' }}>
                        {upperName}
                    </span>
                </p>
                <p style={{ margin: 0, lineHeight: '1.0', fontSize: '11pt', fontStyle: 'normal', color: '#000' }}>(Signature)</p>
            </div>

            {/* Footer Notes */}
            <div style={{ paddingTop: '24px' }}>
                <p style={{ margin: 0, lineHeight: '1.0', fontSize: '11pt', fontStyle: 'normal', fontFamily: 'Calibri, sans-serif', color: '#000' }}>
                    Note:&nbsp;&nbsp;&nbsp;This clearance is valid only for three months upon issue.
                </p>
                <p style={{ margin: 0, lineHeight: '1.0', fontSize: '11pt', fontWeight: 'bold', fontFamily: 'Calibri, sans-serif' }}>
                    <span style={{ borderBottom: '1px solid #000' }}>
                        NOT VALID WITHOUT THE BARANGAY SEAL.
                    </span>
                </p>
            </div>
        </div>
    )
}