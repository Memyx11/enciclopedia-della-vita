import Link from 'next/link'
import '@/components/legal/legal.css'

export const metadata = {
    title: 'Cookie Policy | Enciclopedia della Vita',
    description: 'Informativa sui cookie utilizzati da Enciclopedia della Vita e NUR AI Coach.'
}

export default function CookiePolicyPage() {
    return (
        <div className="legal-page">
            <header className="legal-page-header">
                <div className="legal-page-header-content">
                    <Link href="/" className="legal-back-link">
                        ← Torna alla Home
                    </Link>
                    <Link href="/" className="legal-footer-brand">
                        <span className="legal-footer-logo">📖</span>
                        <span className="legal-footer-name">Enciclopedia della Vita</span>
                    </Link>
                </div>
            </header>

            <main className="legal-page-content">
                <h1 className="legal-page-title">Cookie Policy</h1>
                <p className="legal-page-subtitle">Ultimo aggiornamento: Dicembre 2024</p>

                <section className="legal-section">
                    <h2>1. Cosa sono i Cookie</h2>
                    <p>I cookie sono piccoli file di testo che i siti web salvano sul tuo dispositivo quando li visiti. Servono a ricordare le tue preferenze, mantenerti connesso e migliorare la tua esperienza.</p>
                </section>

                <section className="legal-section">
                    <h2>2. Cookie che Utilizziamo</h2>

                    <h3>2.1 Cookie Tecnici (Necessari) — SEMPRE ATTIVI</h3>
                    <p>Questi cookie sono essenziali per il funzionamento del sito. Non richiedono consenso.</p>
                    <table className="legal-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Fornitore</th>
                                <th>Scopo</th>
                                <th>Durata</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>__clerk_*</td>
                                <td>Clerk</td>
                                <td>Autenticazione e sessione utente</td>
                                <td>Sessione</td>
                            </tr>
                            <tr>
                                <td>sb-access-token</td>
                                <td>Supabase</td>
                                <td>Token accesso database</td>
                                <td>1 ora</td>
                            </tr>
                            <tr>
                                <td>sb-refresh-token</td>
                                <td>Supabase</td>
                                <td>Rinnovo sessione</td>
                                <td>7 giorni</td>
                            </tr>
                            <tr>
                                <td>cookie_consent</td>
                                <td>Enciclopedia della Vita</td>
                                <td>Ricorda le tue preferenze cookie</td>
                                <td>1 anno</td>
                            </tr>
                        </tbody>
                    </table>

                    <h3>2.2 Cookie Analitici (Opzionali) — RICHIEDONO CONSENSO</h3>
                    <p>Se attivati, ci aiutano a capire come gli utenti usano il sito.</p>
                    <div className="legal-highlight">
                        <p><strong>Nota:</strong> Al momento non utilizziamo cookie analitici. Se dovessimo introdurli, aggiorneremo questa policy e chiederemo il tuo consenso.</p>
                    </div>
                </section>

                <section className="legal-section">
                    <h2>3. Come Gestiamo i Cookie</h2>

                    <h3>3.1 Banner Cookie</h3>
                    <p>Al primo accesso, ti mostriamo un banner che ti permette di:</p>
                    <ul>
                        <li><strong>Accettare tutti</strong> i cookie</li>
                        <li><strong>Rifiutare</strong> i cookie non necessari</li>
                        <li><strong>Personalizzare</strong> le tue preferenze</li>
                    </ul>

                    <h3>3.2 Modificare le preferenze</h3>
                    <p>Puoi modificare le tue preferenze in qualsiasi momento cliccando su &quot;Gestisci Cookie&quot; nel footer del sito.</p>
                </section>

                <section className="legal-section">
                    <h2>4. Come Disabilitare i Cookie dal Browser</h2>
                    <p>Puoi gestire i cookie anche dalle impostazioni del tuo browser:</p>
                    <ul>
                        <li><strong>Chrome</strong>: Impostazioni → Privacy e sicurezza → Cookie</li>
                        <li><strong>Firefox</strong>: Impostazioni → Privacy e sicurezza → Cookie</li>
                        <li><strong>Safari</strong>: Preferenze → Privacy → Gestisci dati siti web</li>
                        <li><strong>Edge</strong>: Impostazioni → Cookie e autorizzazioni sito</li>
                    </ul>
                    <div className="legal-warning">
                        <p><strong>Attenzione:</strong> Disabilitare i cookie tecnici potrebbe impedire il funzionamento del sito.</p>
                    </div>
                </section>

                <section className="legal-section">
                    <h2>5. Cookie e GDPR</h2>
                    <p>In conformità al GDPR e alla Direttiva ePrivacy:</p>
                    <ul>
                        <li>I cookie tecnici non richiedono consenso</li>
                        <li>I cookie analitici/profilazione richiedono consenso esplicito</li>
                        <li>Puoi revocare il consenso in qualsiasi momento</li>
                        <li>Il rifiuto dei cookie opzionali non pregiudica l&apos;uso del servizio</li>
                    </ul>
                </section>

                <div className="legal-contact">
                    <h3>Contatti</h3>
                    <p>Per domande sui cookie:</p>
                    <p><strong>Email:</strong> <a href="mailto:support@enciclopediadellavita.it">support@enciclopediadellavita.it</a></p>
                </div>

                <p style={{ marginTop: '40px', fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    Policy conforme al GDPR (Reg. UE 2016/679) e alla Direttiva ePrivacy 2002/58/CE.
                </p>
            </main>
        </div>
    )
}
