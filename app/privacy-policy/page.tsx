import Link from 'next/link'
import '@/components/legal/legal.css'

export const metadata = {
    title: 'Privacy Policy | Enciclopedia della Vita',
    description: 'Informativa sulla privacy e trattamento dati personali di Enciclopedia della Vita e NUR AI Coach.'
}

export default function PrivacyPolicyPage() {
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
                <h1 className="legal-page-title">Privacy Policy</h1>
                <p className="legal-page-subtitle">Ultimo aggiornamento: Dicembre 2024</p>

                <section className="legal-section">
                    <h2>1. Titolare del Trattamento</h2>
                    <p>Il Titolare del trattamento dei dati personali è:</p>
                    <div className="legal-highlight">
                        <p><strong>Elias Rizzo</strong></p>
                        <p>Sede: Genova, Italia</p>
                        <p>Email: <a href="mailto:support@enciclopediadellavita.it">support@enciclopediadellavita.it</a></p>
                        <p>Sito web: enciclopediadellavita.vercel.app</p>
                    </div>
                    <p>Professionista ai sensi della Legge 14 gennaio 2013, n. 4.</p>
                </section>

                <section className="legal-section">
                    <h2>2. Tipologie di Dati Raccolti</h2>

                    <h3>2.1 Dati forniti volontariamente dall&apos;utente</h3>
                    <ul>
                        <li><strong>Dati di registrazione</strong>: nome, indirizzo email, password (criptata)</li>
                        <li><strong>Dati di profilo</strong>: età, preferenze di comunicazione, aree di vita selezionate</li>
                        <li><strong>Contenuto delle conversazioni</strong>: messaggi scambiati con NUR</li>
                    </ul>

                    <h3>2.2 Dati raccolti automaticamente</h3>
                    <ul>
                        <li><strong>Dati tecnici</strong>: indirizzo IP (anonimizzato), tipo di browser, sistema operativo</li>
                        <li><strong>Dati di utilizzo</strong>: data e ora di accesso, pagine visitate, durata delle sessioni</li>
                        <li><strong>Cookie tecnici</strong>: necessari per il funzionamento del servizio</li>
                    </ul>

                    <h3>2.3 Dati NON raccolti</h3>
                    <p>Non raccogliamo:</p>
                    <ul>
                        <li>Dati sanitari o medici sensibili</li>
                        <li>Dati biometrici</li>
                        <li>Dati relativi all&apos;orientamento sessuale, religione, opinioni politiche</li>
                        <li>Dati di minori sotto i 14 anni senza consenso genitoriale</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>3. Finalità del Trattamento</h2>
                    <table className="legal-table">
                        <thead>
                            <tr>
                                <th>Finalità</th>
                                <th>Base giuridica</th>
                                <th>Conservazione</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Erogazione del servizio NUR</td>
                                <td>Esecuzione contratto</td>
                                <td>Durata del rapporto + 10 anni</td>
                            </tr>
                            <tr>
                                <td>Personalizzazione esperienza</td>
                                <td>Esecuzione contratto</td>
                                <td>Durata del rapporto</td>
                            </tr>
                            <tr>
                                <td>Miglioramento del servizio</td>
                                <td>Legittimo interesse</td>
                                <td>24 mesi (dati aggregati)</td>
                            </tr>
                            <tr>
                                <td>Comunicazioni di servizio</td>
                                <td>Esecuzione contratto</td>
                                <td>Durata del rapporto</td>
                            </tr>
                            <tr>
                                <td>Adempimenti legali</td>
                                <td>Obbligo di legge</td>
                                <td>Termini di legge</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section className="legal-section">
                    <h2>4. Intelligenza Artificiale e Trattamento Dati</h2>

                    <h3>4.1 Funzionamento di NUR</h3>
                    <p>NUR è un sistema di intelligenza artificiale basato su modelli linguistici (LLM) forniti da Anthropic (Claude AI).</p>

                    <div className="legal-warning">
                        <p><strong>Importante:</strong></p>
                        <ul>
                            <li>NUR NON è un professionista sanitario, psicologo o terapeuta</li>
                            <li>NUR NON fornisce diagnosi o prescrizioni mediche</li>
                            <li>NUR NON sostituisce consulenza legale, finanziaria o medica professionale</li>
                            <li>Le conversazioni con NUR hanno scopo esclusivamente di supporto al benessere personale</li>
                        </ul>
                    </div>

                    <h3>4.2 Memoria e apprendimento</h3>
                    <p>NUR utilizza un sistema di memoria per:</p>
                    <ul>
                        <li>Ricordare le conversazioni precedenti con l&apos;utente</li>
                        <li>Personalizzare le risposte in base al contesto</li>
                        <li>Tracciare i progressi nelle aree di vita selezionate</li>
                    </ul>

                    <p><strong>I dati delle conversazioni:</strong></p>
                    <ul>
                        <li>Sono conservati in modo sicuro su server EU (Supabase)</li>
                        <li>Sono associati esclusivamente al tuo account</li>
                        <li>Non vengono condivisi con altri utenti</li>
                        <li>Non vengono utilizzati per addestrare modelli AI di terze parti</li>
                        <li>Possono essere eliminati su tua richiesta</li>
                    </ul>

                    <h3>4.3 Trasferimento dati a terze parti</h3>
                    <p>Per l&apos;elaborazione delle risposte, i messaggi vengono inviati ad Anthropic (USA) per l&apos;elaborazione tramite Claude AI. Anthropic:</p>
                    <ul>
                        <li>Non conserva i dati delle conversazioni oltre il necessario</li>
                        <li>Non utilizza i dati per addestrare i propri modelli</li>
                        <li>Rispetta le Clausole Contrattuali Standard UE per il trasferimento dati extra-UE</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>5. Destinatari dei Dati</h2>
                    <table className="legal-table">
                        <thead>
                            <tr>
                                <th>Destinatario</th>
                                <th>Scopo</th>
                                <th>Localizzazione</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Anthropic</td>
                                <td>Elaborazione AI</td>
                                <td>USA (SCC)</td>
                            </tr>
                            <tr>
                                <td>Supabase</td>
                                <td>Database e hosting</td>
                                <td>EU</td>
                            </tr>
                            <tr>
                                <td>Vercel</td>
                                <td>Hosting applicazione</td>
                                <td>EU/USA</td>
                            </tr>
                            <tr>
                                <td>Clerk</td>
                                <td>Autenticazione</td>
                                <td>USA (SCC)</td>
                            </tr>
                        </tbody>
                    </table>
                    <p>Non vendiamo, affittiamo o condividiamo i tuoi dati personali con terze parti per scopi di marketing.</p>
                </section>

                <section className="legal-section">
                    <h2>6. Conservazione dei Dati</h2>
                    <table className="legal-table">
                        <thead>
                            <tr>
                                <th>Tipo di dato</th>
                                <th>Periodo di conservazione</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Dati account</td>
                                <td>Fino a cancellazione account + 30 giorni</td>
                            </tr>
                            <tr>
                                <td>Conversazioni</td>
                                <td>Fino a cancellazione account</td>
                            </tr>
                            <tr>
                                <td>Dati di fatturazione</td>
                                <td>10 anni (obbligo fiscale)</td>
                            </tr>
                            <tr>
                                <td>Log tecnici</td>
                                <td>12 mesi</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section className="legal-section">
                    <h2>7. Diritti dell&apos;Interessato</h2>
                    <p>Ai sensi del GDPR, hai diritto di:</p>
                    <ol>
                        <li><strong>Accesso</strong> — Ottenere conferma del trattamento e copia dei tuoi dati</li>
                        <li><strong>Rettifica</strong> — Correggere dati inesatti o incompleti</li>
                        <li><strong>Cancellazione</strong> — Richiedere la cancellazione dei tuoi dati (&quot;diritto all&apos;oblio&quot;)</li>
                        <li><strong>Limitazione</strong> — Limitare il trattamento in determinati casi</li>
                        <li><strong>Portabilità</strong> — Ricevere i tuoi dati in formato strutturato</li>
                        <li><strong>Opposizione</strong> — Opporti al trattamento per legittimo interesse</li>
                        <li><strong>Revoca consenso</strong> — Revocare il consenso in qualsiasi momento</li>
                    </ol>

                    <h3>Come esercitare i tuoi diritti</h3>
                    <p>Invia una richiesta a: <a href="mailto:support@enciclopediadellavita.it">support@enciclopediadellavita.it</a></p>
                    <p>Risponderemo entro 30 giorni.</p>

                    <h3>Reclamo all&apos;Autorità</h3>
                    <p>Hai diritto di proporre reclamo al Garante per la Protezione dei Dati Personali:</p>
                    <ul>
                        <li>Sito: <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a></li>
                        <li>Email: protocollo@gpdp.it</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>8. Sicurezza dei Dati</h2>
                    <p>Adottiamo misure tecniche e organizzative per proteggere i tuoi dati:</p>
                    <ul>
                        <li><strong>Crittografia</strong>: HTTPS/TLS per tutte le comunicazioni</li>
                        <li><strong>Password</strong>: Hash con algoritmi sicuri (bcrypt)</li>
                        <li><strong>Accesso</strong>: Autenticazione multi-fattore disponibile</li>
                        <li><strong>Database</strong>: Accesso limitato e monitorato</li>
                        <li><strong>Backup</strong>: Backup regolari crittografati</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>9. Minori</h2>
                    <p>Il servizio è destinato a utenti di almeno 14 anni.</p>
                    <p>Gli utenti tra 14 e 18 anni devono avere il consenso di un genitore o tutore legale.</p>
                    <p>Non raccogliamo consapevolmente dati di minori di 14 anni.</p>
                </section>

                <section className="legal-section">
                    <h2>10. Modifiche alla Privacy Policy</h2>
                    <p>Ci riserviamo di modificare questa Privacy Policy. In caso di modifiche sostanziali:</p>
                    <ul>
                        <li>Ti informeremo via email</li>
                        <li>Pubblicheremo un avviso sul sito</li>
                        <li>Aggiorneremo la data &quot;Ultimo aggiornamento&quot;</li>
                    </ul>
                </section>

                <div className="legal-contact">
                    <h3>Contatti</h3>
                    <p>Per qualsiasi domanda relativa alla privacy:</p>
                    <p><strong>Email:</strong> <a href="mailto:support@enciclopediadellavita.it">support@enciclopediadellavita.it</a></p>
                </div>

                <p style={{ marginTop: '40px', fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    Documento redatto in conformità al Regolamento UE 2016/679 (GDPR) e alla normativa italiana vigente.
                </p>
            </main>
        </div>
    )
}
