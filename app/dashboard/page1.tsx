'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase, LifeArea } from '@/lib/supabase'
import Link from 'next/link'
import './dashboard.css'

const areeVita = [
    { id: 'salute', nome: 'Salute Fisica', emoji: '💪' },
    { id: 'soldi', nome: 'Finanze', emoji: '💰' },
    { id: 'relazioni', nome: 'Relazioni', emoji: '❤️' },
    { id: 'lavoro', nome: 'Carriera', emoji: '💼' },
    { id: 'hobby', nome: 'Hobby e Svago', emoji: '🎨' },
    { id: 'crescita', nome: 'Crescita Personale', emoji: '📚' },
    { id: 'casa', nome: 'Casa e Ambiente', emoji: '🏠' },
    { id: 'sociale', nome: 'Vita Sociale', emoji: '👥' },
    { id: 'spirituale', nome: 'Benessere Interiore', emoji: '🧘' },
    { id: 'futuro', nome: 'Progetti Futuri', emoji: '🎯' }
]

export default function DashboardPage() {
    const { user, isLoaded } = useUser()
    const [areas, setAreas] = useState<LifeArea[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isLoaded && user) {
            fetchAreas()
        }
    }, [isLoaded, user])

    const fetchAreas = async () => {
        if (!user) return
        
        const { data } = await supabase
            .from('life_areas')
            .select('*')
            .eq('clerk_user_id', user.id)
        
        if (data) {
            setAreas(data)
            if (data.length < 10) {
                await initializeAreas(data)
            }
        }
        setLoading(false)
    }

    const initializeAreas = async (existingAreas: LifeArea[]) => {
        if (!user) return
        
        const existingTypes = existingAreas.map(a => a.area_type)
        const missingTypes = areeVita.filter(a => !existingTypes.includes(a.id as any))

        if (missingTypes.length > 0) {
            const newAreas = missingTypes.map(area => ({
                clerk_user_id: user.id,
                area_type: area.id,
                data: {},
                progress: 0
            }))

            await supabase.from('life_areas').insert(newAreas)
            fetchAreas()
        }
    }

    const getProgress = (areaId: string) => {
        const area = areas.find(a => a.area_type === areaId)
        return area?.progress || 0
    }

    const getStatusInfo = (progress: number) => {
        if (progress === 0) return { class: 'status-empty', text: 'Da iniziare' }
        if (progress < 100) return { class: 'status-partial', text: 'In corso' }
        return { class: 'status-complete', text: 'Completato' }
    }

    const getOverallProgress = () => {
        let totale = 0
        areeVita.forEach(area => {
            const progress = getProgress(area.id)
            if (progress === 100) totale += 1
            else if (progress > 0) totale += 0.5
        })
        return Math.round((totale / areeVita.length) * 100)
    }

    const getCompletedCount = () => {
        return areas.filter(a => a.progress === 100).length
    }

    if (!isLoaded || loading) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--text-muted)'
            }}>
                Caricamento...
            </div>
        )
    }

    const overallProgress = getOverallProgress()

    return (
        <>
            <div className="bg-gradient"></div>
            
            <header>
                <div className="header-content">
                    <Link href="/" className="logo">📖 Enciclopedia della Vita</Link>
                    <Link href="/" className="back-link">← Torna alla home</Link>
                </div>
            </header>

            <div className="content-wrapper">
                <h1>La Mia Vita</h1>
                <p className="subtitle">Traccia le aree importanti della tua vita. Tu compili, tu decidi.</p>

                <div className="overall-stats">
                    <div className={`stat-circle ${overallProgress === 100 ? 'complete' : ''}`}>
                        {overallProgress}%
                    </div>
                    <h2 className="stat-title">Completamento Generale</h2>
                    <p className="stat-subtitle">Hai compilato <span>{getCompletedCount()}</span> su 10 aree</p>
                </div>

                <div className="dashboard-grid">
                    {areeVita.map(area => {
                        const progress = getProgress(area.id)
                        const status = getStatusInfo(progress)

                        return (
                            <div key={area.id} className="area-card">
                                <div className="area-header">
                                    <div className="area-title">{area.emoji} {area.nome}</div>
                                    <span className={`status-badge ${status.class}`}>{status.text}</span>
                                </div>
                                <div className="area-progress">
                                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className="progress-text">{progress}% completato</p>
                                <div className="area-actions">
                                    <Link href={`/dashboard/area/${area.id}`} className="btn btn-primary">
                                        {progress === 0 ? 'Inizia' : 'Aggiorna'}
                                    </Link>
                                    <Link href={`/chat?area=${area.id}`} className="btn btn-ghost">
                                        Approfondisci
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <Link href="/chat" className="chat-button" title="Chatta con l'assistente">
                💬
            </Link>

            <footer>
                <p>📖 Enciclopedia della Vita · I tuoi dati sono al sicuro</p>
            </footer>
        </>
    )
}
