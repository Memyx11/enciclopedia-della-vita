'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import MissionHero from '@/components/mission/MissionHero'
import ObjectiveTree from '@/components/mission/ObjectiveTree'
import CurrentTask from '@/components/mission/CurrentTask'

interface Mission {
    id: string
    title: string
    status: string
}

export default function ObiettiviPage() {
    const { user, isLoaded } = useUser()
    const [mission, setMission] = useState<Mission | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const fetchMission = async () => {
            const { data, error } = await supabase
                .from('user_mission')
                .select('id, title, status')
                .eq('clerk_user_id', user.id)
                .eq('status', 'active')
                .single()

            if (!error && data) {
                setMission(data)
            }
            setLoading(false)
        }

        fetchMission()
    }, [user])

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="obiettivi-container">
                <div className="bg-gradient"></div>
                <div className="auth-prompt">
                    <h1>🎯 I Tuoi Obiettivi</h1>
                    <p>Accedi per vedere la mappa dei tuoi obiettivi</p>
                    <Link href="/" className="btn btn-primary">
                        Vai alla Home
                    </Link>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    return (
        <div className="obiettivi-container">
            <div className="bg-gradient"></div>

            <header className="obiettivi-header">
                <div className="header-left">
                    <Link href="/la-mia-vita" className="back-link">← Vita</Link>
                </div>
                <div className="header-center">
                    <span className="header-icon">🎯</span>
                    <h1>Obiettivi</h1>
                </div>
                <div className="header-right">
                    <Link href="/chat" className="chat-link">💬</Link>
                </div>
            </header>

            <main className="obiettivi-content">
                {/* Missione in alto */}
                <section className="section-box">
                    <MissionHero />
                </section>

                {/* Task attuale prominente */}
                <section className="section-box">
                    <CurrentTask />
                </section>

                {/* Albero obiettivi completo */}
                <section className="section-box">
                    <ObjectiveTree
                        missionId={mission?.id}
                    />
                </section>

                {/* CTA per chat con NUR */}
                <div className="nur-cta">
                    <p>Vuoi aggiornare i tuoi obiettivi o aggiungerne di nuovi?</p>
                    <Link href="/chat" className="btn btn-primary">
                        💬 Parla con NUR
                    </Link>
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <Link href="/" className="nav-item">
                    <span className="nav-icon">🏠</span>
                    <span className="nav-label">Home</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">Chat</span>
                </Link>
                <Link href="/obiettivi" className="nav-item active">
                    <span className="nav-icon">🎯</span>
                    <span className="nav-label">Obiettivi</span>
                </Link>
                <Link href="/la-mia-vita" className="nav-item">
                    <span className="nav-icon">🌌</span>
                    <span className="nav-label">Vita</span>
                </Link>
                <Link href="/profilo" className="nav-item">
                    <span className="nav-icon">🏆</span>
                    <span className="nav-label">Profilo</span>
                </Link>
            </nav>

            <style jsx>{styles}</style>
        </div>
    )
}

const styles = `
    .obiettivi-container {
        min-height: 100vh;
        background: #0a0a1a;
        color: #fff;
        padding-bottom: 80px;
    }

    .bg-gradient {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 300px;
        background: linear-gradient(180deg, rgba(102, 126, 234, 0.15) 0%, transparent 100%);
        pointer-events: none;
        z-index: 0;
    }

    .auth-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
        text-align: center;
        padding: 20px;
    }

    .auth-prompt h1 {
        font-size: 28px;
        margin-bottom: 12px;
    }

    .auth-prompt p {
        color: rgba(255,255,255,0.6);
        margin-bottom: 24px;
    }

    .obiettivi-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        position: sticky;
        top: 0;
        background: rgba(10, 10, 26, 0.95);
        backdrop-filter: blur(10px);
        z-index: 100;
        border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .header-left, .header-right {
        width: 60px;
    }

    .back-link {
        color: rgba(255,255,255,0.7);
        text-decoration: none;
        font-size: 14px;
    }

    .chat-link {
        font-size: 20px;
        text-decoration: none;
    }

    .header-center {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .header-icon {
        font-size: 20px;
    }

    .header-center h1 {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
    }

    .obiettivi-content {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
        position: relative;
        z-index: 1;
    }

    .section-box {
        margin-bottom: 20px;
    }

    .current-task-section {
        margin: 20px 0;
    }

    .objectives-section {
        margin: 20px 0;
    }

    .nur-cta {
        text-align: center;
        padding: 24px;
        margin-top: 20px;
        background: rgba(255,255,255,0.03);
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
    }

    .nur-cta p {
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        margin-bottom: 16px;
    }

    .btn {
        display: inline-block;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s;
    }

    .btn-primary {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: #fff;
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        padding: 8px 0 env(safe-area-inset-bottom, 8px);
        background: rgba(10, 10, 26, 0.98);
        border-top: 1px solid rgba(255,255,255,0.1);
        z-index: 1000;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 16px;
        color: rgba(255,255,255,0.5);
        text-decoration: none;
        transition: all 0.2s;
    }

    .nav-item.active {
        color: #667eea;
    }

    .nav-icon {
        font-size: 20px;
    }

    .nav-label {
        font-size: 10px;
        font-weight: 500;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: rgba(255,255,255,0.5);
    }
`
