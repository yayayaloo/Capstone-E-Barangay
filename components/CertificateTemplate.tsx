'use client'

import React, { forwardRef } from 'react'
import Image from 'next/image'

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
    if (!data) return null;

    const renderBody = () => {
        const type = data.documentType.toLowerCase()
        const upperName = data.residentName.toUpperCase()
        
        const d = new Date(data.dateIssued);
        let ordinalDate = data.dateIssued;
        let dayStr = "";
        let suffixStr = "";
        let monthName = "";
        let yearNum = "";
        if (!isNaN(d.getTime())) {
            const day = d.getDate();
            dayStr = day.toString();
            suffixStr = (day > 0 ? ['th', 'st', 'nd', 'rd'][(day > 3 && day < 21) || day % 10 > 3 ? 0 : day % 10] : '');
            monthName = d.toLocaleDateString('en-US', { month: 'long' });
            yearNum = d.getFullYear().toString();
            ordinalDate = `${dayStr}${suffixStr} day of ${monthName} ${yearNum}`;
        }

        if (type.includes('job seeker') || type.includes('first time')) {
            return (
                <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', marginBottom: '5px', color: '#000' }}>
                        BARANGAY CERTIFICATION
                    </h1>
                    <h2 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '30px', color: '#000' }}>
                        (First Time Jobseekers Assistance Act-RA 11261)
                    </h2>
                    <p style={{ textIndent: '40px' }}>
                        <strong>THIS IS TO CERTIFY</strong> that MR./MS. <strong>{upperName}</strong>, is a bona fide resident of this barangay with postal address of <strong>{data.formData?.address || '__________________________________________'}</strong> (complete address) for <strong>{data.formData?.yearsOfResidency || '______'}</strong> year(s), is a qualified availee of <strong>RA 11261</strong> or the <strong>First Time Jobseekers Assistance Act of 2019.</strong>
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        I further certify that the holder/bearer was informed of his/her rights, including the duties and responsibilities accorded by RA 11261 through the <strong>Oath of Undertaking</strong> he/she has signed and executed in the presence of Barangay Official/s.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '20px' }}>
                        Signed this <strong>{dayStr}<sup>{suffixStr.toUpperCase()}</sup></strong> day of <strong>{monthName.toUpperCase()} {yearNum}</strong> in the City/Municipality of <strong>OLONGAPO CITY</strong>.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This certification is valid only until <strong>{data.expirationDate?.toUpperCase() || '_________________'}</strong> one (1) year from the issuance
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
                        <div>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>HON. EVANGELINE D. TINGA</p>
                            <p style={{ margin: 0, fontSize: '14px' }}>BARANGAY KAGAWAD</p>
                            <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>Signature over Printed name</p>
                            <p style={{ margin: '15px 0 0 0', fontWeight: 'bold' }}>{data.dateIssued.toUpperCase()}</p>
                            <p style={{ margin: 0, fontSize: '14px' }}>Date</p>
                            
                            <p style={{ margin: '20px 0 0 0' }}>Witnessed by:</p>
                            <p style={{ margin: '20px 0 0 0', fontWeight: 'bold' }}>SEC. SHAN RACEN GENRHYC B. LABABIT</p>
                            <p style={{ margin: 0, fontSize: '14px' }}>BARANGAY SECRETARY</p>
                            <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>Signature over Printed Name</p>
                            <p style={{ margin: '15px 0 0 0', fontWeight: 'bold' }}>{data.dateIssued.toUpperCase()}</p>
                            <p style={{ margin: 0, fontSize: '14px' }}>Date</p>
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '30px' }}>
                        <p style={{ margin: 0 }}>Type of ID: {data.formData?.idType || '__________________'}</p>
                        <p style={{ margin: 0 }}>ID Number: {data.formData?.idNumber || '__________________'}</p>
                        <p style={{ margin: '20px 0 0 0', fontWeight: 'bold' }}>THIS FORM NEED NOT BE NOTARIZED</p>
                        <p style={{ margin: 0, fontSize: '12px' }}>RA 11261 Form 1</p>
                    </div>
                </div>
            )
        }

        if (type.includes('indigency')) {
            return (
                <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', marginBottom: '30px', color: '#000' }}>
                        CERTIFICATE OF INDIGENCY
                    </h1>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                    <p style={{ textIndent: '40px' }}>
                        <strong>THIS IS TO CERTIFY</strong> that <strong>{upperName}</strong>, <strong>{data.formData?.age || '_____'}</strong> years old, <strong>{data.formData?.civilStatus || '____________'}</strong> (civil status), born on <strong>{data.formData?.birthdate ? new Date(data.formData.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '__________________'}</strong>, is a bona fide resident of this barangay with postal address <strong>{data.formData?.address || '__________________________________________'}</strong>, belongs to an <strong>indigent family</strong>.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        As verified in our existing records and from other reliable sources, the subject person has never been accused, investigated, or detained for any crime inimical to moral turpitude or other related criminal acts.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This certification is issued upon the request of <strong>{upperName}</strong> for his/her <strong>{data.purpose.toUpperCase() || 'EDUCATIONAL ASSISTANCE PURPOSES'}</strong> and for whatever <strong>LEGAL INTENT</strong> it may serve.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '30px' }}>
                        Issued this <strong>{dayStr}<sup>{suffixStr}</sup></strong> day of <strong>{monthName} {yearNum}</strong> at <strong>Barangay Gordon Heights, Olongapo City, Philippines.</strong>
                    </p>
                    <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'center', paddingRight: '40px' }}>
                        <p style={{ margin: '0 0 20px 0' }}>By the authority of the Punong Barangay:</p>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
                        <br/>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>SEC. SHAN RACEN GENRHYC B. LABABIT</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>Barangay Secretary</p>
                    </div>
                    <div style={{ marginTop: '40px', fontSize: '14px' }}>
                        <p style={{ margin: 0 }}>Note: This clearance is valid only for six months upon issue.</p>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>NOT VALID WITHOUT THE BARANGAY SEAL</p>
                    </div>
                </div>
            )
        }

        if (type.includes('residency') || type.includes('clearance') && !type.includes('business')) {
            return (
                <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', marginBottom: '30px', color: '#000' }}>
                        CERTIFICATE OF RESIDENCY
                    </h1>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                    <p style={{ textIndent: '40px' }}>
                        <strong>THIS IS TO CERTIFY</strong> that <strong>{upperName}</strong>, <strong>{data.formData?.age || '_____'}</strong> years old, <strong>{data.formData?.civilStatus || '____________'}</strong> (civil status), born on <strong>{data.formData?.birthdate ? new Date(data.formData.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '__________________'}</strong>, is a bona fide resident of this barangay since <strong>{data.formData?.residentSince || '________'}</strong> up to present with postal address at <strong>{data.formData?.address || '__________________________________________'}</strong> is known to me as a person of good moral character, and a law-abiding citizen of the community.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        As verified in our existing records and from other reliable source, subject person has never been accused, investigated nor detained for any crime inimical to moral turpitude and other related criminal acts.
                    </p>
                    <p style={{ textIndent: '40px' }}>
                        This certification is issued upon the request of <strong>{upperName}</strong> for <strong>{data.purpose.toUpperCase() || 'RECORD PURPOSES'}</strong> and for whatever <strong>LEGAL INTENT</strong> it may serve.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '30px' }}>
                        Issued this <strong>{dayStr}<sup>{suffixStr}</sup></strong> day of <strong>{monthName} {yearNum}</strong> at <strong>Barangay Gordon Heights, Olongapo City, Philippines.</strong>
                    </p>
                    <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'center', paddingRight: '40px' }}>
                        <p style={{ margin: '0 0 20px 0' }}>By the authority of the Punong Barangay:</p>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
                        <br/>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>Barangay Secretary</p>
                    </div>
                    <div style={{ marginTop: '30px' }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{upperName}</p>
                        <p style={{ margin: 0, fontStyle: 'italic', fontSize: '14px' }}>(Signature)</p>
                    </div>
                    <div style={{ marginTop: '40px', fontSize: '14px' }}>
                        <p style={{ margin: 0 }}>Note: This clearance is valid only for three months upon issue.</p>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>NOT VALID WITHOUT THE BARANGAY SEAL.</p>
                    </div>
                </div>
            )
        }

        if (type.includes('lot') || type.includes('occupancy') || type.includes('building')) {
            return (
                <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', marginBottom: '30px', color: '#000' }}>
                        CERTIFICATION OF LOT OCCUPANCY/POSSESSION
                    </h1>
                    <p style={{ fontWeight: 'bold', marginBottom: '20px', fontStyle: 'italic' }}>TO WHOM IT MAY CONCERN:</p>
                    <p style={{ textIndent: '40px', fontStyle: 'italic' }}>
                        This is to certify that as per records shown and submitted at this office by the applicant, and as verified, <strong>{upperName}</strong> is the lawful owners and actual occupants of a certain parcel of lot approximately <strong>{data.formData?.lotArea || '__________'}</strong> square meters, more or less, paid under Tax Declaration No. <strong>{data.formData?.taxDecNo || '____________________'}</strong> located at <strong>{data.formData?.propertyLocation || '__________________________________________'}</strong>, particularly described as follows;
                    </p>
                    <div style={{ paddingLeft: '40px', fontStyle: 'italic', margin: '20px 0' }}>
                        <p style={{ margin: 0 }}>Bounded: On the North by OCCUPIED LOT</p>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', paddingTop: '5px' }}>On the South by OCCUPIED LOT</h2>
                        <p style={{ margin: 0, paddingTop: '5px' }}>On the East by OCCUPIED LOT</p>
                        <p style={{ margin: 0 }}>On the West by OCCUPIED LOT</p>
                    </div>
                    <p style={{ fontStyle: 'italic' }}>
                        Containing an area of approximately <strong>{data.formData?.lotArea || '__________'}</strong> square meters more or less,
                    </p>
                    <p style={{ fontStyle: 'italic' }}>
                        That <strong>{upperName}</strong> is in the possession of the aforementioned lot since <strong>{data.formData?.occupiedSince || '__________'}</strong>
                    </p>
                    <p style={{ fontStyle: 'italic' }}>
                        <strong>/ XX /- DEED OF SALE</strong> as per Doc. No. <strong>{data.formData?.docNo || '______'}</strong>, Page No. <strong>{data.formData?.pageNo || '______'}</strong>, Book No. <strong>{data.formData?.bookNo || '______'}</strong>, Series of <strong>{data.formData?.seriesOf || '______'}</strong>.
                    </p>
                    <p style={{ fontStyle: 'italic' }}>
                        That the <strong>DEED OF SALE</strong> was notarized by Atty. <strong>{data.formData?.notarizedBy || '____________________'}</strong> on the <strong>{data.formData?.notarizedOn || '____________________'}</strong>;
                    </p>
                    <p style={{ fontStyle: 'italic' }}>
                        This certification is issued upon request of <strong>{upperName}</strong> for <strong>{data.purpose.toUpperCase() || 'LEGAL PURPOSES'}</strong> without prejudice action to other interested parties may deem on the premises.
                    </p>
                    <p style={{ textIndent: '40px', marginTop: '20px', fontStyle: 'italic' }}>
                        Issued this <strong>{dayStr}<sup>{suffixStr}</sup></strong> day of <strong>{monthName} {yearNum}</strong> at Barangay Gordon Heights, Olongapo City, Philippines.
                    </p>
                    <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'center', paddingRight: '40px' }}>
                        <p style={{ margin: '0 0 20px 0', fontStyle: 'italic' }}>By the Authority of Punong Barangay <strong>Hon. PRISCILLA B. PONGE.</strong></p>
                        <p style={{ margin: 0, fontWeight: 'bold', fontStyle: 'italic' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                        <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>Barangay Secretary</p>
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
                    <div style={{ marginTop: '40px' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', fontStyle: 'italic' }}>NOT VALID WITHOUT BARANGAY SEAL</p>
                    </div>
                </div>
            )
        }

        if (type.includes('business')) {
            return (
                <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                    <p style={{ margin: 0 }}><strong>GDH</strong>-BPI-{yearNum}-_____</p>
                    <p style={{ margin: 0 }}><strong>New Business / Renewal</strong></p>
                    
                    <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', margin: '30px 0', color: '#000' }}>
                        ENDORSEMENT
                    </h1>
                    
                    <p style={{ fontWeight: 'bold', textAlign: 'center' }}>THIS IS TO ENDORSE</p>
                    
                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{data.formData?.businessName?.toUpperCase() || '__________________________________________'}</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>(Business Name or Trade Activity)</p>
                    </div>
                    
                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{data.formData?.businessLocation?.toUpperCase() || '__________________________________________'}</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>(Location)</p>
                    </div>
                    
                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{data.formData?.operatorName?.toUpperCase() || upperName}</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>(Operator/Manager)</p>
                    </div>
                    
                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{data.formData?.operatorAddress?.toUpperCase() || '__________________________________________'}</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>(Address)</p>
                    </div>
                    
                    <p style={{ marginTop: '30px' }}>
                        Applying for the corresponding <strong>BUSINESS PERMIT</strong> that has been found to be:
                    </p>
                    
                    <div style={{ paddingLeft: '20px', margin: '15px 0' }}>
                        <p style={{ margin: 0 }}><strong>___ COMPLIANT</strong> with the provisions of existing Barangay Ordinances, rules and regulations being enforced in this barangay;</p>
                        <p style={{ margin: '10px 0' }}><strong>/</strong></p>
                        <p style={{ margin: 0 }}><strong>___ NON-COMPLIANT</strong> with the provisions of existing Barangay Ordinances, rules and regulations being enforced in this barangay.</p>
                    </div>
                    
                    <p style={{ textIndent: '40px' }}>
                        In view of the foregoing, this barangay, thru the undersigned,
                    </p>
                    
                    <div style={{ paddingLeft: '20px', margin: '15px 0' }}>
                        <p style={{ margin: 0 }}>___ <strong>Interposes NO OBJECTION</strong> for the issuance of the corresponding Mayor's Permit being applied for.</p>
                        <p style={{ margin: '10px 0' }}><strong>/</strong></p>
                        <p style={{ margin: 0 }}>___ <strong>Recommends for the NON-ISSUANCE</strong> of the corresponding Mayor's Permit being applied for.</p>
                    </div>
                    
                    <p style={{ marginTop: '30px' }}>
                        Issued this <strong>{dayStr}<sup>{suffixStr}</sup> day</strong> of <strong>{monthName} {yearNum}.</strong>
                    </p>
                    
                    <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 20px 0', fontWeight: 'bold' }}>BY AUTHORITY OF THE PUNONG BARANGAY</p>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
                        <br/>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>Barangay Secretary</p>
                    </div>
                </div>
            )
        }

        // Default Certification
        return (
            <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'justify', marginBottom: '40px' }}>
                <h1 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', marginBottom: '30px', color: '#000' }}>
                    BARANGAY CLEARANCE / CERTIFICATION
                </h1>
                <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>TO WHOM IT MAY CONCERN:</p>
                <p style={{ textIndent: '40px' }}>
                    <strong>THIS IS TO CERTIFY</strong> that <strong>{upperName}</strong>, of legal age, is a bona fide resident of this barangay.
                </p>
                <p style={{ textIndent: '40px' }}>
                    As verified in our existing records and from other reliable sources, the subject person has never been accused, investigated, or detained for any crime inimical to moral turpitude or other related criminal acts.
                </p>
                <p style={{ textIndent: '40px' }}>
                    This <strong>{data.documentType.toUpperCase()}</strong> is being issued upon the request of the aforementioned person for <strong>{data.purpose.toUpperCase() || 'GENERAL PURPOSES'}</strong> and for whatever <strong>LEGAL INTENT</strong> it may serve.
                </p>
                <p style={{ textIndent: '40px', marginTop: '30px' }}>
                    Issued this <strong>{data.dateIssued}</strong> at <strong>Barangay Gordon Heights, Olongapo City, Philippines.</strong>
                </p>
                <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'center', paddingRight: '40px' }}>
                    <p style={{ margin: '0 0 20px 0' }}>By the authority of the Punong Barangay:</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>HON. PRISCILLA B. PONGE</p>
                    <br/>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>SEC. SHAN RACEN GENRHYC B. LABABIT</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>Barangay Secretary</p>
                </div>
                <div style={{ marginTop: '40px', fontSize: '14px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>NOT VALID WITHOUT THE BARANGAY SEAL</p>
                </div>
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

            </div>
        </div>
    )
})

CertificateTemplate.displayName = 'CertificateTemplate'

export default CertificateTemplate
