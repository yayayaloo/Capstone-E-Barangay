'use client'

export default function OfflinePage() {
    return (
        <div className="offline-container">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-8px);
                    }
                }
                @keyframes pulseGlow {
                    0%, 100% {
                        box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
                        transform: scale(1);
                    }
                    50% {
                        box-shadow: 0 0 20px rgba(239, 68, 68, 0.7);
                        transform: scale(1.08);
                    }
                }
                .offline-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 2rem;
                    text-align: center;
                    background: radial-gradient(circle at center, #022c22 0%, #01120e 100%);
                    color: #f8fafc;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                    position: relative;
                }
                /* Background ambient decorative glows */
                .offline-container::before,
                .offline-container::after {
                    content: '';
                    position: absolute;
                    width: 300px;
                    height: 300px;
                    border-radius: 50%;
                    background: rgba(16, 185, 129, 0.08);
                    filter: blur(80px);
                    z-index: 0;
                }
                .offline-container::before {
                    top: 10%;
                    left: 10%;
                }
                .offline-container::after {
                    bottom: 10%;
                    right: 10%;
                }
                .offline-card {
                    background: rgba(2, 44, 34, 0.45);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 20px;
                    padding: 3.5rem 2.5rem;
                    max-width: 440px;
                    width: 100%;
                    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), 
                                0 0 50px -10px rgba(16, 185, 129, 0.1);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    z-index: 1;
                }
                .logo-wrapper {
                    position: relative;
                    margin-bottom: 2rem;
                    animation: float 4s ease-in-out infinite;
                }
                .logo-img {
                    width: 120px;
                    height: 120px;
                    object-fit: contain;
                    filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3));
                }
                .wifi-badge {
                    position: absolute;
                    bottom: 0px;
                    right: 0px;
                    background: #ef4444;
                    border: 3.5px solid #022c22;
                    border-radius: 50%;
                    width: 38px;
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulseGlow 2s infinite ease-in-out;
                }
                .offline-title {
                    font-size: 2.25rem;
                    font-weight: 800;
                    margin-bottom: 0.75rem;
                    background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: -0.025em;
                }
                .offline-desc {
                    font-size: 1.05rem;
                    color: #a7f3d0;
                    opacity: 0.85;
                    margin-bottom: 2.5rem;
                    line-height: 1.6;
                    max-width: 340px;
                }
                .retry-btn {
                    padding: 0.875rem 3rem;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: #ffffff;
                    border: none;
                    border-radius: 10px;
                    font-size: 1.05rem;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .retry-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.45);
                    background: linear-gradient(135deg, #34d399 0%, #059669 100%);
                }
                .retry-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                }
            ` }} />
            
            <div className="offline-card">
                <div className="logo-wrapper">
                    <img 
                        src="/logo.png" 
                        alt="Barangay Logo" 
                        className="logo-img"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                        }}
                    />
                    <div className="wifi-badge" title="No Internet Connection">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5" />
                            <path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39" />
                            <path d="M10.71 5.05A16 16 0 0 1 22.5 8" />
                            <path d="M1.5 8a15.91 15.91 0 0 1 7.79-2.95" />
                            <path d="M12 20h.01" />
                        </svg>
                    </div>
                </div>
                
                <h1 className="offline-title">
                    You are Offline
                </h1>
                
                <p className="offline-desc">
                    It looks like you've lost your internet connection. Please check your network settings and try again.
                </p>
                
                <button 
                    onClick={() => window.location.reload()}
                    className="retry-btn"
                >
                    Try Again
                </button>
            </div>
        </div>
    )
}
