'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import './home.css'

const areeVita = [
    { id: 'salute', nome: 'Salute', emoji: '💪', angle: 270, color: '#51cf66' },
    { id: 'soldi', nome: 'Soldi', emoji: '💰', angle: 210, color: '#ffd43b' },
    { id: 'lavoro', nome: 'Lavoro', emoji: '💼', angle: 150, color: '#ff922b' },
    { id: 'relazioni', nome: 'Relazioni', emoji: '❤️', angle: 30, color: '#ff6b6b' },
    { id: 'crescita', nome: 'Crescita', emoji: '📚', angle: 330, color: '#cc5de8' },
    { id: 'hobby', nome: 'Hobby', emoji: '🎨', angle: 90, color: '#22b8cf' },
    { id: 'casa', nome: 'Casa', emoji: '🏠', angle: 180, color: '#868e96' },
    { id: 'sociale', nome: 'Sociale', emoji: '👥', angle: 0, color: '#5c7cfa' },
    { id: 'spirituale', nome: 'Interiore', emoji: '🧘', angle: 240, color: '#845ef7' },
    { id: 'futuro', nome: 'Futuro', emoji: '🎯', angle: 300, color: '#f783ac' },
]

export default function HomePage() {
    const { isSignedIn, user, isLoaded } = useUser()
    const [mounted, setMounted] = useState(false)
    const [greeting, setGreeting] = useState('')
    const [hoveredArea, setHoveredArea] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Buongiorno')
        else if (hour < 18) setGreeting('Buon pomeriggio')
        else setGreeting('Buonasera')
    }, [])

    const getPositionOnCircle = (angle: number, radius: number) => {
        const radian = (angle * Math.PI) / 180
        return {
            x: Math.cos(radian) * radius,
            y: Math.sin(radian) * radius
        }
    }

    if (!mounted) return null

    // Se non loggato, mostra landing
    if (!isSignedIn) {
        return (
            <div className="landing-container">
                <div className="bg-gradient"></div>
                <div className="stars"></div>
                
                <header className="landing-header">
                    <div className="logo-section">
                        <span className="logo-icon">🌌</span>
                        <span className="logo-text">Enciclopedia della Vita</span>
                    </div>
                    <div className="auth-buttons">
                        <SignInButton mode="modal">
                            <button className="btn-ghost">Accedi</button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className="btn-primary">Inizia il Viaggio</button>
                        </SignUpButton>
                    </div>
                </header>

                <main className="landing-main">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <span className="pulse-dot"></span>
                            <span>Il tuo compagno di viaggio</span>
                        </div>
                        
                        <h1 className="hero-title">
                            Non un&apos;app.<br/>
                            <span className="gradient-text">Uno specchio della tua vita.</span>
                        </h1>
                        
                        <p className="hero-subtitle">
                            Un&apos;AI che ti vede, ti capisce, e ti accompagna 
                            mentre diventi chi vuoi essere.
                        </p>

                        <div className="hero-cta">
                            <SignUpButton mode="modal">
                                <button className="btn-primary btn-large">
                                    <span>Inizia Ora</span>
                                    <span className="btn-arrow">→</span>
                                </button>
                            </SignUpButton>
                            <p className="cta-note">Gratuito. Privato. Tuo.</p>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="planet-preview">
                            <div className="planet-core">
                                <span>TU</span>
                            </div>
                            {areeVita.slice(0, 6).map((area, i) => {
                                const pos = getPositionOnCircle(area.angle, 120)
                                return (
                                    <div 
                                        key={area.id}
                                        className="orbit-item"
                                        style={{
                                            transform: `translate(${pos.x}px, ${pos.y}px)`,
                                            animationDelay: `${i * 0.5}s`
                                        }}
                                    >
                                        <span className="orbit-emoji">{area.emoji}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </main>

                <section className="features-section">
                    <div className="feature-card">
                        <div className="feature-icon">🔮</div>
                        <h3>Vede i pattern</h3>
                        <p>Connette i puntini che tu non vedi. Sonno, energia, relazioni - tutto è collegato.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💬</div>
                        <h3>Parla con te</h3>
                        <p>Non comandi. Conversazioni vere che costruiscono la tua dashboard automaticamente.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🚀</div>
                        <h3>Ti sfida</h3>
                        <p>Non ti asseconda. Ti spinge a diventare la versione migliore di te stesso.</p>
                    </div>
                </section>
            </div>
        )
    }

    // Se loggato, mostra il pianeta personale
    const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Viaggiatore'

    return (
        <div className="universe-container">
            <div className="bg-gradient"></div>
            <div className="stars"></div>
            
            <header className="universe-header">
                <div className="logo-section">
                    <span className="logo-icon">🌌</span>
                    <span className="logo-text">La Tua Vita</span>
                </div>
                <div className="user-section">
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <main className="universe-main">
                <div className="greeting-section">
                    <h1 className="greeting">{greeting}, <span className="user-name">{userName}</span></h1>
                    <p className="greeting-sub">Come stai oggi?</p>
                </div>

                <div className="planet-container">
                    <div className="planet-center">
                        <div className="center-avatar">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="center-pulse"></div>
                    </div>

                    <div className="orbit-ring"></div>
                    
                    {areeVita.map((area) => {
                        const pos = getPositionOnCircle(area.angle, 180)
                        const isHovered = hoveredArea === area.id
                        
                        return (
                            <Link
                                key={area.id}
                                href={`/area/${area.id}`}
                                className={`area-node ${isHovered ? 'hovered' : ''}`}
                                style={{
                                    transform: `translate(${pos.x}px, ${pos.y}px) scale(${isHovered ? 1.2 : 1})`,
                                    '--area-color': area.color
                                } as React.CSSProperties}
                                onMouseEnter={() => setHoveredArea(area.id)}
                                onMouseLeave={() => setHoveredArea(null)}
                            >
                                <div className="node-glow"></div>
                                <div className="node-content">
                                    <span className="node-emoji">{area.emoji}</span>
                                </div>
                                <div className="node-label">{area.nome}</div>
                            </Link>
                        )
                    })}
                </div>

                <div className="quick-insight">
                    <div className="insight-icon">💡</div>
                    <p className="insight-text">
                        Clicca su un&apos;area per esplorare il tuo viaggio. Sono qui per accompagnarti.
                    </p>
                </div>
            </main>

            <Link href="/chat" className="chat-fab">
                <span className="fab-icon">💬</span>
                <span className="fab-pulse"></span>
            </Link>
        </div>
    )
}
