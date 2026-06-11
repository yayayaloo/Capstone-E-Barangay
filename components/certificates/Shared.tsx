export function CertHeader() {
    return (
        <div style={{ marginTop: '-64px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '0' }}>

                {/*LEFT logos*/}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexShrink: 0, marginLeft: '-100px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Bagong-Pilipinas-Logo.png" alt="Bagong Pilipinas" style={{ width: '134px', height: '121px', objectFit: 'contain', marginBottom: '-12px' }} crossOrigin="anonymous" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Barangay Logo" style={{ width: '96px', height: '94px', objectFit: 'contain', marginLeft: '-36px' }} crossOrigin="anonymous" />
                </div>

                {/* CENTER text*/}
                <div style={{ textAlign: 'center', marginLeft: '12px', color: '#000', alignSelf: 'center', marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 2px 0', fontSize: '12pt', fontWeight: 'bold', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.0', fontStyle: 'normal', color: '#000' }}>
                        Republic of the Philippines
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11pt', fontWeight: 'normal', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.0', fontStyle: 'normal', color: '#000' }}>
                        City of Olongapo
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '18pt', fontWeight: 'bold', fontFamily: 'Verdana, Geneva, sans-serif', lineHeight: '1.0', fontStyle: 'normal', whiteSpace: 'nowrap', color: '#000' }}>
                        BARANGAY GORDON HEIGHTS
                    </p>
                    <p style={{ margin: '0 0 2px 0', fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Cambria, Georgia, serif', lineHeight: '1.0', fontStyle: 'normal', color: '#000' }}>
                        Block 12 Long Road, Gordon Heights, Olongapo City
                    </p>
                    <p style={{ margin: '0', fontSize: '8pt', fontWeight: 'bold', fontFamily: 'Cambria, Georgia, serif', lineHeight: '1.0', fontStyle: 'normal', color: '#000' }}>
                        Telephone No. 223-5497
                    </p>
                </div>

                {/* RIGHT logo */}
                <div style={{ marginLeft: 'auto', marginRight: '-44px', flexShrink: 0, marginBottom: '-12px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/olongapo-logo.png" alt="Olongapo City" style={{ width: '101px', height: '95px', objectFit: 'contain' }} crossOrigin="anonymous" />
                </div>
            </div>

            {/* Double line above */}
            <div style={{ marginTop: '0', marginBottom: '6px' }}>
                <div style={{ borderTop: '3px solid #000', marginBottom: '2px' }} />
                <div style={{ borderTop: '1px solid gray' }} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <p style={{ margin: 0, fontFamily: '"Open Sans", Arial, sans-serif', fontWeight: 'bold', fontSize: '21pt', lineHeight: '1.0', fontStyle: 'normal', color: '#000' }}>
                    OFFICE OF THE PUNONG BARANGAY
                </p>
            </div>

            {/* Double line below */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ borderTop: '3px solid #000', marginBottom: '2px' }} />
                <div style={{ borderTop: '1px solid gray' }} />
            </div>
        </div>
    )
}

// ─── Shared Title ──────────────────────────────────────────────────────────────
export function CertTitle({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) {
    return (
        <h1 style={{
            fontFamily: '"Arial Black", Arial, sans-serif',
            fontSize: '18pt',
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: '1.0',
            fontStyle: 'normal',
            margin: '0 0 14px 0',
            color: '#000',
            ...style
        }}>
            <span style={{ borderBottom: '2px solid #000', paddingBottom: '2px' }}>
                {children}
            </span>
        </h1>
    )
}

// ─── Shared Footer ─────────────────────────────────────────────────────────────
export function CertFooter() {
    return (
        <div style={{ 
            marginTop: 'auto', 
            width: 'calc(100% + 192px)', 
            marginLeft: '-96px', 
            marginBottom: '-96px',
            height: '160px', // Restrict vertical height so whitespace doesn't push it off the paper
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center' // Centering crops the excess top/bottom transparent space
        }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/footer.png"
                alt="Footer"
                style={{
                    width: '130%', // Zooms in so the ribbon stretches wider edge-to-edge
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                    transform: 'translateY(15px)' // Fine-tune vertical position of ribbon within the wrapper
                }}
                crossOrigin="anonymous"
            />
        </div>
    )
}

// ─── Reusable styles ───────────────────────────────────────────────────────────
export const bodyStyle: React.CSSProperties = {
    fontSize: '13px',
    lineHeight: '1.8',
    textAlign: 'justify',
    fontFamily: '"Times New Roman", Times, serif',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    color: '#000',
}

export const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: '14px',
    marginTop: '0',
    color: '#000',
    letterSpacing: '2px',
    fontFamily: '"Times New Roman", Times, serif',
}

// ─── Date helpers ──────────────────────────────────────────────────────────────
export function parseDate(iso: string) {
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

export function calcAge(birthdate: string): string {
    if (!birthdate) return ''
    const today = new Date()
    const born = new Date(birthdate)
    if (isNaN(born.getTime())) return ''
    let age = today.getFullYear() - born.getFullYear()
    const m = today.getMonth() - born.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
    return age.toString()
}
