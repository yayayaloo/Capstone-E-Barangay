import React from 'react'
import { CertificateData } from '../CertificateTemplate'
import { bodyStyle, titleStyle, parseDate, CertTitle } from './Shared'

interface Props {
    data: CertificateData
}

export default function FirstTimeJobSeeker({ data }: Props) {
    const { dayStr, suffix, month, year } = parseDate(data.dateIssued)
    const upperName = data.residentName.toUpperCase()

    const fd = data.formData || {}
    const address = fd.address || '________________________________'
    const gender = (fd.gender || '').toLowerCase()
    
    const isFemale = gender === 'female'
    const isMale = gender === 'male'
    
    const titlePrefix = isMale ? 'MR.' : isFemale ? 'MS.' : 'MR./MS.'
    const pronounPossessive = isMale ? 'his' : isFemale ? 'her' : 'his/her'
    const pronounSubject = isMale ? 'he' : isFemale ? 'she' : 'he/she'

    const rawYears = fd.yearsOfResidency || '______'
    const yearText = rawYears === '1' ? 'year' : rawYears === '______' ? 'year(s)' : 'years'

    return (
        <div style={{ ...bodyStyle, lineHeight: '1.6', fontFamily: 'Calibri, sans-serif' }}>
            {/* Document Title */}
            <CertTitle style={{ marginBottom: '8px' }}>BARANGAY CERTIFICATION</CertTitle>
            <p style={{ textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', marginBottom: '24px', marginTop: 0, color: '#000' }}>
                (First Time Jobseekers Assistance Act-RA 11261)
            </p>

            {/* Paragraph 1 */}
            <p style={{ textIndent: '40px', marginBottom: '16px', textAlign: 'justify' }}>
                <strong>THIS IS TO CERTIFY</strong> that {titlePrefix} <strong><span style={{ borderBottom: '1px solid #000' }}>{upperName}</span></strong>, is a bona fide resident of this barangay with postal address of <strong><span style={{ borderBottom: '1px solid #000' }}>{address}</span></strong> for <strong><span style={{ borderBottom: '1px solid #000' }}>{rawYears}</span></strong> {yearText}, is a qualified availee of <strong>RA 11261</strong> or the <strong>First Time Jobseekers Assistance Act of 2019.</strong>
            </p>

            {/* Paragraph 2 */}
            <p style={{ textIndent: '40px', marginBottom: '16px', textAlign: 'justify' }}>
                I further certify that the applicant was informed of {pronounPossessive} rights, including the duties and responsibilities accorded by RA 11261 through the <strong>Oath of Undertaking</strong> {pronounSubject} has signed and executed in the presence of Barangay Official/s.
            </p>

            {/* Paragraph 3: Date Issued Line */}
            <p style={{ textIndent: '40px', marginBottom: '16px', textAlign: 'justify' }}>
                Signed this <strong>{dayStr}<sup style={{ fontSize: '9px' }}>{suffix.toUpperCase()}</sup></strong> day of <strong>{month.toUpperCase()} {year}</strong> in the City/Municipality of <strong>OLONGAPO CITY</strong>.
            </p>

            {/* Paragraph 4: Validity */}
            <p style={{ textIndent: '40px', marginBottom: '32px', textAlign: 'justify' }}>
                This certification is valid only until <strong>{data.expirationDate?.toUpperCase() || '_________________'}</strong> one (1) year from the issuance
            </p>

            {/* Signatures Area - Right Aligned */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>

                    {/* Official Signature */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <p style={{ margin: '0 0 4px 0', lineHeight: '1.0', fontSize: '12pt', fontWeight: 'bold', color: '#000' }}>
                            <span style={{ borderBottom: '1px solid #000' }}>HON. EVANGELINE D. TINGA</span>
                        </p>
                        <p style={{ margin: '0 0 2px 0', lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>BARANGAY KAGAWAD</p>
                        <p style={{ margin: 0, lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>Signature over Printed name</p>
                    </div>

                    {/* Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '24px' }}>
                        <p style={{ margin: '0 0 4px 0', lineHeight: '1.0', fontSize: '12pt', fontWeight: 'bold', color: '#000' }}>
                            <span style={{ borderBottom: '1px solid #000' }}>{`${month.toUpperCase()} ${dayStr}, ${year}`}</span>
                        </p>
                        <p style={{ margin: 0, lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>Date</p>
                    </div>

                    <p style={{ margin: '32px 0 32px 0', lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>
                        Witnessed by:
                    </p>

                    {/* Witness Signature */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <p style={{ margin: '0 0 4px 0', lineHeight: '1.0', fontSize: '12pt', fontWeight: 'bold', color: '#000' }}>
                            <span style={{ borderBottom: '1px solid #000' }}>SEC. SHAN RACEN GENRHYC B. LABABIT</span>
                        </p>
                        <p style={{ margin: '0 0 2px 0', lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>BARANGAY SECRETARY</p>
                        <p style={{ margin: 0, lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>Signature over Printed Name</p>
                    </div>

                    {/* Witness Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '24px' }}>
                        <p style={{ margin: '0 0 4px 0', lineHeight: '1.0', fontSize: '12pt', fontWeight: 'bold', color: '#000' }}>
                            <span style={{ borderBottom: '1px solid #000' }}>{`${month.toUpperCase()} ${dayStr}, ${year}`}</span>
                        </p>
                        <p style={{ margin: 0, lineHeight: '1.0', fontSize: '11pt', color: '#000' }}>Date</p>
                    </div>

                </div>
            </div>

            {/* Bottom Left Info */}
            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                <p style={{ margin: 0, lineHeight: '1.2', fontSize: '10pt', color: '#000' }}>Type of ID: {fd.idType || '__________________'}</p>
                <p style={{ margin: 0, lineHeight: '1.2', fontSize: '10pt', color: '#000' }}>ID Number: {fd.idNumber || '__________________'}</p>
                <p style={{ margin: '4px 0 0 0', lineHeight: '1.2', fontWeight: 'bold', fontSize: '11pt', color: '#000' }}>THIS FORM NEED NOT BE NOTARIZED</p>
                <p style={{ margin: '2px 0 0 0', lineHeight: '1.2', fontSize: '9pt', color: '#000' }}>RA 11261 Form 1</p>
            </div>
        </div>
    )
}
