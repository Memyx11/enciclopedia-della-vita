'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import './legal.css'

type CookiePreferences = {
    necessary: boolean
    analytics: boolean
}

export function CookieBanner() {
    const [showBanner, setShowBanner] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [preferences, setPreferences] = useState<CookiePreferences>({
        necessary: true,
        analytics: false,
    })

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent')
        if (!consent) {
            // Mostra dopo un breve delay per non disturbare il caricamento
            const timer = setTimeout(() => setShowBanner(true), 1000)
            return () => clearTimeout(timer)
        }
    }, [])

    const savePreferences = (prefs: CookiePreferences) => {
        localStorage.setItem('cookie_consent', JSON.stringify(prefs))
        localStorage.setItem('cookie_consent_date', new Date().toISOString())
        setPreferences(prefs)
        setShowBanner(false)
    }

    const acceptAll = () => savePreferences({ necessary: true, analytics: true })
    const rejectOptional = () => savePreferences({ necessary: true, analytics: false })

    if (!showBanner) return null

    return (
        <div className="cookie-banner">
            <div className="cookie-banner-content">
                {!showDetails ? (
                    <div className="cookie-banner-simple">
                        <p className="cookie-text">
                            Utilizziamo cookie tecnici necessari per il funzionamento del sito.{' '}
                            <button onClick={() => setShowDetails(true)} className="cookie-link">
                                Maggiori informazioni
                            </button>
                        </p>
                        <div className="cookie-buttons">
                            <button onClick={rejectOptional} className="cookie-btn cookie-btn-secondary">
                                Solo necessari
                            </button>
                            <button onClick={acceptAll} className="cookie-btn cookie-btn-primary">
                                Accetta tutti
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="cookie-banner-details">
                        <h3 className="cookie-title">Gestione Cookie</h3>
                        <div className="cookie-options">
                            <div className="cookie-option">
                                <div className="cookie-option-info">
                                    <p className="cookie-option-name">Cookie Tecnici (Necessari)</p>
                                    <p className="cookie-option-desc">Essenziali per login e funzionamento</p>
                                </div>
                                <span className="cookie-always-active">Sempre attivi</span>
                            </div>
                            <div className="cookie-option">
                                <div className="cookie-option-info">
                                    <p className="cookie-option-name">Cookie Analitici</p>
                                    <p className="cookie-option-desc">Ci aiutano a capire come usi il sito</p>
                                </div>
                                <label className="cookie-toggle">
                                    <input
                                        type="checkbox"
                                        checked={preferences.analytics}
                                        onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                                    />
                                    <span className="cookie-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        <div className="cookie-details-footer">
                            <Link href="/cookie-policy" className="cookie-link">
                                Cookie Policy completa
                            </Link>
                            <div className="cookie-buttons">
                                <button onClick={() => setShowDetails(false)} className="cookie-btn cookie-btn-secondary">
                                    Indietro
                                </button>
                                <button onClick={() => savePreferences(preferences)} className="cookie-btn cookie-btn-primary">
                                    Salva preferenze
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Bottone per footer - riapre il banner
export function CookieSettingsButton() {
    const reopenBanner = () => {
        localStorage.removeItem('cookie_consent')
        window.location.reload()
    }

    return (
        <button onClick={reopenBanner} className="cookie-settings-btn">
            Gestisci Cookie
        </button>
    )
}
