'use client'

import { useState } from 'react'
import Link from 'next/link'
import './legal.css'

type TermsAcceptanceProps = {
    onAcceptChange: (accepted: boolean) => void
    required?: boolean
}

export function TermsAcceptance({ onAcceptChange, required = true }: TermsAcceptanceProps) {
    const [accepted, setAccepted] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAccepted(e.target.checked)
        onAcceptChange(e.target.checked)
    }

    return (
        <div className="terms-acceptance">
            <label className="terms-checkbox-label">
                <input
                    type="checkbox"
                    checked={accepted}
                    onChange={handleChange}
                    required={required}
                    className="terms-checkbox"
                />
                <span className="terms-text">
                    Ho letto e accetto i{' '}
                    <Link href="/termini-condizioni" className="terms-link" target="_blank">
                        Termini e Condizioni
                    </Link>{' '}
                    e la{' '}
                    <Link href="/privacy-policy" className="terms-link" target="_blank">
                        Privacy Policy
                    </Link>
                    <span className="terms-required">*</span>
                </span>
            </label>
            <div className="terms-details">
                <p>✓ Comprendo che NUR è un&apos;intelligenza artificiale</p>
                <p>✓ Comprendo che NUR non sostituisce consulenza professionale</p>
                <p>✓ Ho almeno 14 anni</p>
            </div>
        </div>
    )
}
