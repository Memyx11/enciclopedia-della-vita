'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

interface Mission {
    id: string
    title: string
    description: string | null
    why: string | null
}

interface Objective {
    id: string
    mission_id: string
    parent_id: string | null
    level: 'major' | 'sub' | 'task'
    title: string
    description: string | null
    status: 'pending' | 'active' | 'completed' | 'skipped'
    progress: number
    sort_order: number
}

interface ChainState {
    activeChapter: string | null
    activeStep: string | null
    activeTask: string | null
}

type DashboardPhase = 'empty' | 'mission_only' | 'has_chapters' | 'has_steps' | 'complete'

// ============================================
// CHAIN LOGIC
// ============================================

function calculateChain(objectives: Objective[]): ChainState {
    const chapters = objectives
        .filter(o => o.level === 'major')
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const activeChapter = chapters.find(c => c.status !== 'completed')
    if (!activeChapter) return { activeChapter: null, activeStep: null, activeTask: null }

    const steps = objectives
        .filter(o => o.level === 'sub' && o.parent_id === activeChapter.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const activeStep = steps.find(s => s.status !== 'completed')
    if (!activeStep) return { activeChapter: activeChapter.id, activeStep: null, activeTask: null }

    const tasks = objectives
        .filter(o => o.level === 'task' && o.parent_id === activeStep.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const activeTask = tasks.find(t => t.status !== 'completed')

    return {
        activeChapter: activeChapter.id,
        activeStep: activeStep.id,
        activeTask: activeTask?.id || null
    }
}

function getDisplayState(obj: Objective, chain: ChainState): 'done' | 'current' | 'locked' {
    if (obj.status === 'completed') return 'done'
    const isActive = obj.id === chain.activeChapter || obj.id === chain.activeStep || obj.id === chain.activeTask
    return isActive ? 'current' : 'locked'
}

// ============================================
// COMPONENT
// ============================================

export default function LaMiaVitaPage() {
    const { user, isLoaded } = useUser()
    const [greeting, setGreeting] = useState('')
    const [loading, setLoading] = useState(true)

    // Data
    const [mission, setMission] = useState<Mission | null>(null)
    const [objectives, setObjectives] = useState<Objective[]>([])
    const [chain, setChain] = useState<ChainState>({ activeChapter: null, activeStep: null, activeTask: null })
    const [phase, setPhase] = useState<DashboardPhase>('empty')

    // Computed
    const chapters = objectives.filter(o => o.level === 'major')
    const completedChapters = chapters.filter(c => c.status === 'completed').length
    const missionProgress = chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0

    const activeChapter = objectives.find(o => o.id === chain.activeChapter)
    const activeStep = objectives.find(o => o.id === chain.activeStep)
    const activeTask = objectives.find(o => o.id === chain.activeTask)

    const stepsInChapter = activeChapter
        ? objectives.filter(o => o.level === 'sub' && o.parent_id === activeChapter.id)
        : []
    const currentStepIndex = activeStep
        ? stepsInChapter.findIndex(s => s.id === activeStep.id) + 1
        : 0

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Buongiorno')
        else if (hour < 18) setGreeting('Buon pomeriggio')
        else setGreeting('Buonasera')
    }, [])

    useEffect(() => {
        if (user) loadData()
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

                const objs = (objData || []) as Objective[]
                setObjectives(objs)

                // Calculate chain
                const chainState = calculateChain(objs)
                setChain(chainState)

                // Determine phase
                const chaps = objs.filter(o => o.level === 'major')
                const hasSteps = objs.some(o => o.level === 'sub')
                const hasTasks = objs.some(o => o.level === 'task')

                if (chaps.length === 0) {
                    setPhase('mission_only')
                } else if (!hasSteps) {
                    setPhase('has_chapters')
                } else if (!hasTasks) {
                    setPhase('has_steps')
                } else {
                    setPhase('complete')
                }
            } else {
                setPhase('empty')
            }
        } catch (e) {
            console.log('No mission data yet')
            setPhase('empty')
        }

        setLoading(false)
    }

    const handleCompleteTask = async () => {
        if (!activeTask || !user) return

        try {
            // Mark task as completed
            await supabase
                .from('objectives')
                .update({
                    status: 'completed',
                    progress: 100,
                    completed_at: new Date().toISOString()
                })
                .eq('id', activeTask.id)

            // Reload data
            await loadData()
        } catch (e) {
            console.error('Error completing task:', e)
        }
    }

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="container">
                <div className="auth-prompt">
                    <div className="auth-icon">🎯</div>
                    <h1>La Mia Vita</h1>
                    <p>Accedi per vedere la tua missione</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    const userName = user?.firstName || 'Viaggiatore'

    return (
        <div className="container">
            <div className="bg-gradient"></div>
            <div className="bg-glow"></div>

            {/* Header */}
            <header className="header">
                <Link href="/" className="back">← Home</Link>
                <h1 className="header-title">La Mia Vita</h1>
                <UserButton afterSignOutUrl="/" />
            </header>

            <main className="main">
                {/* Greeting */}
                <div className="greeting">
                    <h2>{greeting}, <span className="name">{userName}</span></h2>
                </div>

                {/* ═══════════════════════════════════════════
                    STATO 0: EMPTY - Nessuna missione
                ═══════════════════════════════════════════ */}
                {phase === 'empty' && (
                    <section className="empty-state">
                        <div className="empty-icon">🎯</div>
                        <h3>Qual è il tuo obiettivo?</h3>
                        <p>NUR ti aiuterà a scoprirlo e raggiungerlo.</p>
                        <Link href="/chat" className="btn-primary">
                            💬 Parla con NUR
                        </Link>
                    </section>
                )}

                {/* ═══════════════════════════════════════════
                    STATO 1: MISSION_ONLY - Ha missione ma no capitoli
                ═══════════════════════════════════════════ */}
                {phase === 'mission_only' && mission && (
                    <section className="mission-card solo">
                        <div className="mission-badge">🎯 LA TUA MISSIONE</div>
                        <h3 className="mission-title">{mission.title}</h3>
                        {mission.description && (
                            <p className="mission-desc">{mission.description}</p>
                        )}
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '0%' }}></div>
                        </div>
                        <div className="progress-label">0%</div>

                        <div className="cta-box">
                            <p className="cta-text">Serve un piano per iniziare</p>
                            <Link href="/chat" className="btn-primary">
                                💬 Crea il piano con NUR
                            </Link>
                        </div>
                    </section>
                )}

                {/* ═══════════════════════════════════════════
                    STATI 2-3: Ha capitoli (con o senza task)
                ═══════════════════════════════════════════ */}
                {(phase === 'has_chapters' || phase === 'has_steps' || phase === 'complete') && mission && (
                    <>
                        {/* TASK HERO - Solo se c'è una task attiva */}
                        {activeTask && (
                            <section className="task-hero">
                                <div className="task-badge">🔥 LA TUA TASK</div>

                                <h3 className="task-title">{activeTask.title}</h3>

                                {activeTask.description && (
                                    <p className="task-desc">{activeTask.description}</p>
                                )}

                                {activeStep && (
                                    <div className="task-context">
                                        📍 Step {currentStepIndex} di {stepsInChapter.length} · {activeStep.title}
                                    </div>
                                )}

                                <div className="task-actions">
                                    <button className="btn-success" onClick={handleCompleteTask}>
                                        ✅ FATTO!
                                    </button>
                                    <Link href="/chat" className="btn-ghost">
                                        💬 Aiuto
                                    </Link>
                                </div>
                            </section>
                        )}

                        {/* CTA se mancano step o task */}
                        {!activeTask && (
                            <section className="cta-card">
                                <div className="cta-icon">⚠️</div>
                                <p className="cta-message">
                                    {phase === 'has_chapters' && activeChapter
                                        ? `Scomponi "${activeChapter.title}" in step`
                                        : phase === 'has_steps' && activeStep
                                            ? `Crea una task per "${activeStep.title}"`
                                            : 'Configura il prossimo passo'}
                                </p>
                                <Link href="/chat" className="btn-primary">
                                    💬 Definisci con NUR
                                </Link>
                            </section>
                        )}

                        {/* CHAPTER PROGRESS - Timeline orizzontale */}
                        {activeChapter && stepsInChapter.length > 0 && (
                            <section className="chapter-progress">
                                <div className="chapter-header">
                                    <span className="chapter-badge">📋 CAPITOLO {chapters.findIndex(c => c.id === activeChapter.id) + 1}</span>
                                    <span className="chapter-title">{activeChapter.title}</span>
                                </div>

                                <div className="steps-timeline">
                                    {stepsInChapter.map((step, idx) => {
                                        const state = getDisplayState(step, chain)
                                        return (
                                            <div key={step.id} className="step-node-wrapper">
                                                {idx > 0 && (
                                                    <div className={`step-line ${state === 'done' || (idx < currentStepIndex - 1) ? 'done' : ''}`}></div>
                                                )}
                                                <div className={`step-node ${state}`}>
                                                    {state === 'done' ? '✓' : state === 'current' ? '◉' : '○'}
                                                </div>
                                                <div className={`step-label ${state}`}>
                                                    {step.title.length > 15 ? step.title.slice(0, 15) + '...' : step.title}
                                                </div>
                                                {state === 'current' && (
                                                    <div className="step-indicator">↑ SEI QUI</div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        {/* MISSION BAR - Panoramica capitoli */}
                        <section className="mission-bar">
                            <div className="mission-header">
                                <span className="mission-badge">🎯 MISSIONE</span>
                                <span className="mission-title-small">{mission.title}</span>
                            </div>

                            <div className="chapters-grid">
                                {chapters.map((ch, idx) => {
                                    const state = getDisplayState(ch, chain)
                                    return (
                                        <div key={ch.id} className={`chapter-block ${state}`}>
                                            <div className="chapter-icon">
                                                {state === 'done' ? '✅' : state === 'current' ? '◉' : '🔒'}
                                            </div>
                                            <div className="chapter-num">Cap {idx + 1}</div>
                                        </div>
                                    )
                                })}
                                <div className="chapter-block final">
                                    <div className="chapter-icon">🏆</div>
                                    <div className="chapter-num">Fine</div>
                                </div>
                            </div>

                            <div className="mission-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${missionProgress}%` }}
                                    ></div>
                                </div>
                                <span className="progress-percent">{missionProgress}%</span>
                            </div>
                        </section>
                    </>
                )}

                {/* Quick Link to Scrivania */}
                <Link href="/giornale" className="scrivania-link">
                    <span className="scrivania-icon">📚</span>
                    <span className="scrivania-text">Vai alla Scrivania</span>
                    <span className="scrivania-arrow">→</span>
                </Link>
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <Link href="/" className="nav-item">
                    <span className="nav-icon">🏠</span>
                    <span className="nav-label">Home</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">NUR</span>
                </Link>
                <Link href="/la-mia-vita" className="nav-item active">
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">Dashboard</span>
                </Link>
                <Link href="/profilo" className="nav-item">
                    <span className="nav-icon">👤</span>
                    <span className="nav-label">Profilo</span>
                </Link>
            </nav>

            <style jsx>{styles}</style>
        </div>
    )
}

// ============================================
// STYLES
// ============================================

const styles = `
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

    /* Header */
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
    }

    .header-title {
        font-size: 18px;
        font-weight: 600;
    }

    /* Main */
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

    /* Empty State */
    .empty-state {
        text-align: center;
        padding: 60px 24px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
    }

    .empty-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .empty-state h3 {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 12px;
    }

    .empty-state p {
        color: rgba(255,255,255,0.5);
        margin-bottom: 28px;
    }

    /* Mission Card (solo) */
    .mission-card.solo {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 20px;
        padding: 24px;
        text-align: center;
    }

    .mission-badge {
        font-size: 11px;
        font-weight: 700;
        color: #667eea;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin-bottom: 16px;
    }

    .mission-title {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 8px;
    }

    .mission-desc {
        font-size: 14px;
        color: rgba(255,255,255,0.6);
        margin-bottom: 20px;
    }

    .progress-bar {
        height: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 4px;
        transition: width 0.5s ease;
    }

    .progress-label {
        font-size: 14px;
        color: rgba(255,255,255,0.5);
    }

    .cta-box {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.1);
    }

    .cta-text {
        color: rgba(255,255,255,0.6);
        margin-bottom: 16px;
        font-size: 14px;
    }

    /* CTA Card */
    .cta-card {
        background: rgba(255, 200, 50, 0.1);
        border: 1px solid rgba(255, 200, 50, 0.3);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        margin-bottom: 20px;
    }

    .cta-icon {
        font-size: 32px;
        margin-bottom: 12px;
    }

    .cta-message {
        color: rgba(255,255,255,0.8);
        margin-bottom: 16px;
    }

    /* Task Hero */
    .task-hero {
        background: linear-gradient(135deg, rgba(255, 146, 43, 0.15) 0%, rgba(255, 107, 107, 0.15) 100%);
        border: 1px solid rgba(255, 146, 43, 0.3);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 20px;
    }

    .task-badge {
        font-size: 11px;
        font-weight: 700;
        color: #ff922b;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin-bottom: 12px;
    }

    .task-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
    }

    .task-desc {
        font-size: 14px;
        color: rgba(255,255,255,0.6);
        line-height: 1.5;
        margin-bottom: 12px;
    }

    .task-context {
        font-size: 13px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 20px;
    }

    .task-actions {
        display: flex;
        gap: 12px;
    }

    /* Chapter Progress */
    .chapter-progress {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .chapter-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
    }

    .chapter-badge {
        font-size: 11px;
        font-weight: 700;
        color: rgba(255,255,255,0.5);
        letter-spacing: 1px;
    }

    .chapter-title {
        font-size: 14px;
        color: rgba(255,255,255,0.8);
    }

    .steps-timeline {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        position: relative;
        padding: 0 10px;
    }

    .step-node-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        flex: 1;
    }

    .step-line {
        position: absolute;
        top: 12px;
        right: 50%;
        width: 100%;
        height: 2px;
        background: rgba(255,255,255,0.1);
    }

    .step-line.done {
        background: #51cf66;
    }

    .step-node {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        position: relative;
        z-index: 2;
        background: #050510;
    }

    .step-node.done {
        background: #51cf66;
        color: #fff;
    }

    .step-node.current {
        background: #667eea;
        color: #fff;
        box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
    }

    .step-node.locked {
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.3);
    }

    .step-label {
        font-size: 11px;
        margin-top: 8px;
        text-align: center;
        color: rgba(255,255,255,0.5);
        max-width: 80px;
    }

    .step-label.current {
        color: #667eea;
        font-weight: 600;
    }

    .step-label.done {
        color: #51cf66;
    }

    .step-indicator {
        font-size: 10px;
        color: #667eea;
        margin-top: 4px;
        font-weight: 600;
    }

    /* Mission Bar */
    .mission-bar {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .mission-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
    }

    .mission-title-small {
        font-size: 14px;
        color: rgba(255,255,255,0.8);
    }

    .chapters-grid {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-bottom: 16px;
        flex-wrap: wrap;
    }

    .chapter-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        min-width: 60px;
    }

    .chapter-block.done {
        background: rgba(81, 207, 102, 0.15);
    }

    .chapter-block.current {
        background: rgba(102, 126, 234, 0.2);
        border: 1px solid rgba(102, 126, 234, 0.4);
    }

    .chapter-block.locked {
        opacity: 0.4;
    }

    .chapter-block.final {
        background: rgba(255, 200, 50, 0.1);
    }

    .chapter-icon {
        font-size: 18px;
        margin-bottom: 4px;
    }

    .chapter-num {
        font-size: 11px;
        color: rgba(255,255,255,0.5);
    }

    .mission-progress {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .mission-progress .progress-bar {
        flex: 1;
        margin-bottom: 0;
    }

    .progress-percent {
        font-size: 14px;
        font-weight: 600;
        color: #667eea;
        min-width: 40px;
    }

    /* Scrivania Link */
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

    /* Buttons */
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
    }

    /* Bottom Navigation */
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

    .nav-icon {
        font-size: 22px;
    }

    .nav-label {
        font-size: 11px;
        font-weight: 500;
    }

    /* Auth Prompt */
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

    /* Responsive */
    @media (max-width: 480px) {
        .main {
            padding: 16px;
        }

        .greeting h2 {
            font-size: 22px;
        }

        .task-actions {
            flex-direction: column;
        }

        .chapters-grid {
            gap: 6px;
        }

        .chapter-block {
            padding: 10px 12px;
            min-width: 50px;
        }
    }
`
