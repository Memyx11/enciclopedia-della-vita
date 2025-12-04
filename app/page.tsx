'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SignInButton, SignUpButton, SignOutButton, useUser } from '@clerk/nextjs'
import './home.css'

export default function HomePage() {
    const { isSignedIn, user } = useUser()
    const [mounted, setMounted] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => { setMounted(true) }, [])

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            window.location.href = `/chat?q=${encodeURIComponent(searchQuery)}`
        }
    }

    if (!mounted) return null

    const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Utente'

    return (
        <>
            <div className="bg-gradient"></div>
            
            <header>
                <div className="header-content">
                    <Link href="/" className="logo">📖 Enciclopedia della Vita</Link>
                    <div className="nav-buttons">
                        {isSignedIn ? (
                            <>
                                <span style={{color: 'var(--text-muted)'}}>👤 {userName}</span>
                                <Link href="/la-mia-vita" className="btn btn-primary">La Mia Vita</Link>
                                <SignOutButton>
                                    <button className="btn btn-ghost">Esci</button>
                                </SignOutButton>
                            </>
                        ) : (
                            <>
                                <SignInButton mode="modal">
                                    <button className="btn btn-ghost">Accedi</button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="btn btn-primary">Registrati</button>
                                </SignUpButton>
                            </>
                        )}
                    </div>
                </div>
            </header>
            
            <nav>
                <div className="nav-content">
                    <div className="nav-item">
                        Sopravvivenza Base
                        <div className="dropdown">
                            <div className="dropdown-section">
                                <div className="dropdown-title">Salute Fisica</div>
                                <Link href="/area/salute" className="dropdown-item">Alimentazione</Link>
                                <Link href="/area/salute" className="dropdown-item">Sonno</Link>
                                <Link href="/area/salute" className="dropdown-item">Movimento</Link>
                            </div>
                            <div className="dropdown-section">
                                <div className="dropdown-title">Soldi & Lavoro</div>
                                <Link href="/area/soldi" className="dropdown-item">Guadagnare</Link>
                                <Link href="/area/soldi" className="dropdown-item">Gestire</Link>
                            </div>
                            <div className="dropdown-section">
                                <div className="dropdown-title">Casa & Sicurezza</div>
                                <Link href="/area/casa" className="dropdown-item">Abitare</Link>
                                <Link href="/area/casa" className="dropdown-item">Manutenzione</Link>
                            </div>
                        </div>
                    </div>
                    <div className="nav-item">
                        Cibo
                        <div className="dropdown">
                            <div className="dropdown-section">
                                <div className="dropdown-title">Ricette Base</div>
                                <Link href="/enciclopedia/cibo" className="dropdown-item">5 minuti</Link>
                                <Link href="/enciclopedia/cibo" className="dropdown-item">15 minuti</Link>
                            </div>
                            <div className="dropdown-section">
                                <div className="dropdown-title">Per Budget</div>
                                <Link href="/enciclopedia/cibo" className="dropdown-item">Meno di 2€</Link>
                            </div>
                        </div>
                    </div>
                    <div className="nav-item">
                        Quotidiano
                        <div className="dropdown">
                            <div className="dropdown-section">
                                <div className="dropdown-title">Routine</div>
                                <Link href="/area/crescita" className="dropdown-item">Mattina Efficace</Link>
                                <Link href="/area/crescita" className="dropdown-item">Produttività</Link>
                            </div>
                            <div className="dropdown-section">
                                <div className="dropdown-title">Relazioni</div>
                                <Link href="/area/relazioni" className="dropdown-item">Famiglia</Link>
                                <Link href="/area/relazioni" className="dropdown-item">Amore & Coppia</Link>
                            </div>
                        </div>
                    </div>
                    <div className="nav-item">Sport & Abilità</div>
                    <div className="nav-item">Conoscenza</div>
                    <div className="nav-item">Spiritualità</div>
                </div>
            </nav>
            
            <section className="hero">
                <div className="hero-badge">
                    <span>✨</span>
                    <span>Coach AI Personale</span>
                </div>
                <h1>Tutto quello che ti serve<br/>per vivere meglio</h1>
                <p>Conoscenza pratica, verificata e organizzata per priorità. Dalla sopravvivenza quotidiana alla crescita personale.</p>
                
                <div className="search-box">
                    <input 
                        type="text" 
                        placeholder="Cerca qualsiasi cosa... (es. pasta, come dormire meglio, trovare lavoro)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleSearch}
                    />
                </div>
                
                <div className="hero-cta">
                    <Link href="/chat" className="btn btn-primary">💬 Parla con il Coach AI</Link>
                    <Link href="/la-mia-vita" className="btn btn-ghost">📊 La Mia Dashboard</Link>
                </div>
            </section>
            
            <div className="main-content">
                <div className="priority-section">
                    <span className="priority-label">PRIORITÀ MASSIMA</span>
                    <h2 className="section-title">Bisogni Fondamentali</h2>
                    <p className="section-description">Le basi per sopravvivere e funzionare ogni giorno. Parti da qui se non sai da dove iniziare.</p>
                    
                    <div className="cards-grid">
                        <div className="card">
                            <h3 className="card-title">Salute Fisica</h3>
                            <ul className="card-items">
                                <li><Link href="/area/salute">Cosa mangiare davvero</Link></li>
                                <li><Link href="/area/salute">Come dormire bene</Link></li>
                                <li><Link href="/area/salute">Movimento minimo vitale</Link></li>
                                <li><Link href="/area/salute">Igiene essenziale</Link></li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="card-title">Soldi & Lavoro</h3>
                            <ul className="card-items">
                                <li><Link href="/area/soldi">Trovare e mantenere lavoro</Link></li>
                                <li><Link href="/area/soldi">Gestire budget</Link></li>
                                <li><Link href="/area/soldi">Risparmiare efficacemente</Link></li>
                                <li><Link href="/area/soldi">Emergenze economiche</Link></li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="card-title">Casa & Sicurezza</h3>
                            <ul className="card-items">
                                <li><Link href="/area/casa">Affitto vs Mutuo</Link></li>
                                <li><Link href="/area/casa">Riparazioni base</Link></li>
                                <li><Link href="/area/casa">Sicurezza personale</Link></li>
                                <li><Link href="/area/casa">Convivenza sana</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div className="priority-section">
                    <span className="priority-label">ALTA PRIORITÀ</span>
                    <h2 className="section-title">Cibo - Ricette & Nutrizione</h2>
                    <p className="section-description">Mangiare bene con poco tempo e pochi soldi. Ricette testate, non teoria.</p>
                    
                    <div className="cards-grid">
                        <div className="card">
                            <h3 className="card-title">Per Tempo</h3>
                            <ul className="card-items">
                                <li><Link href="/enciclopedia/cibo">5 minuti - Emergenze</Link></li>
                                <li><Link href="/enciclopedia/cibo">15 minuti - Standard</Link></li>
                                <li><Link href="/enciclopedia/cibo">30 minuti - Quando hai tempo</Link></li>
                                <li>1 ora+ - Weekend</li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="card-title">Per Budget</h3>
                            <ul className="card-items">
                                <li><Link href="/enciclopedia/cibo">Meno di 2€ a pasto</Link></li>
                                <li><Link href="/enciclopedia/cibo">2-5€ - Bilanciato</Link></li>
                                <li>5-10€ - Lusso accessibile</li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="card-title">Cucina Pratica</h3>
                            <ul className="card-items">
                                <li>Spesa settimanale intelligente</li>
                                <li>Meal prep domenicale</li>
                                <li>Conservare senza sprechi</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div className="priority-section">
                    <span className="priority-label">QUOTIDIANO</span>
                    <h2 className="section-title">Routine & Relazioni</h2>
                    <p className="section-description">Ottimizza la tua giornata e le tue connessioni.</p>
                    
                    <div className="cards-grid">
                        <div className="card">
                            <h3 className="card-title">Routine</h3>
                            <ul className="card-items">
                                <li><Link href="/area/crescita">Mattina Efficace</Link></li>
                                <li><Link href="/area/crescita">Produttività</Link></li>
                                <li>Sera Rilassante</li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="card-title">Relazioni</h3>
                            <ul className="card-items">
                                <li><Link href="/area/relazioni">Famiglia</Link></li>
                                <li><Link href="/area/relazioni">Amore & Coppia</Link></li>
                                <li>Amicizie</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <section className="cta-section">
                <div className="cta-box">
                    <h2>🤖 Il Tuo Coach AI</h2>
                    <p>Un assistente che analizza i tuoi dati e ti dà consigli specifici. Non frasi generiche.</p>
                    <Link href="/chat" className="btn btn-primary">💬 Inizia una Conversazione</Link>
                </div>
            </section>
            
            <footer className="main-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <span className="footer-logo">📖</span>
                        <span className="footer-name">Enciclopedia della Vita</span>
                    </div>
                    <div className="footer-links">
                        <Link href="/privacy-policy">Privacy Policy</Link>
                        <Link href="/termini-condizioni">Termini e Condizioni</Link>
                        <Link href="/cookie-policy">Cookie Policy</Link>
                    </div>
                    <div className="footer-copy">
                        <p>© {new Date().getFullYear()} Elias Rizzo. Tutti i diritti riservati.</p>
                        <p className="footer-disclaimer">NUR è un&apos;intelligenza artificiale. Non sostituisce consulenza professionale.</p>
                    </div>
                </div>
            </footer>
        </>
    )
}

