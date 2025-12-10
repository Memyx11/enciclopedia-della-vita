'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

interface Mission {
    id: string
    title: string
    description: string
    start_value: number | null
    target_value: number | null
    current_value: number | null
    unit: string | null
    start_date: string
    target_date: string | null
}

interface Objective {
    id: string
    title: string
    level: string
    status: string
    progress: number
    parent_id: string | null
}

interface Task {
    id: string
    title: string
    description: string | null
    progress: number
    parent_title?: string
}

// DEMO DATA - Per mostrare come apparirà quando ci sono dati
const DEMO_MISSION: Mission = {
    id: 'demo',
    title: 'Diventare finanziariamente libero',
    description: 'Uscire dai debiti e costruire ricchezza',
    start_value: -5000,
    target_value: 50000,
    current_value: 8500,
    unit: 'euro',
    start_date: '2024-11-15',
    target_date: '2026-12-31'
}

const DEMO_OBJECTIVES: Objective[] = [
    { id: '1', title: 'Eliminare debiti carta di credito', level: 'major', status: 'completed', progress: 100, parent_id: null },
    { id: '2', title: 'Creare un business online', level: 'major', status: 'active', progress: 42, parent_id: null },
    { id: '2a', title: 'Validare idea di business', level: 'sub', status: 'completed', progress: 100, parent_id: '2' },
    { id: '2b', title: 'Imparare a vendere', level: 'sub', status: 'active', progress: 60, parent_id: '2' },
    { id: '2c', title: 'Primi 10 clienti paganti', level: 'sub', status: 'pending', progress: 0, parent_id: '2' },
    { id: '3', title: 'Costruire fondo emergenza 6 mesi', level: 'major', status: 'pending', progress: 0, parent_id: null },
    { id: '4', title: 'Investire 20% del reddito', level: 'major', status: 'pending', progress: 0, parent_id: null },
]

const DEMO_TASK: Task = {
    id: 'task1',
    title: 'Fare 5 chiamate a freddo oggi',
    description: 'Usa lo script che hai preparato. Obiettivo: ottenere almeno 1 appuntamento.',
    progress: 60,
    parent_title: 'Imparare a vendere'
}

export default function DashboardPage() {
    const { user, isLoaded } = useUser()
    const [greeting, setGreeting] = useState('')
    const [mission, setMission] = useState<Mission | null>(null)
    const [objectives, setObjectives] = useState<Objective[]>([])
    const [currentTask, setCurrentTask] = useState<Task | null>(null)
    const [loading, setLoading] = useState(true)
    const [useDemo, setUseDemo] = useState(false)

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Buongiorno')
        else if (hour < 18) setGreeting('Buon pomeriggio')
        else setGreeting('Buonasera')
    }, [])

    useEffect(() => {
        if (!user) return
        loadData()
    }, [user])

    const loadData = async () => {
        if (!user) return

        try {
            // Load mission
            const { data: missionData } = await supabase
                .from('user_mission')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('status', 'active')
                .single()

            if (missionData) {
                setMission(missionData)

                // Load objectives
                const { data: objData } = await supabase
                    .from('objectives')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .eq('mission_id', missionData.id)
                    .order('sort_order')

                if (objData && objData.length > 0) {
                    setObjectives(objData)
                }

                // Load current task
                const { data: taskData } = await supabase
                    .from('objectives')
                    .select('*, parent:parent_id(title)')
                    .eq('clerk_user_id', user.id)
                    .eq('status', 'active')
                    .in('level', ['task', 'micro'])
                    .limit(1)
                    .single()

                if (taskData) {
                    setCurrentTask({
                        ...taskData,
                        parent_title: (taskData.parent as any)?.title
                    })
                }
            }
        } catch (e) {
            console.log('No mission data yet')
        }

        setLoading(false)
    }

    const getMissionProgress = (m: Mission) => {
        if (!m.start_value || !m.target_value || !m.current_value) return 0
        const total = m.target_value - m.start_value
        const current = m.current_value - m.start_value
        return Math.max(0, Math.min(100, Math.round((current / total) * 100)))
    }

    const formatValue = (value: number | null, unit: string | null) => {
        if (value === null) return '—'
        const formatted = value.toLocaleString('it-IT')
        if (unit === 'euro') return `€${formatted}`
        return `${formatted}${unit ? ` ${unit}` : ''}`
    }

    const getDaysRemaining = (targetDate: string | null) => {
        if (!targetDate) return null
        const target = new Date(targetDate)
        const today = new Date()
        const diff = target.getTime() - today.getTime()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    // Usa dati demo o reali
    const displayMission = useDemo ? DEMO_MISSION : mission
    const displayObjectives = useDemo ? DEMO_OBJECTIVES : objectives
    const displayTask = useDemo ? DEMO_TASK : currentTask

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="container">
                <div className="auth-prompt">
                    <div className="auth-icon">🎯</div>
                    <h1>La Tua Dashboard</h1>
                    <p>Accedi per vedere la tua missione</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    const userName = user?.firstName || 'Viaggiatore'
    const progress = displayMission ? getMissionProgress(displayMission) : 0
    const daysLeft = displayMission ? getDaysRemaining(displayMission.target_date) : null

    return (
        <div className="container">
            {/* Background effects */}
            <div className="bg-gradient"></div>
            <div className="bg-glow"></div>

            {/* Header */}
            <header className="header">
                <Link href="/" className="back">← Home</Link>
                <h1 className="header-title">Dashboard</h1>
                <UserButton afterSignOutUrl="/" />
            </header>

            <main className="main">
                {/* Greeting */}
                <div className="greeting">
                    <h2>{greeting}, <span className="name">{userName}</span></h2>
                </div>

                {/* Toggle Demo */}
                {!mission && (
                    <button 
                        className="demo-toggle"
                        onClick={() => setUseDemo(!useDemo)}
                    >
                        {useDemo ? '🔴 Nascondi anteprima' : '👀 Mostra anteprima con dati demo'}
                    </button>
                )}

                {/* ═══════════════════════════════════════════
                    MISSIONE PRINCIPALE
                ═══════════════════════════════════════════ */}
                <section className="mission-card">
                    {displayMission ? (
                        <>
                            <div className="mission-header">
                                <span className="mission-badge">🎯 LA TUA MISSIONE</span>
                                {daysLeft && daysLeft > 0 && (
                                    <span className="days-badge">{daysLeft} giorni</span>
                                )}
                            </div>
                            
                            <h3 className="mission-title">{displayMission.title}</h3>
                            
                            {displayMission.description && (
                                <p className="mission-desc">{displayMission.description}</p>
                            )}

                            {/* Progress Bar Grande */}
                            <div className="mission-progress">
                                <div className="progress-track">
                                    <div 
                                        className="progress-fill"
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="progress-glow"></div>
                                    </div>
                                    <div 
                                        className="progress-marker"
                                        style={{ left: `${progress}%` }}
                                    >
                                        <span className="marker-dot"></span>
                                    </div>
                                </div>
                                
                                <div className="progress-labels">
                                    <div className="label-start">
                                        <span className="label-value">{formatValue(displayMission.start_value, displayMission.unit)}</span>
                                        <span className="label-text">Partenza</span>
                                    </div>
                                    <div className="label-current">
                                        <span className="label-percent">{progress}%</span>
                                    </div>
                                    <div className="label-end">
                                        <span className="label-value">{formatValue(displayMission.target_value, displayMission.unit)}</span>
                                        <span className="label-text">Obiettivo</span>
                                    </div>
                                </div>
                            </div>

                            {/* Current Value Highlight */}
                            <div className="current-value-box">
                                <span className="current-label">Adesso sei a</span>
                                <span className="current-value">{formatValue(displayMission.current_value, displayMission.unit)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="empty-mission">
                            <div className="empty-icon">🎯</div>
                            <h3>Qual è la tua missione?</h3>
                            <p>Parla con NUR per scoprire il tuo vero obiettivo</p>
                            <Link href="/chat" className="btn-primary">
                                💬 Parla con NUR
                            </Link>
                        </div>
                    )}
                </section>

                {/* ═══════════════════════════════════════════
                    TASK DEL GIORNO
                ═══════════════════════════════════════════ */}
                <section className="task-card">
                    {displayTask ? (
                        <>
                            <div className="task-header">
                                <span className="task-badge">🔥 OGGI</span>
                                {displayTask.parent_title && (
                                    <span className="task-parent">📌 {displayTask.parent_title}</span>
                                )}
                            </div>
                            
                            <h3 className="task-title">{displayTask.title}</h3>
                            
                            {displayTask.description && (
                                <p className="task-desc">{displayTask.description}</p>
                            )}

                            {/* Task Progress */}
                            <div className="task-progress">
                                <div className="task-progress-bar">
                                    <div 
                                        className="task-progress-fill"
                                        style={{ width: `${displayTask.progress}%` }}
                                    ></div>
                                </div>
                                <span className="task-percent">{displayTask.progress}%</span>
                            </div>

                            <div className="task-actions">
                                <button className="btn-success">
                                    ✅ Completato!
                                </button>
                                <Link href="/chat" className="btn-ghost">
                                    💬 Ho bisogno di aiuto
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="empty-task">
                            <div className="empty-icon">✨</div>
                            <p>Nessun task attivo</p>
                            <Link href="/chat" className="btn-secondary">
                                💬 Chiedi a NUR
                            </Link>
                        </div>
                    )}
                </section>

                {/* ═══════════════════════════════════════════
                    IL TUO PIANO - ALBERO OBIETTIVI
                ═══════════════════════════════════════════ */}
                {displayMission && displayObjectives.length > 0 && (
                    <section className="plan-card">
                        <div className="plan-header">
                            <span className="plan-badge">📋 IL TUO PIANO</span>
                        </div>

                        <div className="plan-tree">
                            {displayObjectives
                                .filter(o => o.level === 'major')
                                .map((obj, idx) => {
                                    const children = displayObjectives.filter(o => o.parent_id === obj.id)
                                    const isLast = idx === displayObjectives.filter(o => o.level === 'major').length - 1
                                    
                                    return (
                                        <div key={obj.id} className="plan-item">
                                            {/* Connector line */}
                                            {!isLast && <div className="connector-line"></div>}
                                            
                                            {/* Status Circle */}
                                            <div className={`status-circle ${obj.status}`}>
                                                {obj.status === 'completed' ? (
                                                    <span className="check">✓</span>
                                                ) : (
                                                    <svg viewBox="0 0 36 36" className="progress-ring">
                                                        <circle
                                                            cx="18" cy="18" r="16"
                                                            fill="none"
                                                            stroke="rgba(255,255,255,0.1)"
                                                            strokeWidth="3"
                                                        />
                                                        <circle
                                                            cx="18" cy="18" r="16"
                                                            fill="none"
                                                            stroke={obj.status === 'active' ? '#667eea' : 'rgba(255,255,255,0.2)'}
                                                            strokeWidth="3"
                                                            strokeDasharray={`${obj.progress}, 100`}
                                                            strokeLinecap="round"
                                                            transform="rotate(-90 18 18)"
                                                        />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="plan-content">
                                                <div className="plan-main">
                                                    <span className={`plan-title ${obj.status}`}>
                                                        {obj.title}
                                                    </span>
                                                    {obj.status === 'active' && (
                                                        <span className="here-badge">← SEI QUI</span>
                                                    )}
                                                    {obj.status === 'completed' && (
                                                        <span className="done-badge">✓</span>
                                                    )}
                                                </div>
                                                
                                                {obj.status !== 'completed' && (
                                                    <span className="plan-progress">{obj.progress}%</span>
                                                )}

                                                {/* Sub-objectives */}
                                                {children.length > 0 && (
                                                    <div className="plan-children">
                                                        {children.map(child => (
                                                            <div key={child.id} className="plan-child">
                                                                <span className={`child-dot ${child.status}`}>
                                                                    {child.status === 'completed' ? '●' : 
                                                                     child.status === 'active' ? '◐' : '○'}
                                                                </span>
                                                                <span className={`child-title ${child.status}`}>
                                                                    {child.title}
                                                                </span>
                                                                {child.status !== 'completed' && (
                                                                    <span className="child-progress">
                                                                        {child.progress}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    </section>
                )}

                {/* Quick Link to Scrivania */}
                <Link href="/giornale" className="scrivania-link">
                    <span className="scrivania-icon">📚</span>
                    <span className="scrivania-text">Vai alla Scrivania</span>
                    <span className="scrivania-arrow">→</span>
                </Link>
            </main>

            {/* ═══════════════════════════════════════════
                BOTTOM NAVIGATION
            ═══════════════════════════════════════════ */}
            <nav className="bottom-nav">
                <Link href="/la-mia-vita" className="nav-item active">
                    <span className="nav-icon">🏠</span>
                    <span className="nav-label">Dashboard</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">Chat</span>
                </Link>
                <Link href="/giornale" className="nav-item">
                    <span className="nav-icon">📚</span>
                    <span className="nav-label">Scrivania</span>
                </Link>
            </nav>

            <style jsx>{styles}</style>
        </div>
    )
}

const styles = `
    /* ═══════════════════════════════════════════
       BASE & BACKGROUND
    ═══════════════════════════════════════════ */
    .container {
        min-height: 100vh;
        background: #050510;
        color: #fff;
        padding-bottom: 100px;
        position: relative;
        overflow-x: hidden;
    }

    .bg-gradient {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: 
            radial-gradient(ellipse at 30% 20%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
    }

    .bg-glow {
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        width: 600px;
        height: 400px;
        background: radial-gradient(ellipse, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
    }

    /* ═══════════════════════════════════════════
       HEADER
    ═══════════════════════════════════════════ */
    .header {
        position: sticky;
        top: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: rgba(5, 5, 16, 0.9);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255,255,255,0.05);
        z-index: 100;
    }

    .back {
        color: rgba(255,255,255,0.5);
        text-decoration: none;
        font-size: 14px;
        transition: color 0.2s;
    }

    .back:hover {
        color: #fff;
    }

    .header-title {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
    }

    /* ═══════════════════════════════════════════
       MAIN CONTENT
    ═══════════════════════════════════════════ */
    .main {
        position: relative;
        z-index: 1;
        padding: 24px 20px;
        max-width: 600px;
        margin: 0 auto;
    }

    .greeting {
        text-align: center;
        margin-bottom: 32px;
    }

    .greeting h2 {
        font-size: 26px;
        font-weight: 400;
        color: rgba(255,255,255,0.9);
    }

    .greeting .name {
        color: #667eea;
        font-weight: 600;
    }

    .demo-toggle {
        display: block;
        width: 100%;
        padding: 12px;
        margin-bottom: 20px;
        background: rgba(102, 126, 234, 0.1);
        border: 1px dashed rgba(102, 126, 234, 0.3);
        border-radius: 12px;
        color: rgba(255,255,255,0.7);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .demo-toggle:hover {
        background: rgba(102, 126, 234, 0.2);
    }

    /* ═══════════════════════════════════════════
       MISSION CARD
    ═══════════════════════════════════════════ */
    .mission-card {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 20px;
        position: relative;
        overflow: hidden;
    }

    .mission-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), transparent);
    }

    .mission-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }

    .mission-badge {
        font-size: 11px;
        font-weight: 700;
        color: #667eea;
        letter-spacing: 1.5px;
        text-transform: uppercase;
    }

    .days-badge {
        font-size: 12px;
        padding: 4px 12px;
        background: rgba(255,255,255,0.1);
        border-radius: 20px;
        color: rgba(255,255,255,0.7);
    }

    .mission-title {
        font-size: 24px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 8px;
        line-height: 1.3;
    }

    .mission-desc {
        font-size: 14px;
        color: rgba(255,255,255,0.6);
        margin-bottom: 24px;
    }

    /* Mission Progress Bar */
    .mission-progress {
        margin: 24px 0;
    }

    .progress-track {
        position: relative;
        height: 12px;
        background: rgba(255,255,255,0.1);
        border-radius: 6px;
        overflow: visible;
    }

    .progress-fill {
        position: relative;
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
        border-radius: 6px;
        transition: width 1s ease-out;
    }

    .progress-glow {
        position: absolute;
        top: -4px;
        right: -4px;
        bottom: -4px;
        width: 20px;
        background: radial-gradient(ellipse at right, rgba(240, 147, 251, 0.6), transparent);
        filter: blur(8px);
    }

    .progress-marker {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 10;
    }

    .marker-dot {
        display: block;
        width: 20px;
        height: 20px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 20px rgba(102, 126, 234, 0.8), 0 0 40px rgba(102, 126, 234, 0.4);
    }

    .progress-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 16px;
    }

    .label-start, .label-end {
        text-align: center;
    }

    .label-start { text-align: left; }
    .label-end { text-align: right; }

    .label-value {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: rgba(255,255,255,0.8);
    }

    .label-text {
        font-size: 11px;
        color: rgba(255,255,255,0.4);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .label-current {
        text-align: center;
    }

    .label-percent {
        font-size: 32px;
        font-weight: 700;
        color: #667eea;
        text-shadow: 0 0 30px rgba(102, 126, 234, 0.5);
    }

    .current-value-box {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-top: 20px;
        padding: 16px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
    }

    .current-label {
        font-size: 14px;
        color: rgba(255,255,255,0.5);
    }

    .current-value {
        font-size: 28px;
        font-weight: 700;
        color: #51cf66;
    }

    /* ═══════════════════════════════════════════
       TASK CARD
    ═══════════════════════════════════════════ */
    .task-card {
        background: linear-gradient(135deg, rgba(255, 146, 43, 0.12) 0%, rgba(255, 107, 107, 0.12) 100%);
        border: 1px solid rgba(255, 146, 43, 0.25);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 20px;
    }

    .task-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
    }

    .task-badge {
        font-size: 11px;
        font-weight: 700;
        color: #ff922b;
        letter-spacing: 1.5px;
        text-transform: uppercase;
    }

    .task-parent {
        font-size: 12px;
        color: rgba(255,255,255,0.5);
    }

    .task-title {
        font-size: 20px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 8px;
    }

    .task-desc {
        font-size: 14px;
        color: rgba(255,255,255,0.6);
        line-height: 1.5;
        margin-bottom: 16px;
    }

    .task-progress {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
    }

    .task-progress-bar {
        flex: 1;
        height: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        overflow: hidden;
    }

    .task-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff922b, #ff6b6b);
        border-radius: 4px;
        transition: width 0.3s;
    }

    .task-percent {
        font-size: 16px;
        font-weight: 600;
        color: #ff922b;
        min-width: 45px;
    }

    .task-actions {
        display: flex;
        gap: 12px;
    }

    /* ═══════════════════════════════════════════
       PLAN CARD - ALBERO OBIETTIVI
    ═══════════════════════════════════════════ */
    .plan-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 20px;
    }

    .plan-header {
        margin-bottom: 20px;
    }

    .plan-badge {
        font-size: 11px;
        font-weight: 700;
        color: rgba(255,255,255,0.5);
        letter-spacing: 1.5px;
        text-transform: uppercase;
    }

    .plan-tree {
        position: relative;
    }

    .plan-item {
        display: flex;
        gap: 16px;
        padding: 16px 0;
        position: relative;
    }

    .connector-line {
        position: absolute;
        left: 20px;
        top: 56px;
        bottom: -16px;
        width: 2px;
        background: rgba(255,255,255,0.1);
    }

    .status-circle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
    }

    .status-circle.completed {
        background: linear-gradient(135deg, #51cf66, #40c057);
    }

    .status-circle .check {
        font-size: 18px;
        color: #fff;
        font-weight: 700;
    }

    .status-circle .progress-ring {
        width: 40px;
        height: 40px;
    }

    .plan-content {
        flex: 1;
    }

    .plan-main {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .plan-title {
        font-size: 16px;
        font-weight: 600;
        color: rgba(255,255,255,0.9);
    }

    .plan-title.completed {
        color: rgba(255,255,255,0.5);
        text-decoration: line-through;
    }

    .plan-title.pending {
        color: rgba(255,255,255,0.4);
    }

    .here-badge {
        font-size: 11px;
        font-weight: 700;
        color: #667eea;
        padding: 2px 8px;
        background: rgba(102, 126, 234, 0.2);
        border-radius: 4px;
    }

    .done-badge {
        color: #51cf66;
    }

    .plan-progress {
        font-size: 12px;
        color: rgba(255,255,255,0.4);
        margin-top: 4px;
    }

    .plan-children {
        margin-top: 12px;
        padding-left: 8px;
        border-left: 2px solid rgba(255,255,255,0.1);
    }

    .plan-child {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
    }

    .child-dot {
        font-size: 10px;
    }

    .child-dot.completed { color: #51cf66; }
    .child-dot.active { color: #667eea; }
    .child-dot.pending { color: rgba(255,255,255,0.3); }

    .child-title {
        font-size: 14px;
        color: rgba(255,255,255,0.7);
    }

    .child-title.completed {
        color: rgba(255,255,255,0.4);
        text-decoration: line-through;
    }

    .child-progress {
        font-size: 12px;
        color: rgba(255,255,255,0.3);
        margin-left: auto;
    }

    /* ═══════════════════════════════════════════
       SCRIVANIA LINK
    ═══════════════════════════════════════════ */
    .scrivania-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        text-decoration: none;
        color: rgba(255,255,255,0.7);
        transition: all 0.2s;
    }

    .scrivania-link:hover {
        background: rgba(255,255,255,0.06);
        border-color: rgba(102, 126, 234, 0.3);
    }

    .scrivania-icon {
        font-size: 24px;
    }

    .scrivania-text {
        flex: 1;
        font-size: 15px;
    }

    .scrivania-arrow {
        color: rgba(255,255,255,0.3);
    }

    /* ═══════════════════════════════════════════
       EMPTY STATES
    ═══════════════════════════════════════════ */
    .empty-mission, .empty-task {
        text-align: center;
        padding: 32px 16px;
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        display: block;
    }

    .empty-mission h3, .empty-task h3 {
        font-size: 20px;
        margin-bottom: 8px;
    }

    .empty-mission p, .empty-task p {
        color: rgba(255,255,255,0.5);
        margin-bottom: 20px;
    }

    /* ═══════════════════════════════════════════
       BUTTONS
    ═══════════════════════════════════════════ */
    .btn-primary {
        display: inline-block;
        padding: 14px 28px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: #fff;
        border: none;
        border-radius: 14px;
        font-size: 15px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    .btn-success {
        flex: 1;
        padding: 16px;
        background: linear-gradient(135deg, #51cf66, #40c057);
        color: #fff;
        border: none;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-success:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(81, 207, 102, 0.4);
    }

    .btn-secondary {
        display: inline-block;
        padding: 14px 28px;
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.8);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 14px;
        font-size: 15px;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-secondary:hover {
        background: rgba(255,255,255,0.15);
    }

    .btn-ghost {
        flex: 1;
        padding: 16px;
        background: transparent;
        color: rgba(255,255,255,0.7);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 14px;
        font-size: 14px;
        text-decoration: none;
        text-align: center;
        transition: all 0.2s;
    }

    .btn-ghost:hover {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.25);
    }

    /* ═══════════════════════════════════════════
       BOTTOM NAVIGATION
    ═══════════════════════════════════════════ */
    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        padding: 12px 0;
        padding-bottom: max(12px, env(safe-area-inset-bottom));
        background: rgba(5, 5, 16, 0.95);
        backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255,255,255,0.08);
        z-index: 1000;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 24px;
        color: rgba(255,255,255,0.4);
        text-decoration: none;
        transition: all 0.2s;
    }

    .nav-item.active {
        color: #667eea;
    }

    .nav-item:hover {
        color: rgba(255,255,255,0.8);
    }

    .nav-icon {
        font-size: 22px;
    }

    .nav-label {
        font-size: 11px;
        font-weight: 500;
    }

    /* ═══════════════════════════════════════════
       AUTH PROMPT
    ═══════════════════════════════════════════ */
    .auth-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        text-align: center;
        padding: 40px;
    }

    .auth-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .auth-prompt h1 {
        font-size: 28px;
        margin-bottom: 12px;
    }

    .auth-prompt p {
        color: rgba(255,255,255,0.5);
        margin-bottom: 28px;
    }

    /* ═══════════════════════════════════════════
       RESPONSIVE
    ═══════════════════════════════════════════ */
    @media (max-width: 480px) {
        .main {
            padding: 16px;
        }

        .greeting h2 {
            font-size: 22px;
        }

        .mission-title {
            font-size: 20px;
        }

        .label-percent {
            font-size: 28px;
        }

        .task-actions {
            flex-direction: column;
        }

        .status-circle {
            width: 36px;
            height: 36px;
        }

        .status-circle .progress-ring {
            width: 36px;
            height: 36px;
        }

        .connector-line {
            left: 18px;
        }
    }
`
