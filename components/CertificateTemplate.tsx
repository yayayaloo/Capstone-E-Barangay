'use client'

import React, { forwardRef } from 'react'

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

// ─── Shared Header ────────────────────────────────────────────────────────────
function CertHeader() {
    return (
        <>
            {/* ── Three-column header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>

                {/* LEFT: Bagong Pilipinas + Barangay logos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Bagong-Pilipinas-Logo.png" alt="Bagong Pilipinas" style={{ width: '110px', height: '110px', objectFit: 'contain' }} crossOrigin="anonymous" />
                    
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Barangay Logo" style={{ width: '110px', height: '110px', objectFit: 'contain' }} crossOrigin="anonymous" />
                </div>

                {/* CENTER: text */}
                <div style={{ textAlign: 'center', flex: 1, padding: '0 10px', color: '#000', fontFamily: '"Times New Roman", Times, serif' }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Republic of the Philippines</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>City of Olongapo</p>
                    <h2 style={{ margin: '5px 0', fontSize: '28px', fontWeight: '900', fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '1px', color: '#000', whiteSpace: 'nowrap' }}>
                        BARANGAY GORDON HEIGHTS
                    </h2>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>Block 12 Long Road, Gordon Heights, Olongapo City</p>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>Telephone No. 223-5497</p>
                </div>

                {/* RIGHT: Olongapo City logo */}
                <div style={{ flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/olongapo-logo.png" alt="Olongapo City Logo" style={{ width: '110px', height: '110px', objectFit: 'contain' }} crossOrigin="anonymous" />
                </div>
            </div>

            {/* ── Top thin line ── */}
            <div style={{ borderTop: '1px solid #000', marginBottom: '8px', marginTop: '10px' }} />

            {/* ── OFFICE OF THE PUNONG BARANGAY banner ── */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: '900', fontSize: '24px', letterSpacing: '1.5px', color: '#000' }}>
                    OFFICE OF THE PUNONG BARANGAY
                </p>
            </div>

            {/* ── Bottom thick line ── */}
            <div style={{ borderTop: '3px solid #000', marginBottom: '30px' }} />
        </>
    )
}

// ─── Shared Footer ────────────────────────────────────────────────────────────
function CertFooter() {
    return (
        <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/footer.png" alt="Footer" style={{ width: '100%', objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />
        </div>
    )
}

// ─── Ordinal helper ───────────────────────────────────────────────────────────
function parseDate(iso: string) {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return { dayStr: '', suffix: '', month: '', year: '', full: iso }
    const day = d.getDate()
    const suffix = (day > 3 && day < 21) || day % 10 > 3 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10]
    return {
        dayStr: day.toString(),
        suffix,
        month: d.toLocaleDateString('en-US', { month: 'long' }),
        year: d.getFullYear().toString(),
        full: iso,
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────
const CertificateTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    if (!data) return null

    const { dayStr, suffix, month, year } = parseDate(data.dateIssued)
    const upperName = data.residentName.toUpperCase()
    const type = data.documentType.toLowerCase()

    // ── CERTIFICATE OF INDIGENCY ──────────────────────────────────────────────
    const renderIndigency = () => (
        <div style={{ fontSize: '15px', lineHeight: '1.8', textAlign: 'justify', fontFamily: '"Arial", sans-serif', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '30px', color: '#000', letterSpacing: '1px' }}>
                CERTIFICATE OF INDIGENCY
            </h1>

            <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                <strong>THIS IS TO CERTIFY</strong> that <strong>{upperName},</strong> {data.formData?.age || '_____'} years old, {data.formData?.civilStatus ? data.formData.civilStatus.toLowerCase() : '____________'}, born on {data.formData?.birthdate
                    ? new Date(data.formData.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : '__________________'},
                is a bona fide resident of this barangay with postal address <strong>{data.formData?.address || '__________________________________________'},</strong> belongs to an <strong>indigent family</strong>.
            </p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                As verified in our existing records and from other reliable sources, the subject person has never been accused, investigated, or detained for any crime inimical to moral turpitude or other related criminal acts.
            </p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                This certification is issued upon the request of <strong>{upperName}</strong> for his/her <strong><em>{(data.purpose || 'EDUCATIONAL ASSISTANCE PURPOSES').toUpperCase()}</em></strong> and for whatever <strong><u>LEGAL INTENT</u></strong> it may serve.
            </p>

            <p style={{ textIndent: '40px', marginTop: '10px', marginBottom: '40px' }}>
                Issued this <strong>{dayStr}<sup>{suffix}</sup></strong> day of <strong>{month} {year}</strong> at <strong>Barangay Gordon Heights, Olongapo City, Philippines.</strong>
            </p>

            {/* Signature block */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '20px' }}>
                <p style={{ margin: '0 0 4px 0' }}>By the authority of the Punong Barangay:</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>SEC. SHAN RACEN GENRHYC B. LABABIT</p>
                <p style={{ margin: 0 }}>Barangay Secretary</p>
            </div>

            {/* Note */}
            <div style={{ marginTop: 'auto', marginBottom: '20px', fontSize: '11px' }}>
                <p style={{ margin: 0 }}>Note:&nbsp;&nbsp;&nbsp;This clearance is valid only for six months upon issue.</p>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>NOT VALID WITHOUT THE BARANGAY SEAL</p>
            </div>
        </div>
    )

    // ── BARANGAY CLEARANCE ────────────────────────────────────────────────────
    const renderClearance = () => (
        <div style={{ fontSize: '15px', lineHeight: '1.8', textAlign: 'justify', fontFamily: '"Arial", sans-serif', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '30px', color: '#000', letterSpacing: '1px' }}>
                BARANGAY CLEARANCE
            </h1>

            <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                <strong>THIS IS TO CERTIFY</strong> that <strong>{upperName},</strong> {data.formData?.age || '_____'} years old, {data.formData?.civilStatus ? data.formData.civilStatus.toLowerCase() : '____________'}, born on {data.formData?.birthdate ? new Date(data.formData.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '__________________'},
                is a bona fide resident of this barangay with postal address <strong>{data.formData?.address || '__________________________________________'},</strong> is known to me as a person of good moral character, and a law-abiding citizen of the community.
            </p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                As verified in our existing records and from other reliable sources, the subject person has never been accused, investigated, or detained for any crime inimical to moral turpitude or other related criminal acts.
            </p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                This certification is issued upon the request of <strong>{upperName}</strong> for <strong>{(data.purpose || 'GENERAL PURPOSES').toUpperCase()}</strong> and for whatever <strong><u>LEGAL INTENT</u></strong> it may serve.
            </p>

            <p style={{ textIndent: '40px', marginTop: '10px', marginBottom: '40px' }}>
                Issued this <strong>{dayStr}<sup>{suffix}</sup></strong> day of <strong>{month} {year}</strong> at <strong>Barangay Gordon Heights, Olongapo City, Philippines.</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '20px' }}>
                <p style={{ margin: '0 0 4px 0' }}>By the authority of the Punong Barangay:</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>SEC. SHAN RACEN GENRHYC B. LABABIT</p>
                <p style={{ margin: 0 }}>Barangay Secretary</p>
            </div>

            <div style={{ marginTop: 'auto', marginBottom: '20px', fontSize: '11px' }}>
                <p style={{ margin: 0 }}>Note:&nbsp;&nbsp;&nbsp;This clearance is valid only for six months upon issue.</p>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>NOT VALID WITHOUT THE BARANGAY SEAL</p>
            </div>
        </div>
    )

    // ── CERTIFICATE OF RESIDENCY / CERTIFICATION ──────────────────────────────
    const renderResidency = () => (
        <div style={{ fontSize: '15px', lineHeight: '1.8', textAlign: 'justify', fontFamily: '"Arial", sans-serif', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '30px', color: '#000', letterSpacing: '1px' }}>
                CERTIFICATE OF RESIDENCY
            </h1>

            <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                <strong>THIS IS TO CERTIFY</strong> that <strong>{upperName},</strong> {data.formData?.age || '_____'} years old, {data.formData?.civilStatus ? data.formData.civilStatus.toUpperCase() : '____________'}, born on {data.formData?.birthdate ? new Date(data.formData.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '__________________'},
                is a bona fide resident of this barangay since <strong>{data.formData?.residentSince || 'BIRTH'}</strong> up to present
                with postal address at <strong>{data.formData?.address || '__________________________________________'}</strong> is known to me as a person of good moral character, and a law-abiding citizen of the community.
            </p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                As verified in our existing records and from other reliable source, subject person has never been accused, investigated nor detained for any crime inimical to moral turpitude and other related criminal acts.
            </p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                This certification is issued upon the request of <strong>{upperName}</strong> for <strong>{(data.purpose || 'RECORD PURPOSES').toUpperCase()}</strong> and for whatever <strong><u>LEGAL INTENT</u></strong> it may serve.
            </p>

            <p style={{ textIndent: '40px', marginTop: '10px', marginBottom: '40px' }}>
                Issued this <strong>{dayStr}<sup>{suffix}</sup></strong> day of <strong>{month} {year}</strong> at <strong>Barangay Gordon Heights, Olongapo City, Philippines.</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '20px' }}>
                <p style={{ margin: '0 0 4px 0' }}>By the authority of the Punong Barangay:</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                <p style={{ margin: 0 }}>Barangay Secretary</p>
            </div>

            <div style={{ marginTop: '60px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{upperName}</p>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '13px' }}>(Signature)</p>
            </div>

            <div style={{ marginTop: 'auto', marginBottom: '20px', fontSize: '11px' }}>
                <p style={{ margin: 0 }}>Note:&nbsp;&nbsp;&nbsp;This clearance is valid only for three months upon issue.</p>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>NOT VALID WITHOUT THE BARANGAY SEAL.</p>
            </div>
        </div>
    )

    // ── FIRST TIME JOB SEEKER ─────────────────────────────────────────────────
    const renderJobSeeker = () => (
        <div style={{ fontSize: '15px', lineHeight: '1.8', textAlign: 'justify', fontFamily: '"Arial", sans-serif', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px', color: '#000', letterSpacing: '1px' }}>
                BARANGAY CERTIFICATION
            </h1>
            <h2 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '30px', color: '#000' }}>
                (First Time Jobseekers Assistance Act-RA 11261)
            </h2>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                <strong>THIS IS TO CERTIFY</strong> that MR./MS. <strong>{upperName}</strong>, is a bona fide resident of this barangay with postal address of <strong>{data.formData?.address || '__________________________________________'}</strong> (complete address) for <strong>{data.formData?.yearsOfResidency || '______'}</strong> year(s), is a qualified availee of <strong>RA 11261</strong> or the <strong>First Time Jobseekers Assistance Act of 2019.</strong>
            </p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                I further certify that the holder/bearer was informed of his/her rights, including the duties and responsibilities accorded by RA 11261 through the <strong>Oath of Undertaking</strong> he/she has signed and executed in the presence of Barangay Official/s.
            </p>

            <p style={{ textIndent: '40px', marginBottom: '16px' }}>
                Signed this <strong>{dayStr}<sup>{suffix.toUpperCase()}</sup></strong> day of <strong>{month.toUpperCase()} {year}</strong> in the City/Municipality of <strong>OLONGAPO CITY</strong>.
            </p>

            <p style={{ textIndent: '40px' }}>
                This certification is valid only until <strong>{data.expirationDate?.toUpperCase() || '_________________'}</strong> one (1) year from the issuance
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px' }}>
                <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>HON. EVANGELINE D. TINGA</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>BARANGAY KAGAWAD</p>
                    <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>Signature over Printed name</p>
                    <p style={{ margin: '15px 0 0 0', fontWeight: 'bold' }}>{data.dateIssued.toUpperCase()}</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>Date</p>

                    <p style={{ margin: '25px 0 0 0' }}>Witnessed by:</p>
                    <p style={{ margin: '20px 0 0 0', fontWeight: 'bold' }}>SEC. SHAN RACEN GENRHYC B. LABABIT</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>BARANGAY SECRETARY</p>
                    <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>Signature over Printed Name</p>
                    <p style={{ margin: '15px 0 0 0', fontWeight: 'bold' }}>{data.dateIssued.toUpperCase()}</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>Date</p>
                </div>
            </div>

            <div style={{ marginTop: 'auto', marginBottom: '20px' }}>
                <p style={{ margin: 0 }}>Type of ID: {data.formData?.idType || '__________________'}</p>
                <p style={{ margin: 0 }}>ID Number: {data.formData?.idNumber || '__________________'}</p>
                <p style={{ margin: '25px 0 0 0', fontWeight: 'bold' }}>THIS FORM NEED NOT BE NOTARIZED</p>
                <p style={{ margin: 0, fontSize: '12px' }}>RA 11261 Form 1</p>
            </div>
        </div>
    )

    // ── LOT CERTIFICATION ─────────────────────────────────────────────────────
    const renderLot = () => (
        <div style={{ fontSize: '15px', lineHeight: '1.8', textAlign: 'justify', fontFamily: '"Arial", sans-serif', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '30px', color: '#000', letterSpacing: '1px' }}>
                CERTIFICATION OF LOT OCCUPANCY/POSSESSION
            </h1>

            <p style={{ fontWeight: 'bold', marginBottom: '16px', fontStyle: 'italic' }}>TO WHOM IT MAY CONCERN:</p>

            <p style={{ textIndent: '40px', fontStyle: 'italic', marginBottom: '16px' }}>
                This is to certify that as per records shown and submitted at this office by the applicant, and as verified, <strong>{upperName}</strong> is the lawful owner and actual occupant of a certain parcel of lot approximately <strong>{data.formData?.lotArea || '__________'}</strong> square meters, more or less, paid under Tax Declaration No. <strong>{data.formData?.taxDecNo || '____________________'}</strong> located at <strong>{data.formData?.propertyLocation || '__________________________________________'}</strong>, particularly described as follows;
            </p>

            <div style={{ paddingLeft: '40px', fontStyle: 'italic', margin: '20px 0' }}>
                <p style={{ margin: 0 }}>Bounded:&nbsp;&nbsp;&nbsp;On the North by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OCCUPIED LOT</p>
                <p style={{ margin: 0 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;On the South by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OCCUPIED LOT</p>
                <p style={{ margin: 0 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;On the East by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OCCUPIED LOT</p>
                <p style={{ margin: 0 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;On the West by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OCCUPIED LOT</p>
            </div>

            <p style={{ fontStyle: 'italic', marginBottom: '8px' }}>Containing an area of approximately <strong>{data.formData?.lotArea || '__________'}</strong> square meters more or less,</p>
            <p style={{ fontStyle: 'italic', marginBottom: '8px' }}>That <strong>{upperName}</strong> is in the possession of the aforementioned lot since <strong>{data.formData?.occupiedSince || '__________'}</strong></p>
            <p style={{ fontStyle: 'italic', marginBottom: '8px' }}><strong>/ XX /- DEED OF SALE</strong> as per Doc. No. <strong>{data.formData?.docNo || '______'}</strong>, Page No. <strong>{data.formData?.pageNo || '______'}</strong>, Book No. <strong>{data.formData?.bookNo || '______'}</strong>, Series of <strong>{data.formData?.seriesOf || '______'}</strong>.</p>
            <p style={{ fontStyle: 'italic', marginBottom: '8px' }}>That the <strong>DEED OF SALE</strong> was notarized by Atty. <strong>{data.formData?.notarizedBy || '____________________'}</strong> on the <strong>{data.formData?.notarizedOn || '____________________'}</strong>;</p>
            <p style={{ fontStyle: 'italic', marginBottom: '16px' }}>This certification is issued upon request of <strong>{upperName}</strong> for <strong>{(data.purpose || 'LEGAL PURPOSES').toUpperCase()}</strong> without prejudice action to other interested parties may deem on the premises.</p>

            <p style={{ fontStyle: 'italic', textIndent: '40px' }}>
                Issued this <strong>{dayStr}<sup>{suffix}</sup></strong> day of <strong>{month} {year}</strong> at Barangay Gordon Heights, Olongapo City, Philippines.
            </p>

            <div style={{ marginTop: '40px' }}>
                <p style={{ margin: '0 0 4px 0', fontStyle: 'italic' }}>By the Authority of Punong Barangay <strong>Hon. PRISCILLA B. PONGE.</strong></p>
                <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', fontStyle: 'italic' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                <p style={{ margin: 0, fontStyle: 'italic' }}>Barangay Secretary</p>
            </div>

            <div style={{ marginTop: '30px', fontStyle: 'italic', fontSize: '14px' }}>
                <p style={{ margin: 0 }}>Paid under:</p>
                <div style={{ paddingLeft: '40px', marginTop: '10px' }}>
                    <p style={{ margin: 0 }}>O.R. No.: {data.formData?.orNo || '_________________'}</p>
                    <p style={{ margin: 0 }}>Amount: Php {data.formData?.amount || '_________________'}</p>
                    <p style={{ margin: 0 }}>Issued on: {data.formData?.orIssuedOn || '_________________'}</p>
                    <p style={{ margin: 0 }}>Issued at: Barangay Gordon Heights, Olongapo City</p>
                </div>
            </div>

            <div style={{ marginTop: 'auto', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontStyle: 'italic' }}>NOT VALID WITHOUT BARANGAY SEAL</p>
            </div>
        </div>
    )

    // ── BUSINESS CLEARANCE ────────────────────────────────────────────────────
    const renderBusiness = () => (
        <div style={{ fontSize: '15px', lineHeight: '1.8', textAlign: 'justify', fontFamily: '"Arial", sans-serif', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{ margin: '0 0 4px 0' }}><strong>GDH</strong>-BPI-{year}-_____</p>
            <p style={{ margin: '0 0 20px 0' }}><strong>New Business / Renewal</strong></p>

            <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', textDecoration: 'underline', margin: '0 0 24px 0', color: '#000', letterSpacing: '1px' }}>
                ENDORSEMENT
            </h1>

            <p style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>THIS IS TO ENDORSE</p>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{data.formData?.businessName?.toUpperCase() || '__________________________________________'}</p>
                <p style={{ margin: 0, fontSize: '14px' }}>(Business Name or Trade Activity)</p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{data.formData?.businessLocation?.toUpperCase() || '__________________________________________'}</p>
                <p style={{ margin: 0, fontSize: '14px' }}>(Location)</p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{data.formData?.operatorName?.toUpperCase() || upperName}</p>
                <p style={{ margin: 0, fontSize: '14px' }}>(Operator/Manager)</p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{data.formData?.operatorAddress?.toUpperCase() || '__________________________________________'}</p>
                <p style={{ margin: 0, fontSize: '14px' }}>(Address)</p>
            </div>

            <p>Applying for the corresponding <strong>BUSINESS PERMIT</strong> that has been found to be:</p>

            <div style={{ paddingLeft: '20px', margin: '12px 0' }}>
                <p style={{ margin: 0 }}><strong>___ COMPLIANT</strong> with the provisions of existing Barangay Ordinances, rules and regulations being enforced in this barangay;</p>
                <p style={{ margin: '10px 0' }}><strong>/</strong></p>
                <p style={{ margin: 0 }}><strong>___ NON-COMPLIANT</strong> with the provisions of existing Barangay Ordinances, rules and regulations being enforced in this barangay.</p>
            </div>

            <p style={{ textIndent: '40px', marginTop: '12px' }}>In view of the foregoing, this barangay, thru the undersigned,</p>

            <div style={{ paddingLeft: '20px', margin: '12px 0' }}>
                <p style={{ margin: 0 }}>___ <strong>Interposes NO OBJECTION</strong> for the issuance of the corresponding Mayor's Permit being applied for.</p>
                <p style={{ margin: '10px 0' }}><strong>/</strong></p>
                <p style={{ margin: 0 }}>___ <strong>Recommends for the NON-ISSUANCE</strong> of the corresponding Mayor's Permit being applied for.</p>
            </div>

            <p style={{ marginTop: '24px' }}>Issued this <strong>{dayStr}<sup>{suffix}</sup> day</strong> of <strong>{month} {year}.</strong></p>

            <div style={{ marginTop: '40px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>BY AUTHORITY OF THE PUNONG BARANGAY</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
            </div>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                <p style={{ margin: 0 }}>Barangay Secretary</p>
            </div>
        </div>
    )

    // ── Route to correct body ─────────────────────────────────────────────────
    const renderBody = () => {
        if (type.includes('indigency')) return renderIndigency()
        if (type.includes('job seeker') || type.includes('first time')) return renderJobSeeker()
        if (type.includes('residency') || (type.includes('clearance') && !type.includes('business'))) return renderResidency()
        if (type.includes('lot') || type.includes('occupancy') || type.includes('building')) return renderLot()
        if (type.includes('business')) return renderBusiness()
        // default → barangay clearance
        return renderClearance()
    }

    return (
        <div
            ref={ref}
            id="certificate-template"
            style={{
                width: '794px',
                height: '1123px', // Fixed height for exact A4 size
                padding: '40px 60px 20px 60px',
                background: '#ffffff',
                color: '#000000',
                fontFamily: '"Times New Roman", Times, serif',
                // Remove fixed positioning here so we can preview it. 
                // html2canvas will still render it perfectly without fixed positioning!
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <CertHeader />
                {renderBody()}
                <CertFooter />
            </div>
        </div>
    )
})

CertificateTemplate.displayName = 'CertificateTemplate'
export default CertificateTemplate
