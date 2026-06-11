import React from 'react'
import { CertificateData } from '../CertificateTemplate'
import { bodyStyle, parseDate, CertTitle } from './Shared'

interface Props {
    data: CertificateData
}

export default function LotCertification({ data }: Props) {
    const { dayStr, suffix, month, year } = parseDate(data.dateIssued)
    const upperName = data.residentName.toUpperCase()

    const fd = data.formData || {}

    return (
        <div style={bodyStyle}>
            <CertTitle>CERTIFICATION OF LOT OCCUPANCY/POSSESSION</CertTitle>

            <p style={{ marginBottom: '8px', fontStyle: 'italic' }}>TO WHOM IT MAY CONCERN:</p>

            <p style={{ textIndent: '40px', fontStyle: 'italic', marginBottom: '12px', textAlign: 'justify', lineHeight: '1.6' }}>
                This is to certify that, based on the records on file with and submitted to this office by the applicant, and as verified, <strong>{upperName}</strong> is the actual occupant and possessor of a certain parcel of land measuring approximately <strong>{fd.lotArea || '__________'}</strong> square meters, more or less, covered by Tax Declaration No. <strong>{fd.taxDecNo || '____________________'}</strong>, located at <strong>{fd.propertyLocation || '__________________________________________'}</strong>, which is particularly described as follows:
            </p>

            <div style={{ paddingLeft: '50px', fontStyle: 'italic', margin: '12px 0', fontSize: '12px', lineHeight: '1.6' }}>
                <p style={{ margin: '2px 0' }}>Bounded:&nbsp;&nbsp;&nbsp;On the North by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>{fd.boundedNorth || 'OCCUPIED LOT'}</strong></p>
                <p style={{ margin: '2px 0' }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;On the South by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>{fd.boundedSouth || 'OCCUPIED LOT'}</strong></p>
                <p style={{ margin: '2px 0' }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;On the East by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>{fd.boundedEast || 'OCCUPIED LOT'}</strong></p>
                <p style={{ margin: '2px 0' }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;On the West by&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>{fd.boundedWest || 'OCCUPIED LOT'}</strong></p>
            </div>

            <p style={{ fontStyle: 'italic', marginBottom: '6px', lineHeight: '1.5' }}>
                That the said parcel of land contains an area of approximately <strong>{fd.lotArea || '__________'}</strong> square meters, more or less;
            </p>
            <p style={{ fontStyle: 'italic', marginBottom: '6px', lineHeight: '1.5' }}>
                That <strong>{upperName}</strong> has been in the actual possession and occupancy of the aforementioned property since <strong>{fd.occupiedSince || '__________'}</strong>;
            </p>
            <p style={{ fontStyle: 'italic', marginBottom: '6px', lineHeight: '1.5' }}>
                That the applicant's claim of occupancy and possession is supported by a:
            </p>
            <p style={{ fontStyle: 'italic', marginBottom: '6px', paddingLeft: '20px', lineHeight: '1.5' }}>
                <strong>
                    / {(fd.proofType || 'Deed of Sale') === 'Deed of Sale' ? 'XX' : '  '} /- DEED OF SALE &nbsp;&nbsp;&nbsp;&nbsp;
                    / {(fd.proofType || 'Deed of Sale') === 'Deed of Donation' ? 'XX' : '  '} /- DEED OF DONATION &nbsp;&nbsp;&nbsp;&nbsp;
                    / {(fd.proofType || 'Deed of Sale') === 'Waiver of Rights' ? 'XX' : '  '} /- WAIVER OF RIGHTS
                </strong>
            </p>
            <p style={{ fontStyle: 'italic', marginBottom: '8px', lineHeight: '1.5' }}>
                docketed under Doc. No. <strong>{fd.docNo || '______'}</strong>, Page No. <strong>{fd.pageNo || '______'}</strong>, Book No. <strong>{fd.bookNo || '______'}</strong>, Series of <strong>{fd.seriesOf || '______'}</strong>, and notarized by Atty. <strong>{fd.notarizedBy || '____________________'}</strong> on <strong>{fd.notarizedOn || '____________________'}</strong>;
            </p>
            <p style={{ fontStyle: 'italic', marginBottom: '12px', textAlign: 'justify', lineHeight: '1.6' }}>
                This certification is issued upon the request of <strong>{upperName}</strong> for <strong>{(data.purpose || 'LEGAL PURPOSES').toUpperCase()}</strong>, and for whatever legal purpose it may serve, without prejudice to the rights of other parties with valid interest in the premises.
            </p>

            <p style={{ fontStyle: 'italic', textIndent: '40px', marginBottom: '16px' }}>
                Issued this {dayStr}<sup style={{ fontSize: '9px' }}>{suffix}</sup> day of <strong>{month} {year}</strong> at Barangay Gordon Heights, Olongapo City, Philippines.
            </p>

            <div style={{ marginTop: '14px' }}>
                <p style={{ margin: '0', fontStyle: 'italic', fontSize: '12px' }}>By the Authority of Punong Barangay <strong>Hon. PRISCILLA B. PONGE.</strong></p>
                <div style={{ borderTop: '1px solid #000', width: '250px', marginTop: '35px', marginBottom: '3px' }} />
                <p style={{ margin: 0, fontWeight: 'bold', fontStyle: 'italic', fontSize: '13px' }}>SHAN RACEN GENRHYC B. LABABIT</p>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '12px' }}>Barangay Secretary</p>
            </div>

            <div style={{ marginTop: '12px', fontStyle: 'italic', fontSize: '12px' }}>
                <p style={{ margin: 0 }}>Official Receipt Details:</p>
                <div style={{ paddingLeft: '30px', marginTop: '4px' }}>
                    <p style={{ margin: '1px 0' }}>O.R. No.: {fd.orNo || '_________________'}</p>
                    <p style={{ margin: '1px 0' }}>Amount: Php {fd.amount || '_________________'}</p>
                    <p style={{ margin: '1px 0' }}>Issued on: {fd.orIssuedOn || '_________________'}</p>
                    <p style={{ margin: '1px 0' }}>Issued at: Barangay Gordon Heights, Olongapo City</p>
                </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontStyle: 'italic', fontSize: '11px', textDecoration: 'underline' }}>NOT VALID WITHOUT BARANGAY SEAL</p>
            </div>
        </div>
    )
}
