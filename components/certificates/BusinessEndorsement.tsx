import React from 'react'
import { CertificateData } from '../CertificateTemplate'
import { bodyStyle, parseDate } from './Shared'

interface Props {
    data: CertificateData
}

export default function BusinessEndorsement({ data }: Props) {
    // Destructure date variables safely
    const { dayStr, suffix, month, year } = parseDate(data.dateIssued) || { dayStr: '5', suffix: 'th', month: 'May', year: '2026' }
    const upperName = data.residentName ? data.residentName.toUpperCase() : 'JUAN DELA CRUZ'

    const fd = data.formData || {}

    // Dynamic fallbacks matching your reference screenshot data
    const businessName = fd.businessName?.toUpperCase() || 'CHIPAI TAIWANESE CHICKEN'
    const businessLocation = fd.businessLocation?.toUpperCase() || 'BLOCK 2 GOMEZ STREET, GORDON HEIGHTS, OLONGAPO CITY'
    const operatorName = fd.operatorName?.toUpperCase() || upperName
    const operatorAddress = fd.operatorAddress?.toUpperCase() || fd.address?.toUpperCase() || 'BLOCK 2 GOMEZ STREET, GORDON HEIGHTS, OLONGAPO CITY'

    // Checkbox conditions (defaulting to match the image template)
    const isRenewal = fd.isRenewal !== undefined ? fd.isRenewal : true
    const isCompliant = fd.isCompliant !== undefined ? fd.isCompliant : true
    const noObjection = fd.noObjection !== undefined ? fd.noObjection : true
    const sequenceNumber = fd.sequenceNumber || '666'

    // Individual checkbox controls (with fallback to old properties)
    const checkNewBusiness = fd.checkNewBusiness !== undefined ? fd.checkNewBusiness : !isRenewal
    const checkRenewal = fd.checkRenewal !== undefined ? fd.checkRenewal : isRenewal
    const checkCompliant = fd.checkCompliant !== undefined ? fd.checkCompliant : isCompliant
    const checkNonCompliant = fd.checkNonCompliant !== undefined ? fd.checkNonCompliant : !isCompliant
    const checkNoObjection = fd.checkNoObjection !== undefined ? fd.checkNoObjection : noObjection
    const checkNonIssuance = fd.checkNonIssuance !== undefined ? fd.checkNonIssuance : !noObjection

    return (
        <div style={{
            ...bodyStyle,
            fontFamily: 'Arial, sans-serif',
            fontSize: '11pt',
            color: '#000',
            lineHeight: '1.0',
            textAlign: 'justify',
            padding: '20px'
        }}>

            {/* Top Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px' }}>
                {/* Left: New Business / Renewal Grid Table */}
                <table style={{ borderCollapse: 'collapse', fontWeight: 'bold' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', width: '35px', height: '20px', textAlign: 'center' }}>
                                {checkNewBusiness ? '/' : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '2px 8px', minWidth: '110px', verticalAlign: 'middle' }}>
                                New Business
                            </td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', width: '35px', height: '20px', textAlign: 'center' }}>
                                {checkRenewal ? '/' : ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '2px 8px', verticalAlign: 'middle' }}>
                                Renewal
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Right: Reference Identifier Box */}
                <div style={{ border: '1px solid #000', padding: '5px 12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    GDH-BPI-{year || '2026'}-{sequenceNumber}
                </div>
            </div>

            {/* Title block */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: '0 0 25px 0', fontSize: '16pt', fontWeight: 'bold', letterSpacing: '1px' }}>ENDORSEMENT</h2>
                <p style={{ margin: 0, fontWeight: 'bold', letterSpacing: '0.5px' }}>THIS IS TO ENDORSE</p>
            </div>

            {/* Profile / Entity Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationThickness: '2px' }}>
                        {businessName}
                    </p>
                    <p style={{ margin: '2px 0 0 0' }}>(Business Name or Trade Activity)</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationThickness: '2px' }}>
                        {businessLocation}
                    </p>
                    <p style={{ margin: '2px 0 0 0' }}>(Location)</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationThickness: '2px' }}>
                        {operatorName}
                    </p>
                    <p style={{ margin: '2px 0 0 0' }}>(Operator/Manager)</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationThickness: '2px' }}>
                        {operatorAddress}
                    </p>
                    <p style={{ margin: '2px 0 0 0' }}>(Address)</p>
                </div>
            </div>

            {/* Application Section */}
            <p style={{ margin: '0 0 15px 0' }}>
                Applying for the corresponding <strong>BUSINESS PERMIT</strong> that has been found to be:
            </p>

            {/* Compliance Selection Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ border: '1px solid #000', width: '45px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold', fontSize: '14pt', lineHeight: '1', paddingBottom: '2px', flexShrink: 0 }}>
                        {checkCompliant ? '/' : ''}
                    </div>
                    <p style={{ margin: 0 }}>
                        <strong>COMPLIANT</strong> with the provisions of existing Barangay Ordinances, rules and regulations being enforced in this barangay;
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ border: '1px solid #000', width: '45px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold', fontSize: '14pt', lineHeight: '1', paddingBottom: '2px', flexShrink: 0 }}>
                        {checkNonCompliant ? '/' : ''}
                    </div>
                    <p style={{ margin: 0 }}>
                        <strong>NON-COMPLIANT</strong> with the provisions of existing Barangay Ordinances, rules and regulations being enforced in this barangay.
                    </p>
                </div>
            </div>

            {/* Decision Clause Paragraph */}
            <p style={{ textIndent: '40px', margin: '0 0 15px 0' }}>
                In view of the foregoing, this barangay, thru the undersigned,
            </p>

            {/* Objection Selection Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ border: '1px solid #000', width: '45px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold', fontSize: '14pt', lineHeight: '1', paddingBottom: '2px', flexShrink: 0 }}>
                        {checkNoObjection ? '/' : ''}
                    </div>
                    <p style={{ margin: 0 }}>
                        <strong>Interposes NO OBJECTION</strong> for the issuance of the corresponding Mayor’s Permit being applied for.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ border: '1px solid #000', width: '45px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 'bold', fontSize: '14pt', lineHeight: '1', paddingBottom: '2px', flexShrink: 0 }}>
                        {checkNonIssuance ? '/' : ''}
                    </div>
                    <p style={{ margin: 0 }}>
                        <strong>Recommends for the NON-ISSUANCE</strong> of the corresponding Mayor’s Permit being applied for.
                    </p>
                </div>
            </div>

            {/* Issuance Date Statement */}
            <p style={{ margin: '0 0 35px 0' }}>
                Issued this <strong>{dayStr}<sup>{suffix}</sup> day</strong> of <strong>{month} {year}.</strong>
            </p>

            {/* Clean Right-Aligned Signatures Box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 'auto', width: '55%', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>BY AUTHORITY OF THE PUNONG BARANGAY</p>
                <p style={{ margin: '0 0 45px 0', fontWeight: 'bold', whiteSpace: 'nowrap' }}>HON. PRISCILLA B. PONGE</p>

                <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                <p style={{ margin: 0, whiteSpace: 'nowrap' }}>Barangay Secretary</p>
            </div>
        </div>
    )
}