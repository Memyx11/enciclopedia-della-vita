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
    target_value?: number
    current_value?: number
}

export default function DashboardPage() {
    const { user, isLoaded } = useUser()
    const [greeting, setGreeting] = useState('')
    const [mission, setMission] = useState<Mission | null>(null)
    const [objectives, setObjectives] = useState<Objective[]>([])
    const [currentTask, setCurrentTask] = useState<Task | null>(null)
    const [showPlan, setShowPlan] = useState(true)
    const [loading, setLoading] = useState(true)

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

        // Load mission
        const { data: missionData } = await supabase
            .from('user_mission')
            .select('*')
            .eq('clerk_user_id', user.id)
            .eq('status', 'active')
            .maybeSingle()

        if (missionData) {
            setMission(missionData)

            // Load objectives for this mission
            const { data: objData } = await supabase
                .from('objectives')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('mission_id', missionData.id)
                .order('sort_order')

            if (objData) setObjectives(objData)

            // Load current task
            const { data: taskData } = await supabase
                .from('objectives')
                .select('*, parent:parent_id(title)')
                .eq('clerk_user_id', user.id)
                .eq('status', 'active')
                .in('level', ['task', 'micro'])
                .limit(1)
                .maybeSingle()

            if (taskData) {
                setCurrentTask({
                    ...taskData,
                    parent_title: (taskData.parent as any)?.title
                })
            }
        }

        setLoading(false)
    }

    const completeTask = async () => {
        if (!currentTask) return
        await supabase
            .from('objectives')
            .update({ status: 'completed', progress: 100 })
            .eq('id', currentTask.id)
        setCurrentTask(null)
        loadData()
    }

    const getMissionProgress = () => {
        if (!mission?.start_value || !mission?.target_value || !mission?.current_value) return 0
        const total = mission.target_value - mission.start_value
        const current = mission.current_value - mission.start_value
        return Math.round((current / total) * 100)
    }

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="container">
                <div className="auth-prompt">
                    <h1>La Tua Vita</h1>
                    <p>Accedi per vedere la tua dashboard</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    const userName = user?.firstName || 'Viaggiatore'
    const progress = getMissionProgress()

    return (
        <div className="container">
            {/* Header */}
            <header className="header">
                <Link href="/" className="back">← Home</Link>
                <h1 className="title">Dashboard</h1>
                <UserButton afterSignOutUrl="/" />
            </header>

            <main className="main">
                {/* Saluto */}
                <div className="greeting">
                    <h2>{greeting}, <span>{userName}</span></h2>
                </div>

                {/* MISSIONE */}
                <section className="card mission-card">
                    {mission ? (
                        <>
                            <div className="card-label">LA TUA MISSIONE</div>
                            <h3 className="mission-title">{mission.title}</h3>
                            {mission.description && (
                                <p className="mission-desc">{mission.description}</p>
                            )}
                            {mission.start_value && mission.target_value && (
                                <div className="progress-section">
                                    <div className="progress-labels">
                                        <span>{mission.unit === 'euro' ? '€' : ''}{mission.start_value}</span>
                                        <span className="current">{mission.unit === 'euro' ? '€' : ''}{mission.current_value || mission.start_value}</span>
                                        <span>{mission.unit === 'euro' ? '€' : ''}{mission.target_value}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="progress-percent">{progress}%</div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            <span className="empty-icon">🎯</span>
                            <h3>Qual è la tua missione?</h3>
                            <p>Parla con NUR per scoprire il tuo vero obiettivo</p>
                            <Link href="/chat" className="btn-primary">Parla con NUR</Link>
                        </div>
                    )}
                </section>

                {/* TASK DEL GIORNO */}
                <section className="card task-card">
                    {currentTask ? (
                        <>
                            <div className="card-label">OGGI LAVORI SU</div>
                            {currentTask.parent_title && (
                                <div className="task-parent">{currentTask.parent_title}</div>
                            )}
                            <h3 className="task-title">{currentTask.title}</h3>
                            {currentTask.description && (
                                <p className="task-desc">{currentTask.description}</p>
                            )}
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${currentTask.progress}%` }}></div>
                            </div>
                            <div className="task-actions">
                                <button className="btn-success" onClick={completeTask}>
                                    Completato!
                                </button>
                                <Link href="/chat" className="btn-secondary">
                                    Ho bisogno di aiuto
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <span className="empty-icon">✨</span>
                            <p>Nessun task attivo</p>
                            <Link href="/chat" className="btn-primary">Chiedi a NUR</Link>
                        </div>
                    )}
                </section>

                {/* IL TUO PIANO */}
                {mission && (
                    <section className="card plan-card">
                        <div className="card-header" onClick={() => setShowPlan(!showPlan)}>
                            <div className="card-label">IL TUO PIANO</div>
                            <span className="toggle">{showPlan ? '▼' : '▶'}</span>
                        </div>
                        {showPlan && (
                            <div className="plan-tree">
                                {objectives.filter(o => o.level === 'major').map(obj => (
                                    <div key={obj.id} className="plan-item">
                                        <span className={`status-dot ${obj.status}`}>
                                            {obj.status === 'completed' ? '●' : obj.progress > 0 ? '◐' : '○'}
                                        </span>
                                        <span className="plan-title">{obj.title}</span>
                                        <span className="plan-progress">({obj.progress}%)</span>
                                        {obj.status === 'completed' && <span className="check">✓</span>}
                                        {obj.status === 'active' && <span className="here">← SEI QUI</span>}

                                        {/* Sub-objectives */}
                                        <div className="plan-children">
                                            {objectives
                                                .filter(sub => sub.parent_id === obj.id)
                                                .map(sub => (
                                                    <div key={sub.id} className="plan-item sub">
                                                        <span className={`status-dot ${sub.status}`}>
                                                            {sub.status === 'completed' ? '●' : sub.progress > 0 ? '◐' : '○'}
                                                        </span>
                                                        <span className="plan-title">{sub.title}</span>
                                                        <span className="plan-progress">({sub.progress}%)</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                ))}

                                {objectives.length === 0 && (
                                    <p className="no-objectives">Parla con NUR per definire i tuoi obiettivi</p>
                                )}
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* BOTTOM NAV - SOLO 3 VOCI */}
            <nav className="bottom-nav">
                <Link href="/la-mia-vita" className="nav-item active">
                    <span>🏠</span>
                    <span>Dashboard</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span>💬</span>
                    <span>Chat</span>
                </Link>
                <Link href="/giornale" className="nav-item">
                    <span>📚</span>
                    <span>Scrivania</span>
                </Link>
            </nav>

            <style jsx>{styles}</style>
        </div>
    )
}

const styles = `
    .container {
        min-height: 100vh;
        background: #0a0a1a;
        color: #fff;
        padding-bottom: 80px;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: rgba(10, 10, 26, 0.95);
        position: sticky;
        top: 0;
        z-index: 100;
    }

    .back {
        color: rgba(255,255,255,0.6);
        text-decoration: none;
        font-size: 14px;
    }

    .title {
        font-size: 18px;
        font-weight: 600;
    }

    .main {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
    }

    .greeting {
        text-align: center;
        margin-bottom: 24px;
    }

    .greeting h2 {
        font-size: 24px;
        font-weight: 400;
    }

    .greeting span {
        color: #667eea;
        font-weight: 600;
    }

    /* Cards */
    .card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
    }

    .mission-card {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border-color: rgba(102, 126, 234, 0.3);
    }

    .task-card {
        background: linear-gradient(135deg, rgba(255, 146, 43, 0.1) 0%, rgba(255, 107, 107, 0.1) 100%);
        border-color: rgba(255, 146, 43, 0.3);
    }

    .card-label {
        font-size: 11px;
        font-weight: 700;
        color: #667eea;
        letter-spacing: 1px;
        margin-bottom: 8px;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    }

    .toggle {
        color: rgba(255,255,255,0.5);
    }

    /* Mission */
    .mission-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 8px;
    }

    .mission-desc {
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        margin-bottom: 16px;
    }

    /* Task */
    .task-parent {
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 4px;
    }

    .task-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
    }

    .task-desc {
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        margin-bottom: 12px;
    }

    .task-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
    }

    /* Progress */
    .progress-section {
        margin-top: 16px;
    }

    .progress-labels {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 8px;
    }

    .progress-labels .current {
        color: #667eea;
        font-weight: 600;
    }

    .progress-bar {
        height: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 4px;
        transition: width 0.3s;
    }

    .progress-percent {
        text-align: center;
        font-size: 20px;
        font-weight: 700;
        color: #667eea;
        margin-top: 8px;
    }

    /* Plan Tree */
    .plan-tree {
        margin-top: 12px;
    }

    .plan-item {
        padding: 8px 0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
    }

    .plan-item.sub {
        margin-left: 24px;
        font-size: 14px;
    }

    .status-dot {
        font-size: 12px;
    }

    .status-dot.completed { color: #51cf66; }
    .status-dot.active { color: #667eea; }
    .status-dot.pending { color: rgba(255,255,255,0.3); }

    .plan-title {
        color: rgba(255,255,255,0.9);
    }

    .plan-progress {
        color: rgba(255,255,255,0.4);
        font-size: 12px;
    }

    .check {
        color: #51cf66;
    }

    .here {
        color: #667eea;
        font-size: 11px;
        font-weight: 600;
    }

    .plan-children {
        width: 100%;
    }

    .no-objectives {
        color: rgba(255,255,255,0.4);
        text-align: center;
        padding: 16px;
    }

    /* Empty State */
    .empty-state {
        text-align: center;
        padding: 20px;
    }

    .empty-icon {
        font-size: 40px;
        display: block;
        margin-bottom: 12px;
    }

    .empty-state h3 {
        margin-bottom: 8px;
    }

    .empty-state p {
        color: rgba(255,255,255,0.5);
        margin-bottom: 16px;
    }

    /* Buttons */
    .btn-primary {
        display: inline-block;
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: #fff;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 600;
        border: none;
        cursor: pointer;
    }

    .btn-success {
        flex: 1;
        padding: 14px;
        background: linear-gradient(135deg, #51cf66, #40c057);
        color: #fff;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
    }

    .btn-secondary {
        flex: 1;
        padding: 14px;
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.8);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        text-decoration: none;
        text-align: center;
        font-size: 14px;
    }

    /* Bottom Nav */
    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        padding: 12px 0;
        padding-bottom: max(12px, env(safe-area-inset-bottom));
        background: rgba(10, 10, 26, 0.98);
        border-top: 1px solid rgba(255,255,255,0.1);
        z-index: 1000;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: rgba(255,255,255,0.5);
        text-decoration: none;
        font-size: 10px;
        padding: 8px 24px;
    }

    .nav-item.active {
        color: #667eea;
    }

    .nav-item span:first-child {
        font-size: 20px;
    }

    /* Auth prompt */
    .auth-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        text-align: center;
        padding: 40px;
    }

    .auth-prompt h1 {
        font-size: 28px;
        margin-bottom: 12px;
    }

    .auth-prompt p {
        color: rgba(255,255,255,0.5);
        margin-bottom: 24px;
    }
`
