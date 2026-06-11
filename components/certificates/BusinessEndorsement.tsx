import React from 'react'
import { CertificateData } from '../CertificateTemplate'
import { bodyStyle, titleStyle, parseDate, CertTitle } from './Shared'

interface Props {
    data: CertificateData
}

export default function BusinessEndorsement({ data }: Props) {
    const { dayStr, suffix, month, year } = parseDate(data.dateIssued)
    const upperName = data.residentName.toUpperCase()

    const fd = data.formData || {}
    const address = fd.address || '________________________________'

    return (
        <div style={bodyStyle}>
            <p style={{ margin: '0 0 1px 0', fontSize: '12px' }}><strong>GDH</strong>-BPI-{year}-_____</p>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px' }}><strong>New Business / Renewal</strong></p>

            <CertTitle>ENDORSEMENT</CertTitle>

            <p style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '12px', fontSize: '13px', letterSpacing: '1px' }}>THIS IS TO ENDORSE</p>

            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '14px' }}>
                    {fd.businessName?.toUpperCase() || '__________________________________________'}
                </p>
                <p style={{ margin: '1px 0 0 0', fontSize: '11px', fontStyle: 'italic' }}>(Business Name or Trade Activity)</p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '13px' }}>
                    {fd.businessLocation?.toUpperCase() || '__________________________________________'}
                </p>
                <p style={{ margin: '1px 0 0 0', fontSize: '11px', fontStyle: 'italic' }}>(Location)</p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px' }}>{fd.operatorName?.toUpperCase() || upperName}</p>
                <p style={{ margin: '1px 0 0 0', fontSize: '11px', fontStyle: 'italic' }}>(Operator/Manager)</p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '13px' }}>
                    {fd.operatorAddress?.toUpperCase() || address.toUpperCase()}
                </p>
                <p style={{ margin: '1px 0 0 0', fontSize: '11px', fontStyle: 'italic' }}>(Address)</p>
            </div>

            <p style={{ marginBottom: '6px' }}>Applying for the corresponding <strong>BUSINESS PERMIT</strong> that has been found to be:</p>

            <div style={{ paddingLeft: '16px', margin: '4px 0', lineHeight: '1.7' }}>
                <p style={{ margin: '2px 0' }}>___ <strong>COMPLIANT</strong> with the provisions of existing Barangay Ordinances, rules and regulations being enforced in this barangay;</p>
                <p style={{ margin: '3px 0', textAlign: 'center' }}><strong>/</strong></p>
                <p style={{ margin: '2px 0' }}>___ <strong>NON-COMPLIANT</strong> with the provisions of existing Barangay Ordinances, rules and regulations being enforced in this barangay.</p>
            </div>

            <p style={{ textIndent: '40px', marginTop: '8px' }}>In view of the foregoing, this barangay, thru the undersigned,</p>

            <div style={{ paddingLeft: '16px', margin: '4px 0', lineHeight: '1.7' }}>
                <p style={{ margin: '2px 0' }}>___ <strong>Interposes NO OBJECTION</strong> for the issuance of the corresponding Mayor&apos;s Permit being applied for.</p>
                <p style={{ margin: '3px 0', textAlign: 'center' }}><strong>/</strong></p>
                <p style={{ margin: '2px 0' }}>___ <strong>Recommends for the NON-ISSUANCE</strong> of the corresponding Mayor&apos;s Permit being applied for.</p>
            </div>

            <p style={{ marginTop: '10px' }}>
                Issued this {dayStr}<sup style={{ fontSize: '9px' }}>{suffix}</sup> day of <strong>{month} {year}.</strong>
            </p>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 1px 0', fontWeight: 'bold', fontSize: '12px' }}>BY AUTHORITY OF THE PUNONG BARANGAY</p>
                <div style={{ borderTop: '1px solid #000', width: '220px', margin: '35px auto 3px auto' }} />
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px' }}>HON. PRISCILLA B. PONGE</p>
                <p style={{ margin: '1px 0 0 0', fontSize: '11px' }}>Punong Barangay</p>
                <div style={{ borderTop: '1px solid #000', width: '220px', margin: '25px auto 3px auto' }} />
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                <p style={{ margin: '1px 0 0 0', fontSize: '11px' }}>Barangay Secretary</p>
            </div>
        </div>
    )
}
