'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieBanner() {
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent')
        if (!consent) {
            setShowBanner(true)
        }
    }, [])

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'accepted')
        setShowBanner(false)
    }

    const declineCookies = () => {
        localStorage.setItem('cookie-consent', 'declined')
        setShowBanner(false)
    }

    if (!showBanner) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(13, 13, 21, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
        }}>
            <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.8)',
                textAlign: 'center',
                flex: 1,
                minWidth: '200px'
            }}>
                Utilizziamo cookie tecnici essenziali.{' '}
                <Link href="/cookie-policy" style={{ color: '#9F7AEA', textDecoration: 'underline' }}>
                    Leggi la policy
                </Link>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={declineCookies}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    Rifiuta
                </button>
                <button
                    onClick={acceptCookies}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #6B46C1, #9F7AEA)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500
                    }}
                >
                    Accetta
                </button>
            </div>
        </div>
    )
}
