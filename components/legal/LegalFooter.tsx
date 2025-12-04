'use client'

import Link from 'next/link'
import { CookieSettingsButton } from './CookieBanner'
import './legal.css'

export function LegalFooter() {
    return (
        <footer className="legal-footer">
            <div className="legal-footer-content">
                <div className="legal-footer-brand">
                    <span className="legal-footer-logo">📖</span>
                    <span className="legal-footer-name">Enciclopedia della Vita</span>
                </div>
                <div className="legal-footer-links">
                    <Link href="/privacy-policy" className="legal-footer-link">
                        Privacy Policy
                    </Link>
                    <Link href="/termini-condizioni" className="legal-footer-link">
                        Termini e Condizioni
                    </Link>
                    <Link href="/cookie-policy" className="legal-footer-link">
                        Cookie Policy
                    </Link>
                    <CookieSettingsButton />
                </div>
                <div className="legal-footer-copy">
                    <p>© {new Date().getFullYear()} Elias Rizzo. Tutti i diritti riservati.</p>
                    <p className="legal-footer-disclaimer">
                        NUR è un&apos;intelligenza artificiale. Non sostituisce consulenza professionale.
                    </p>
                </div>
            </div>
        </footer>
    )
}
