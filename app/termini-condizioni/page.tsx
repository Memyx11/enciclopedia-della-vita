import Link from 'next/link'
import '@/components/legal/legal.css'

export const metadata = {
    title: 'Termini e Condizioni | Enciclopedia della Vita',
    description: 'Termini e condizioni di utilizzo di Enciclopedia della Vita e NUR AI Coach.'
}

export default function TerminiCondizioniPage() {
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
                <h1 className="legal-page-title">Termini e Condizioni</h1>
                <p className="legal-page-subtitle">Ultimo aggiornamento: Dicembre 2024</p>

                <section className="legal-section">
                    <h2>1. Premesse e Definizioni</h2>

                    <h3>1.1 Identificazione del Fornitore</h3>
                    <p>Il servizio &quot;Enciclopedia della Vita&quot; e l&apos;assistente virtuale &quot;NUR&quot; sono forniti da:</p>
                    <div className="legal-highlight">
                        <p><strong>Elias Rizzo</strong></p>
                        <p>Sede: Genova, Italia</p>
                        <p>Email: <a href="mailto:support@enciclopediadellavita.it">support@enciclopediadellavita.it</a></p>
                    </div>
                    <p>Professionista ai sensi della Legge 14 gennaio 2013, n. 4.</p>

                    <h3>1.2 Definizioni</h3>
                    <ul>
                        <li><strong>&quot;Servizio&quot;</strong>: la piattaforma Enciclopedia della Vita e tutte le sue funzionalità</li>
                        <li><strong>&quot;NUR&quot;</strong>: l&apos;assistente virtuale basato su intelligenza artificiale</li>
                        <li><strong>&quot;Utente&quot;</strong>: qualsiasi persona fisica che utilizza il Servizio</li>
                        <li><strong>&quot;Contenuti&quot;</strong>: testi, conversazioni, dati e materiali presenti sulla piattaforma</li>
                        <li><strong>&quot;Account&quot;</strong>: l&apos;insieme di credenziali che identificano l&apos;Utente</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>2. Accettazione dei Termini</h2>

                    <h3>2.1 Vincolo contrattuale</h3>
                    <p>L&apos;utilizzo del Servizio implica l&apos;accettazione integrale dei presenti Termini e Condizioni e della Privacy Policy.</p>
                    <p>Se non accetti questi termini, non puoi utilizzare il Servizio.</p>

                    <h3>2.2 Modifiche ai termini</h3>
                    <p>Ci riserviamo il diritto di modificare questi Termini in qualsiasi momento. Le modifiche saranno comunicate via email e/o tramite avviso sul sito.</p>
                </section>

                <section className="legal-section">
                    <h2>3. Natura del Servizio</h2>

                    <h3>3.1 Descrizione</h3>
                    <p>Enciclopedia della Vita è una piattaforma digitale che offre:</p>
                    <ul>
                        <li>Conversazioni con NUR, un assistente virtuale basato su intelligenza artificiale</li>
                        <li>Strumenti di auto-riflessione e crescita personale</li>
                        <li>Tracciamento delle aree di vita personali</li>
                        <li>Contenuti informativi sul benessere personale</li>
                    </ul>

                    <h3>3.2 Dichiarazione AI (AI Act Compliance)</h3>
                    <div className="legal-warning">
                        <p><strong>⚠️ AVVISO IMPORTANTE</strong></p>
                        <p><strong>NUR È UN SISTEMA DI INTELLIGENZA ARTIFICIALE.</strong></p>
                        <p>In conformità al Regolamento UE 2024/1689 (AI Act), ti informiamo che:</p>
                        <ul>
                            <li>NUR è un software basato su modelli linguistici di grandi dimensioni (LLM)</li>
                            <li>NUR genera risposte in modo automatico tramite algoritmi di machine learning</li>
                            <li>NUR non è un essere umano e non possiede coscienza, emozioni o esperienze reali</li>
                            <li>Le risposte di NUR sono generate probabilisticamente e potrebbero contenere errori</li>
                        </ul>
                    </div>
                </section>

                <section className="legal-section">
                    <h2>4. Disclaimer e Limitazioni Fondamentali</h2>

                    <h3>4.1 NUR NON è un professionista sanitario</h3>
                    <div className="legal-warning">
                        <p><strong>⚠️ DISCLAIMER MEDICO E PSICOLOGICO</strong></p>
                        <p>NUR <strong>NON</strong> è:</p>
                        <ul>
                            <li>Uno psicologo</li>
                            <li>Uno psicoterapeuta</li>
                            <li>Un medico</li>
                            <li>Un professionista sanitario di qualsiasi tipo</li>
                        </ul>
                        <p>NUR <strong>NON</strong> fornisce:</p>
                        <ul>
                            <li>Diagnosi mediche o psicologiche</li>
                            <li>Prescrizioni di farmaci o terapie</li>
                            <li>Trattamenti per disturbi mentali</li>
                            <li>Consulenza clinica</li>
                        </ul>
                        <p><strong>Se stai vivendo una crisi di salute mentale, pensieri suicidi, autolesionismo o qualsiasi emergenza medica, contatta immediatamente:</strong></p>
                        <ul>
                            <li>Telefono Amico: 02 2327 2327</li>
                            <li>Telefono Azzurro: 19696</li>
                            <li>Emergenze: 112 o 118</li>
                        </ul>
                    </div>

                    <h3>4.2 NUR NON è un consulente professionale</h3>
                    <p>NUR <strong>NON</strong> fornisce:</p>
                    <ul>
                        <li>Consulenza legale (non è un avvocato)</li>
                        <li>Consulenza finanziaria o fiscale (non è un commercialista)</li>
                        <li>Consulenza nutrizionale medica (non è un dietologo)</li>
                        <li>Consulenza di investimento (non è un consulente finanziario)</li>
                    </ul>
                    <p>Le informazioni fornite da NUR hanno carattere <strong>esclusivamente generale e divulgativo</strong>.</p>

                    <h3>4.3 Limitazione di responsabilità</h3>
                    <p>Il Fornitore <strong>NON</strong> è responsabile per:</p>
                    <ol>
                        <li><strong>Decisioni dell&apos;Utente</strong>: Qualsiasi decisione presa dall&apos;Utente sulla base delle conversazioni con NUR è sotto la sua esclusiva responsabilità</li>
                        <li><strong>Accuratezza delle informazioni</strong>: NUR può generare informazioni inesatte, incomplete o non aggiornate</li>
                        <li><strong>Danni indiretti</strong>: Perdita di profitti, dati, opportunità o qualsiasi danno indiretto</li>
                        <li><strong>Interruzioni del servizio</strong>: Malfunzionamenti, interruzioni o indisponibilità temporanea</li>
                    </ol>

                    <h3>4.4 Esclusione di garanzie</h3>
                    <p>Il Servizio è fornito &quot;COSÌ COM&apos;È&quot; (as is) senza garanzie di alcun tipo.</p>
                </section>

                <section className="legal-section">
                    <h2>5. Requisiti di Accesso</h2>

                    <h3>5.1 Età minima</h3>
                    <p>Per utilizzare il Servizio devi avere almeno <strong>14 anni</strong>.</p>
                    <p>Gli utenti tra 14 e 18 anni devono avere il consenso di un genitore o tutore legale.</p>

                    <h3>5.2 Creazione account</h3>
                    <p>Per utilizzare il Servizio completo è necessario creare un account. Ti impegni a:</p>
                    <ul>
                        <li>Fornire informazioni veritiere e complete</li>
                        <li>Mantenere aggiornati i tuoi dati</li>
                        <li>Proteggere le tue credenziali di accesso</li>
                        <li>Non condividere il tuo account con altri</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Utilizzo del Servizio</h2>

                    <h3>6.1 Uso consentito</h3>
                    <p>Puoi utilizzare il Servizio per:</p>
                    <ul>
                        <li>Riflessione personale e crescita</li>
                        <li>Supporto motivazionale e organizzativo</li>
                        <li>Tracciamento obiettivi personali</li>
                        <li>Ottenere informazioni generali su vari argomenti</li>
                    </ul>

                    <h3>6.2 Uso vietato</h3>
                    <p>È vietato utilizzare il Servizio per:</p>
                    <ol>
                        <li><strong>Attività illegali</strong></li>
                        <li><strong>Contenuti dannosi</strong>: violenti, discriminatori, diffamatori</li>
                        <li><strong>Abuso del sistema</strong>: hackerare o sovraccaricare il sistema</li>
                        <li><strong>Impersonificazione</strong>: fingere di essere altre persone</li>
                        <li><strong>Spam</strong>: messaggi ripetitivi o automatizzati</li>
                        <li><strong>Reverse engineering</strong>: estrarre codice o prompt del sistema</li>
                        <li><strong>Rivendita</strong>: rivendere o sublicenziare il Servizio</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>7. Contenuti e Proprietà Intellettuale</h2>

                    <h3>7.1 Contenuti dell&apos;Utente</h3>
                    <p>Mantieni la proprietà dei contenuti che inserisci. Ci concedi una licenza per elaborare i tuoi messaggi tramite NUR e conservare le conversazioni.</p>

                    <h3>7.2 Proprietà del Fornitore</h3>
                    <p>Sono di nostra esclusiva proprietà:</p>
                    <ul>
                        <li>Il software, codice e algoritmi della piattaforma</li>
                        <li>Il nome &quot;Enciclopedia della Vita&quot; e &quot;NUR&quot;</li>
                        <li>Il design, grafica e interfaccia</li>
                        <li>I prompt e la personalità di NUR</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>8. Pagamenti e Abbonamenti</h2>

                    <h3>8.1 Servizio gratuito e premium</h3>
                    <p>Il Servizio può essere offerto in versione gratuita (con funzionalità limitate) e premium (a pagamento).</p>

                    <h3>8.2 Prezzi e pagamenti</h3>
                    <p>I prezzi sono indicati sul sito e includono IVA dove applicabile.</p>

                    <h3>8.3 Rinnovo e cancellazione</h3>
                    <p>Gli abbonamenti si rinnovano automaticamente. Puoi cancellare in qualsiasi momento dalle impostazioni account.</p>

                    <h3>8.4 Rimborsi</h3>
                    <p>Data la natura digitale del servizio, non sono previsti rimborsi dopo l&apos;attivazione, salvo quanto previsto dal Codice del Consumo per il diritto di recesso (14 giorni).</p>
                </section>

                <section className="legal-section">
                    <h2>9. Disponibilità del Servizio</h2>
                    <p>Non garantiamo che il Servizio sia sempre disponibile. Potrebbero verificarsi manutenzioni, guasti tecnici o problemi con fornitori terzi.</p>
                </section>

                <section className="legal-section">
                    <h2>10. Indennizzo</h2>
                    <p>L&apos;Utente si impegna a manlevare e tenere indenne il Fornitore da qualsiasi richiesta di risarcimento derivante da violazione dei presenti Termini.</p>
                </section>

                <section className="legal-section">
                    <h2>11. Legge Applicabile e Foro Competente</h2>

                    <h3>11.1 Legge applicabile</h3>
                    <p>I presenti Termini sono regolati dalla legge italiana e dal diritto dell&apos;Unione Europea.</p>

                    <h3>11.2 Foro competente</h3>
                    <ul>
                        <li><strong>Consumatori</strong>: Foro del luogo di residenza del consumatore</li>
                        <li><strong>Professionisti/Aziende</strong>: Foro di Genova</li>
                    </ul>

                    <h3>11.3 Risoluzione alternativa delle controversie</h3>
                    <p>Piattaforma ODR per la risoluzione online delle controversie: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p>
                </section>

                <section className="legal-section">
                    <h2>12. Dichiarazione di Accettazione</h2>
                    <p>Cliccando su &quot;Accetto&quot; o utilizzando il Servizio, dichiari di:</p>
                    <div className="legal-highlight">
                        <ul>
                            <li>✓ Aver letto e compreso i presenti Termini e Condizioni</li>
                            <li>✓ Aver letto e compreso la Privacy Policy</li>
                            <li>✓ Avere almeno 14 anni (o avere il consenso di un genitore/tutore)</li>
                            <li>✓ Comprendere che NUR è un&apos;intelligenza artificiale, non un professionista umano</li>
                            <li>✓ Comprendere che NUR non sostituisce consulenza medica, psicologica, legale o finanziaria</li>
                            <li>✓ Accettare le limitazioni di responsabilità sopra indicate</li>
                        </ul>
                    </div>
                </section>

                <div className="legal-contact">
                    <h3>Contatti</h3>
                    <p>Per qualsiasi domanda:</p>
                    <p><strong>Email:</strong> <a href="mailto:support@enciclopediadellavita.it">support@enciclopediadellavita.it</a></p>
                </div>

                <p style={{ marginTop: '40px', fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    Documento redatto in conformità al Codice Civile italiano, al Codice del Consumo (D.Lgs. 206/2005), al GDPR (Reg. UE 2016/679) e all&apos;AI Act (Reg. UE 2024/1689).
                </p>
            </main>
        </div>
    )
}
