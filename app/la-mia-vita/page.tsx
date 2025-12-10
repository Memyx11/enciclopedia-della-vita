'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import MissionHero from '@/components/mission/MissionHero'
import CurrentTask from '@/components/mission/CurrentTask'
import './la-mia-vita.css'

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

interface AreaProgress {
    id: string
    progress: number
}

export default function LaMiaVitaPage() {
    const { isSignedIn, user, isLoaded } = useUser()
    const [mounted, setMounted] = useState(false)
    const [greeting, setGreeting] = useState('')
    const [hoveredArea, setHoveredArea] = useState<string | null>(null)
    const [areasProgress, setAreasProgress] = useState<Record<string, number>>({})
    const [totalProgress, setTotalProgress] = useState(0)

    useEffect(() => {
        setMounted(true)
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Buongiorno')
        else if (hour < 18) setGreeting('Buon pomeriggio')
        else setGreeting('Buonasera')
    }, [])

    useEffect(() => {
        if (isLoaded && user) {
            loadProgress()
        }
    }, [isLoaded, user])

    const loadProgress = async () => {
        if (!user) return

        const { data } = await supabase
            .from('life_areas')
            .select('area_type, progress')
            .eq('clerk_user_id', user.id)

        if (data) {
            const progressMap: Record<string, number> = {}
            let total = 0
            data.forEach(area => {
                progressMap[area.area_type] = area.progress || 0
                total += area.progress || 0
            })
            setAreasProgress(progressMap)
            setTotalProgress(Math.round(total / 10))
        }
    }

    const getPositionOnCircle = (angle: number, radius: number) => {
        const radian = (angle * Math.PI) / 180
        return {
            x: Math.cos(radian) * radius,
            y: Math.sin(radian) * radius
        }
    }

    const getAreaOpacity = (areaId: string) => {
        const progress = areasProgress[areaId] || 0
        if (progress === 0) return 0.4
        if (progress < 50) return 0.7
        return 1
    }

    if (!mounted || !isLoaded) return null

    if (!isSignedIn) {
        return (
            <div className="universe-container">
                <div className="bg-gradient"></div>
                <div className="stars"></div>
                <div className="auth-prompt">
                    <h1>🌌 La Tua Vita</h1>
                    <p>Accedi per vedere il tuo universo personale</p>
                    <Link href="/" className="btn btn-primary">
                        Vai alla Home
                    </Link>
                </div>
            </div>
        )
    }

    const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Viaggiatore'

    return (
        <div className="universe-container">
            <div className="bg-gradient"></div>
            <div className="stars"></div>

            <header className="universe-header">
                <div className="logo-section">
                    <Link href="/" className="back-link">← Home</Link>
                </div>
                <div className="title-section">
                    <span className="logo-icon">🌌</span>
                    <span className="logo-text">La Mia Vita</span>
                </div>
                <div className="user-section">
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <main className="universe-main">
                {/* Saluto */}
                <div className="greeting-section">
                    <h1 className="greeting">{greeting}, <span className="user-name">{userName}</span></h1>
                    <p className="greeting-sub">Come stai oggi?</p>
                </div>

                {/* === SEZIONE MISSIONE (sopra i pianeti) === */}
                <section className="mission-section">
                    <MissionHero />
                    <CurrentTask />
                </section>

                {/* === SEZIONE PIANETI === */}
                <section className="planets-section">
                    {/* Progresso globale */}
                    <div className="global-progress">
                        <div className="progress-circle" style={{ '--progress': totalProgress } as React.CSSProperties}>
                            <span className="progress-value">{totalProgress}%</span>
                        </div>
                        <p className="progress-label">Completamento Vita</p>
                    </div>

                    {/* Orbita pianeti */}
                    <div className="planet-container">
                        <div className="planet-center">
                            <div className="center-avatar">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="center-pulse"></div>
                        </div>
                        <div className="orbit-ring"></div>

                        {areeVita.map((area) => {
                            const pos = getPositionOnCircle(area.angle, 140)
                            const isHovered = hoveredArea === area.id
                            const progress = areasProgress[area.id] || 0

                            return (
                                <Link
                                    key={area.id}
                                    href={`/area/${area.id}`}
                                    className={`area-node ${isHovered ? 'hovered' : ''}`}
                                    style={{
                                        transform: `translate(${pos.x}px, ${pos.y}px) scale(${isHovered ? 1.2 : 1})`,
                                        '--area-color': area.color,
                                        opacity: getAreaOpacity(area.id)
                                    } as React.CSSProperties}
                                    onMouseEnter={() => setHoveredArea(area.id)}
                                    onMouseLeave={() => setHoveredArea(null)}
                                >
                                    <div className="node-glow"></div>
                                    <div className="node-content">
                                        <span className="node-emoji">{area.emoji}</span>
                                        {progress > 0 && (
                                            <div className="node-progress-ring">
                                                <svg viewBox="0 0 36 36">
                                                    <path
                                                        d="M18 2.0845
                                                        a 15.9155 15.9155 0 0 1 0 31.831
                                                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        fill="none"
                                                        stroke={area.color}
                                                        strokeWidth="2"
                                                        strokeDasharray={`${progress}, 100`}
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="node-label">
                                        {area.nome}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </section>

                {/* Quick actions */}
                <div className="quick-actions">
                    <Link href="/chat" className="action-btn primary">
                        💬 Parla con NUR
                    </Link>
                    <Link href="/obiettivi" className="action-btn">
                        🎯 Obiettivi
                    </Link>
                    <Link href="/giornale" className="action-btn">
                        📋 Scrivania
                    </Link>
                </div>
            </main>

            <Link href="/chat" className="chat-fab">
                <span className="fab-icon">💬</span>
                <span className="fab-pulse"></span>
            </Link>
        </div>
    )
}
