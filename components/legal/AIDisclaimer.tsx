'use client'

import { useState, useEffect } from 'react'
import './legal.css'

// Primo messaggio di NUR che include il disclaimer
export const NUR_FIRST_MESSAGE = `Ciao!

Sono **NUR**, l'assistente virtuale di Enciclopedia della Vita.

Sono un sistema di **intelligenza artificiale** — non un essere umano.

**Non sono** una psicologa, un medico, un avvocato o un consulente finanziario.

Se stai vivendo un momento di crisi: **Telefono Amico**: 02 2327 2327 | **Emergenze**: 112

Come posso aiutarti oggi?`

// Componente disclaimer visivo (modale)
export function AIDisclaimer({ onAccept }: { onAccept: () => void }) {
    return (
        <div className="ai-disclaimer-overlay">
            <div className="ai-disclaimer-modal">
                <div className="ai-disclaimer-header">
                    <div className="ai-disclaimer-avatar">💜</div>
                    <div className="ai-disclaimer-title">
                        <h2>Ciao, sono NUR!</h2>
                        <p>Assistente AI di Enciclopedia della Vita</p>
                    </div>
                </div>

                <div className="ai-disclaimer-content">
                    <div className="ai-disclaimer-box ai-disclaimer-info">
                        <p>
                            Sono un <strong>sistema di intelligenza artificiale</strong>, non un essere umano.
                        </p>
                    </div>
                    <div className="ai-disclaimer-box ai-disclaimer-warning">
                        <p>
                            <strong>Non sostituisco professionisti.</strong> Non sono psicologa, medico, avvocato o consulente.
                        </p>
                    </div>
                    <div className="ai-disclaimer-box ai-disclaimer-emergency">
                        <p>
                            <strong>In caso di crisi:</strong> Telefono Amico 02 2327 2327 | Emergenze 112
                        </p>
                    </div>
                </div>

                <button onClick={onAccept} className="ai-disclaimer-accept">
                    Ho capito, iniziamo!
                </button>
            </div>
        </div>
    )
}

// Hook per gestire visualizzazione del disclaimer
export function useAIDisclaimer() {
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [hasAccepted, setHasAccepted] = useState(true) // default true per evitare flash
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const accepted = sessionStorage.getItem('nur_ai_disclaimer_accepted')
        if (!accepted) {
            setShowDisclaimer(true)
            setHasAccepted(false)
        } else {
            setHasAccepted(true)
        }
        setIsLoading(false)
    }, [])

    const acceptDisclaimer = () => {
        sessionStorage.setItem('nur_ai_disclaimer_accepted', 'true')
        setShowDisclaimer(false)
        setHasAccepted(true)
    }

    return { showDisclaimer, hasAccepted, acceptDisclaimer, isLoading }
}
