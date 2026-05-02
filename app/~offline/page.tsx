import Link from 'next/link'
import Image from 'next/image'

export default function OfflinePage() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--bg-primary, #0f0f23)',
            color: 'var(--text-primary, #ffffff)'
        }}>
            <div style={{ width: '120px', height: '120px', marginBottom: '2rem', opacity: 0.8 }}>
                <Image src="/logo.png" alt="Barangay Logo" width={120} height={120} style={{ width: '100%', height: 'auto' }} />
            </div>
            
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--accent-500, #6366f1)' }}>
                You are Offline
            </h1>
            
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary, #9ca3af)', maxWidth: '400px', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                It looks like you've lost your internet connection. Please check your network settings and try again.
            </p>
            
            <button 
                onClick={() => window.location.reload()}
                style={{
                    padding: '0.75rem 2rem',
                    background: 'var(--accent-500, #6366f1)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-md)'
                }}
            >
                Try Again
            </button>
        </div>
    )
}
