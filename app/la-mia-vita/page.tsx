'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

interface Profile {
    level: number
    xp: number
    xp_to_next_level: number
    streak: number
    lives: number
    max_lives: number
    rank: string
    rank_bonus: number
    game_over: boolean
}

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
    difficulty: string
    xp_reward: number
    estimated_minutes: number | null
}

interface TaskMaterial {
    id: string
    title: string
    description: string | null
    material_type: string
    content: string | null
    url: string | null
    icon: string
}

interface TaskNote {
    id: string
    content: string
}

interface ChainState {
    activeChapter: string | null
    activeStep: string | null
    activeTask: string | null
}

type DashboardPhase = 'empty' | 'mission_only' | 'has_chapters' | 'has_steps' | 'complete'
type ActivePanel = null | 'desk' | 'dashboard' | 'notes'

// ============================================
// RANK CONFIG
// ============================================

// Titoli per livello (stile RPG)
function getLevelTitle(level: number): { title: string; emoji: string } {
    if (level <= 5) return { title: 'Dormiente', emoji: '🌱' }
    if (level <= 10) return { title: 'Risvegliato', emoji: '🌿' }
    if (level <= 15) return { title: 'Cercatore', emoji: '🌳' }
    if (level <= 20) return { title: 'Viaggiatore', emoji: '⭐' }
    if (level <= 30) return { title: 'Maestro', emoji: '🔥' }
    if (level <= 50) return { title: 'Saggio', emoji: '👑' }
    return { title: 'Leggenda', emoji: '🌌' }
}

// Moltiplicatore streak
function getStreakMultiplier(streak: number): number {
    if (streak >= 30) return 2.0
    if (streak >= 14) return 1.5
    if (streak >= 7) return 1.25
    if (streak >= 3) return 1.1
    return 1.0
}

const RANK_CONFIG: Record<string, { emoji: string; title: string }> = {
    'dormiente': { emoji: '🌱', title: 'Dormiente' },
    'risvegliato': { emoji: '🌿', title: 'Risvegliato' },
    'cercatore': { emoji: '🌳', title: 'Cercatore' },
    'apprendista': { emoji: '⭐', title: 'Apprendista' },
    'praticante': { emoji: '🌟', title: 'Praticante' },
    'esperto': { emoji: '💫', title: 'Esperto' },
    'maestro': { emoji: '🔥', title: 'Maestro' },
    'saggio': { emoji: '👑', title: 'Saggio' },
    'trasceso': { emoji: '🌌', title: 'Trasceso' }
}

const DIFFICULTY_XP: Record<string, number> = {
    'facile': 30,
    'media': 60,
    'difficile': 100,
    'epica': 200,
    'leggendaria': 500
}

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
    const [loading, setLoading] = useState(true)

    // Profile/Game data
    const [profile, setProfile] = useState<Profile>({
        level: 1,
        xp: 0,
        xp_to_next_level: 100,
        streak: 0,
        lives: 3,
        max_lives: 3,
        rank: 'dormiente',
        rank_bonus: 0,
        game_over: false
    })

    // Mission data
    const [mission, setMission] = useState<Mission | null>(null)
    const [objectives, setObjectives] = useState<Objective[]>([])
    const [chain, setChain] = useState<ChainState>({ activeChapter: null, activeStep: null, activeTask: null })
    const [phase, setPhase] = useState<DashboardPhase>('empty')

    // Task materials & notes
    const [materials, setMaterials] = useState<TaskMaterial[]>([])
    const [taskNote, setTaskNote] = useState('')
    const [activePanel, setActivePanel] = useState<ActivePanel>(null)

    // Completion modal
    const [showModal, setShowModal] = useState(false)
    const [xpGained, setXpGained] = useState(0)

    // Onboarding
    const [isNewUser, setIsNewUser] = useState(false)
    const [xpToday, setXpToday] = useState(0)

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

    const rankInfo = RANK_CONFIG[profile.rank] || RANK_CONFIG['dormiente']
    const levelTitle = getLevelTitle(profile.level)
    const streakMultiplier = getStreakMultiplier(profile.streak)
    const xpProgress = profile.xp_to_next_level > 0
        ? Math.round((profile.xp / profile.xp_to_next_level) * 100)
        : 0

    useEffect(() => {
        if (user) loadData()
    }, [user])

    const loadData = async () => {
        if (!user) return

        try {
            // Load profile with game stats AND onboarding status
            const { data: profileData } = await supabase
                .from('profiles')
                .select('level, xp, xp_to_next_level, streak, lives, max_lives, rank, rank_bonus, game_over, onboarding_completed')
                .eq('clerk_user_id', user.id)
                .single()

            if (profileData) {
                setProfile({
                    level: profileData.level || 1,
                    xp: profileData.xp || 0,
                    xp_to_next_level: profileData.xp_to_next_level || 100,
                    streak: profileData.streak || 0,
                    lives: profileData.lives ?? 3,
                    max_lives: profileData.max_lives || 3,
                    rank: profileData.rank || 'dormiente',
                    rank_bonus: profileData.rank_bonus || 0,
                    game_over: profileData.game_over || false
                })
                // Check if new user
                setIsNewUser(!profileData.onboarding_completed)
            } else {
                // No profile = definitely new user
                setIsNewUser(true)
            }

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

                // Load task materials if there's an active task
                if (chainState.activeTask) {
                    const { data: matData } = await supabase
                        .from('task_materials')
                        .select('*')
                        .eq('objective_id', chainState.activeTask)
                        .order('sort_order')

                    setMaterials(matData || [])

                    // Load task note
                    const { data: noteData } = await supabase
                        .from('task_notes')
                        .select('content')
                        .eq('objective_id', chainState.activeTask)
                        .single()

                    if (noteData) setTaskNote(noteData.content)
                }

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

        const xpBase = activeTask.xp_reward || DIFFICULTY_XP[activeTask.difficulty || 'media'] || 60

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

            // Add XP (simplified - in production use the SQL function)
            const streakMult = profile.streak >= 30 ? 2.0 : profile.streak >= 14 ? 1.5 : profile.streak >= 7 ? 1.25 : profile.streak >= 3 ? 1.1 : 1.0
            const rankMult = 1 + profile.rank_bonus
            const finalXp = Math.floor(xpBase * streakMult * rankMult)

            let newXp = profile.xp + finalXp
            let newLevel = profile.level
            let xpToNext = profile.xp_to_next_level

            // Check level up
            while (newXp >= xpToNext) {
                newXp -= xpToNext
                newLevel++
                xpToNext = Math.floor(100 * Math.pow(newLevel, 1.5))
            }

            await supabase
                .from('profiles')
                .update({
                    xp: newXp,
                    level: newLevel,
                    xp_to_next_level: xpToNext,
                    last_activity_date: new Date().toISOString().split('T')[0]
                })
                .eq('clerk_user_id', user.id)

            // Show modal
            setXpGained(finalXp)
            setShowModal(true)

            // Reload data after a short delay
            setTimeout(() => {
                loadData()
            }, 500)
        } catch (e) {
            console.error('Error completing task:', e)
        }
    }

    const handleSkipTask = async () => {
        if (!activeTask || !user) return

        if (!confirm('⚠️ Saltare costa -10 XP. Confermi?')) return

        try {
            await supabase
                .from('objectives')
                .update({ status: 'skipped' })
                .eq('id', activeTask.id)

            // Deduct XP
            const newXp = Math.max(0, profile.xp - 10)
            await supabase
                .from('profiles')
                .update({ xp: newXp })
                .eq('clerk_user_id', user.id)

            await loadData()
        } catch (e) {
            console.error('Error skipping task:', e)
        }
    }

    const handleSaveNote = async () => {
        if (!activeTask || !user) return

        try {
            // Upsert note
            await supabase
                .from('task_notes')
                .upsert({
                    clerk_user_id: user.id,
                    objective_id: activeTask.id,
                    content: taskNote,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'objective_id' })

            alert('Note salvate!')
        } catch (e) {
            console.error('Error saving note:', e)
        }
    }

    const togglePanel = (panel: ActivePanel) => {
        setActivePanel(activePanel === panel ? null : panel)
    }

    if (!isLoaded || loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Caricamento...</p>
                <style jsx>{styles}</style>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="container">
                <div className="auth-prompt">
                    <div className="auth-icon">🎯</div>
                    <h1>Il Gioco della Vita</h1>
                    <p>Accedi per iniziare la tua avventura</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    return (
        <div className="container">
            <div className="bg-ambient"></div>

            {/* ═══════════════════════════════════════════
                TOP BAR - Level, XP, Streak, Lives
            ═══════════════════════════════════════════ */}
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="player">
                        <Link href="/" className="home-btn">🏠</Link>
                        <div className="level-badge" style={{ '--progress': xpProgress } as React.CSSProperties}>
                            <div className="level-ring"></div>
                            <div className="level-inner">
                                <span className="level-num">{profile.level}</span>
                            </div>
                        </div>
                        <div className="player-info">
                            <div className="player-rank">{levelTitle.emoji} {levelTitle.title}</div>
                            <div className="xp-row">
                                <div className="xp-bar">
                                    <div className="xp-fill" style={{ width: `${xpProgress}%` }}></div>
                                </div>
                                <span className="xp-text">{profile.xp} / {profile.xp_to_next_level}</span>
                            </div>
                        </div>
                    </div>

                    <div className="stats">
                        <div className="streak" title={`${streakMultiplier}x XP`}>
                            <span>🔥</span>
                            <span>{profile.streak}</span>
                            {streakMultiplier > 1 && <span className="streak-mult">×{streakMultiplier}</span>}
                        </div>
                        <div className="lives">
                            {Array.from({ length: profile.max_lives }).map((_, i) => (
                                <span key={i} className={`heart ${i >= profile.lives ? 'dead' : ''}`}>❤️</span>
                            ))}
                        </div>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </header>

            {/* ═══════════════════════════════════════════
                MAIN CONTENT
            ═══════════════════════════════════════════ */}
            <main className="main">
                {/* ═══════════════════════════════════════════
                    ONBOARDING SCREEN - Prima visita
                ═══════════════════════════════════════════ */}
                {isNewUser && phase === 'empty' && (
                    <section className="onboarding-screen">
                        <div className="onboarding-glow"></div>
                        <div className="nur-avatar-large">
                            <div className="avatar-ring"></div>
                            <span className="avatar-emoji">🌟</span>
                        </div>
                        <h1 className="onboarding-title">Ciao! Sono NUR</h1>
                        <p className="onboarding-subtitle">
                            Il tuo coach personale per trasformare i sogni in realtà.
                        </p>

                        <div className="first-quest">
                            <div className="quest-badge">
                                <span>⭐</span> PRIMA QUEST
                            </div>
                            <h3>Parlami di te</h3>
                            <p>Raccontami chi sei e cosa vuoi raggiungere.</p>
                            <div className="quest-reward">
                                <span className="reward-xp">+100 XP</span>
                            </div>
                        </div>

                        <Link href="/chat" className="btn-primary-lg pulse">
                            💬 Inizia la conversazione
                        </Link>

                        <div className="preview-blurred">
                            <div className="preview-item">📊 Dashboard</div>
                            <div className="preview-item">🎯 Missioni</div>
                            <div className="preview-item">📚 Scrivania</div>
                            <div className="preview-item">🔥 Streak</div>
                        </div>
                    </section>
                )}

                {/* ═══════════════════════════════════════════
                    STATO 0: EMPTY - Nessuna missione (utente non nuovo)
                ═══════════════════════════════════════════ */}
                {!isNewUser && phase === 'empty' && (
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
                        <h3 className="mission-title-lg">{mission.title}</h3>
                        {mission.description && (
                            <p className="mission-desc">{mission.description}</p>
                        )}
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '0%' }}></div>
                        </div>
                        <div className="progress-label">0%</div>

                        <div className="cta-box">
                            <p className="cta-text">⚠️ Serve un piano per iniziare</p>
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
                        {/* ═══════════════════════════════════════════
                            TASK SECTION - Hero + Panels
                        ═══════════════════════════════════════════ */}
                        <section className="task-section">
                            {activeTask ? (
                                <div className="task-hero">
                                    <div className="task-meta">
                                        <div className="task-badge">
                                            <span className="dot"></span>
                                            <span>Task Attiva</span>
                                        </div>
                                        {activeChapter && (
                                            <span className="task-chapter">
                                                📍 Capitolo {chapters.findIndex(c => c.id === activeChapter.id) + 1} › {activeChapter.title}
                                            </span>
                                        )}
                                    </div>

                                    <h1 className="task-title">{activeTask.title}</h1>

                                    {activeTask.description && (
                                        <p className="task-desc">{activeTask.description}</p>
                                    )}

                                    <div className="task-rewards">
                                        {/* XP Breakdown */}
                                        {(() => {
                                            const baseXp = activeTask.xp_reward || DIFFICULTY_XP[activeTask.difficulty || 'media'] || 60
                                            const totalXp = Math.round(baseXp * streakMultiplier)
                                            const hasBonus = streakMultiplier > 1

                                            return (
                                                <div className="xp-breakdown">
                                                    {hasBonus ? (
                                                        <>
                                                            <span className="xp-base">{baseXp}</span>
                                                            <span className="xp-mult">× {streakMultiplier}</span>
                                                            <span className="xp-equals">=</span>
                                                            <span className="xp-total">+{totalXp} XP</span>
                                                        </>
                                                    ) : (
                                                        <span className="xp-total">+{baseXp} XP</span>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                        <div className="reward">⚔️ {activeTask.difficulty || 'Media'}</div>
                                        {activeTask.estimated_minutes && (
                                            <div className="reward">⏱️ ~{activeTask.estimated_minutes} min</div>
                                        )}
                                    </div>

                                    <div className="task-actions">
                                        <button className="btn btn-complete" onClick={handleCompleteTask}>
                                            ✓ HO FINITO
                                        </button>
                                        <button className="btn btn-ghost" onClick={handleSkipTask}>
                                            Salta →
                                        </button>
                                        <Link href="/chat" className="btn btn-nur">
                                            💬 Chiedi a NUR
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="task-hero empty">
                                    <div className="cta-icon">⚠️</div>
                                    <p className="cta-message">
                                        {phase === 'has_chapters' && activeChapter
                                            ? `Scomponi "${activeChapter.title}" in step`
                                            : phase === 'has_steps' && activeStep
                                                ? `Crea una task per "${activeStep.title}"`
                                                : 'Configura il prossimo passo'}
                                    </p>
                                    <Link href="/chat" className="btn btn-nur">
                                        💬 Definisci con NUR
                                    </Link>
                                </div>
                            )}

                            {/* Panels Tabs */}
                            {activeTask && (
                                <>
                                    <div className="panels-tabs">
                                        <button
                                            className={`panel-tab ${activePanel === 'desk' ? 'active' : ''}`}
                                            onClick={() => togglePanel('desk')}
                                        >
                                            <span className="icon">🗂️</span>
                                            <span>Scrivania</span>
                                        </button>
                                        <button
                                            className={`panel-tab ${activePanel === 'dashboard' ? 'active' : ''}`}
                                            onClick={() => togglePanel('dashboard')}
                                        >
                                            <span className="icon">📊</span>
                                            <span>Dashboard</span>
                                        </button>
                                        <button
                                            className={`panel-tab ${activePanel === 'notes' ? 'active' : ''}`}
                                            onClick={() => togglePanel('notes')}
                                        >
                                            <span className="icon">📝</span>
                                            <span>Note</span>
                                        </button>
                                    </div>

                                    {/* Panel: Scrivania */}
                                    {activePanel === 'desk' && (
                                        <div className="panel-content">
                                            <div className="desk-section">
                                                <div className="desk-title">📄 Materiali per questa Task</div>
                                                {materials.length > 0 ? (
                                                    <div className="materials-list">
                                                        {materials.map(mat => (
                                                            <div key={mat.id} className="material-item">
                                                                <div className="material-icon">{mat.icon || '📄'}</div>
                                                                <div className="material-info">
                                                                    <div className="material-name">{mat.title}</div>
                                                                    {mat.description && (
                                                                        <div className="material-desc">{mat.description}</div>
                                                                    )}
                                                                </div>
                                                                {mat.url && (
                                                                    <a href={mat.url} target="_blank" rel="noopener noreferrer" className="material-action">
                                                                        Apri →
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="empty-materials">Nessun materiale ancora. NUR può crearne durante la conversazione.</p>
                                                )}
                                            </div>

                                            <Link href="/giornale" className="scrivania-full-link">
                                                📚 Vai alla Scrivania completa →
                                            </Link>
                                        </div>
                                    )}

                                    {/* Panel: Dashboard Task */}
                                    {activePanel === 'dashboard' && (
                                        <div className="panel-content">
                                            <div className="dash-grid">
                                                <div className="dash-stat">
                                                    <div className="dash-stat-label">XP Guadagnati Oggi</div>
                                                    <div className="dash-stat-value">+{xpGained}</div>
                                                </div>
                                                <div className="dash-stat">
                                                    <div className="dash-stat-label">Step Corrente</div>
                                                    <div className="dash-stat-value">{currentStepIndex}/{stepsInChapter.length}</div>
                                                </div>
                                                <div className="dash-stat">
                                                    <div className="dash-stat-label">Capitolo</div>
                                                    <div className="dash-stat-value">{chapters.findIndex(c => c.id === chain.activeChapter) + 1}/{chapters.length}</div>
                                                </div>
                                                <div className="dash-stat">
                                                    <div className="dash-stat-label">Missione</div>
                                                    <div className="dash-stat-value">{missionProgress}%</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Panel: Note */}
                                    {activePanel === 'notes' && (
                                        <div className="panel-content">
                                            <textarea
                                                className="notes-area"
                                                placeholder="Scrivi qui le tue note per questa task..."
                                                value={taskNote}
                                                onChange={(e) => setTaskNote(e.target.value)}
                                            />
                                            <div className="notes-actions">
                                                <button className="btn btn-ghost" onClick={handleSaveNote}>
                                                    💾 Salva Note
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>

                        {/* ═══════════════════════════════════════════
                            CHAPTER PROGRESS - Card con obiettivi
                        ═══════════════════════════════════════════ */}
                        {activeChapter && (
                            <section className="card">
                                <div className="card-header">
                                    <div>
                                        <div className="card-label">Capitolo {chapters.findIndex(c => c.id === activeChapter.id) + 1}</div>
                                        <div className="card-title">{activeChapter.title}</div>
                                    </div>
                                    <div className="card-value">{activeChapter.progress || 0}%</div>
                                </div>

                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ width: `${activeChapter.progress || 0}%` }}></div>
                                </div>

                                {stepsInChapter.length > 0 && (
                                    <div className="objectives">
                                        {stepsInChapter.map(step => {
                                            const state = getDisplayState(step, chain)
                                            return (
                                                <div key={step.id} className="obj-item">
                                                    <div className={`obj-check ${state}`}>
                                                        {state === 'done' ? '✓' : state === 'current' ? '●' : '🔒'}
                                                    </div>
                                                    <span className={`obj-text ${state}`}>{step.title}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ═══════════════════════════════════════════
                            JOURNEY - Timeline visuale capitoli
                        ═══════════════════════════════════════════ */}
                        <section className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-label">Il tuo</div>
                                    <div className="card-title">Viaggio</div>
                                </div>
                            </div>

                            <div className="journey">
                                <div className="journey-line"></div>
                                <div
                                    className="journey-fill"
                                    style={{ width: `${chapters.length > 1 ? (completedChapters / (chapters.length - 1)) * 100 : 0}%` }}
                                ></div>

                                {chapters.map((ch, idx) => {
                                    const state = getDisplayState(ch, chain)
                                    return (
                                        <div key={ch.id} className={`journey-node ${state}`}>
                                            {state === 'done' ? '✓' : state === 'current' ? idx + 1 : '?'}
                                        </div>
                                    )
                                })}
                                <div className="journey-node final">🏆</div>
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════
                            MISSION CARD - Destinazione finale
                        ═══════════════════════════════════════════ */}
                        <section className="mission-card">
                            <div className="mission-icon">🎯</div>
                            <div className="mission-label">Destinazione Finale</div>
                            <div className="mission-title">{mission.title}</div>
                            {mission.description && (
                                <div className="mission-sub">{mission.description}</div>
                            )}
                            <div className="mission-progress">
                                <div className="mission-progress-fill" style={{ width: `${missionProgress}%` }}></div>
                            </div>
                            <div className="mission-pct">{missionProgress}%</div>
                        </section>
                    </>
                )}
            </main>

            {/* ═══════════════════════════════════════════
                BOTTOM NAV
            ═══════════════════════════════════════════ */}
            <nav className="bottomnav">
                <div className="bottomnav-inner">
                    <Link href="/la-mia-vita" className="nav-item active">
                        <span className="nav-icon">📖</span>
                        <span className="nav-label">Storia</span>
                    </Link>
                    <Link href="/chat" className="nav-item">
                        <span className="nav-icon">💬</span>
                        <span className="nav-label">NUR</span>
                    </Link>
                    <Link href="/quest" className="nav-item">
                        <span className="nav-icon">🎮</span>
                        <span className="nav-label">Quest</span>
                    </Link>
                    <Link href="/giornale" className="nav-item">
                        <span className="nav-icon">🗂️</span>
                        <span className="nav-label">Scrivania</span>
                    </Link>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════
                COMPLETION MODAL
            ═══════════════════════════════════════════ */}
            {showModal && (
                <div className="modal-overlay show">
                    <div className="modal">
                        <div className="modal-emoji">🎉</div>
                        <h2 className="modal-title">Task Completata!</h2>
                        <div className="modal-xp">+{xpGained} XP</div>
                        <div className="modal-streak">🔥 Streak: {profile.streak + 1} giorni!</div>
                        <button className="modal-btn" onClick={() => setShowModal(false)}>
                            Continua →
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{styles}</style>
        </div>
    )
}

// ============================================
// STYLES - Gaming Design
// ============================================

const styles = `
    :root {
        --bg: #030305;
        --surface: #0a0a0f;
        --surface-2: #12121a;
        --border: rgba(255,255,255,0.06);
        --border-glow: rgba(139, 92, 246, 0.2);
        --text: #f5f5f7;
        --text-dim: #a0a0b0;
        --text-muted: #606070;
        --primary: #8b5cf6;
        --primary-light: #a78bfa;
        --primary-glow: rgba(139, 92, 246, 0.4);
        --accent: #d946ef;
        --success: #22c55e;
        --success-glow: rgba(34, 197, 94, 0.4);
        --warning: #f59e0b;
        --danger: #ef4444;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    .container {
        font-family: 'Space Grotesk', system-ui, sans-serif;
        background: var(--bg);
        color: var(--text);
        min-height: 100vh;
        line-height: 1.5;
    }

    .bg-ambient {
        position: fixed;
        inset: 0;
        z-index: 0;
        background:
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(217, 70, 239, 0.05) 0%, transparent 50%);
        pointer-events: none;
    }

    /* ═══════════════════════════════════════════
       TOP BAR
    ═══════════════════════════════════════════ */
    .topbar {
        position: sticky;
        top: 0;
        z-index: 100;
        background: rgba(3, 3, 5, 0.9);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--border);
    }

    .topbar-inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
    }

    .home-btn {
        text-decoration: none;
        font-size: 1.25rem;
        margin-right: 8px;
    }

    .player {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .level-badge {
        position: relative;
        width: 48px;
        height: 48px;
    }

    .level-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(
            from -90deg,
            var(--primary) calc(var(--progress, 0) * 3.6deg),
            rgba(255,255,255,0.1) calc(var(--progress, 0) * 3.6deg)
        );
    }

    .level-inner {
        position: absolute;
        inset: 3px;
        background: var(--bg);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .level-num {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.125rem;
        font-weight: 800;
    }

    .player-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .player-rank {
        font-weight: 700;
        font-size: 0.9375rem;
    }

    .xp-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .xp-bar {
        width: 100px;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        overflow: hidden;
    }

    .xp-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        transition: width 1s ease;
    }

    .xp-text {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6875rem;
        color: var(--text-dim);
    }

    .stats {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .streak {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.2);
        border-radius: 100px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        font-size: 0.875rem;
        color: var(--warning);
    }

    .lives {
        display: flex;
        gap: 2px;
        font-size: 1rem;
    }

    .heart.dead { opacity: 0.2; }

    /* ═══════════════════════════════════════════
       MAIN
    ═══════════════════════════════════════════ */
    .main {
        position: relative;
        z-index: 1;
        max-width: 800px;
        margin: 0 auto;
        padding: 24px 20px 120px;
    }

    /* ═══════════════════════════════════════════
       TASK SECTION
    ═══════════════════════════════════════════ */
    .task-section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        overflow: hidden;
        margin-bottom: 20px;
    }

    .task-hero {
        padding: 28px;
    }

    .task-hero.empty {
        text-align: center;
        padding: 40px 28px;
    }

    .task-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
    }

    .task-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 100px;
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--primary-light);
    }

    .task-badge .dot {
        width: 6px;
        height: 6px;
        background: var(--primary);
        border-radius: 50%;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    .task-chapter {
        font-size: 0.8125rem;
        color: var(--text-dim);
    }

    .task-title {
        font-size: clamp(1.375rem, 4vw, 1.75rem);
        font-weight: 800;
        margin-bottom: 8px;
        line-height: 1.3;
    }

    .task-desc {
        color: var(--text-dim);
        font-size: 0.9375rem;
        max-width: 600px;
        margin-bottom: 20px;
    }

    .task-rewards {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 20px;
    }

    .reward {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--border);
        border-radius: 100px;
        font-size: 0.8125rem;
        font-weight: 600;
    }

    .reward.xp {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.2);
        color: var(--success);
    }

    .task-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }

    .btn {
        padding: 14px 24px;
        border: none;
        border-radius: 12px;
        font-family: inherit;
        font-size: 0.9375rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s;
        text-decoration: none;
        text-align: center;
    }

    .btn-complete {
        background: linear-gradient(135deg, var(--success), #16a34a);
        color: white;
        box-shadow: 0 4px 15px var(--success-glow);
    }

    .btn-complete:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px var(--success-glow);
    }

    .btn-ghost {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-dim);
    }

    .btn-ghost:hover {
        border-color: var(--primary);
        color: var(--primary);
    }

    .btn-nur {
        background: linear-gradient(135deg, var(--primary), var(--accent));
        color: white;
        padding: 14px 20px;
    }

    .btn-nur:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px var(--primary-glow);
    }

    .btn-primary {
        background: linear-gradient(135deg, var(--primary), var(--accent));
        color: white;
        padding: 14px 28px;
    }

    /* ═══════════════════════════════════════════
       PANELS
    ═══════════════════════════════════════════ */
    .panels-tabs {
        display: flex;
        border-top: 1px solid var(--border);
    }

    .panel-tab {
        flex: 1;
        padding: 14px;
        background: transparent;
        border: none;
        border-right: 1px solid var(--border);
        color: var(--text-dim);
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .panel-tab:last-child { border-right: none; }

    .panel-tab:hover {
        background: rgba(255,255,255,0.02);
        color: var(--text);
    }

    .panel-tab.active {
        background: var(--surface-2);
        color: var(--primary);
    }

    .panel-tab .icon { font-size: 1rem; }

    .panel-content {
        padding: 24px;
        background: var(--surface-2);
        border-top: 1px solid var(--border);
    }

    .desk-section {
        margin-bottom: 20px;
    }

    .desk-title {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--text-muted);
        margin-bottom: 12px;
    }

    .materials-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .material-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .material-item:hover {
        border-color: var(--primary);
        background: rgba(139, 92, 246, 0.05);
    }

    .material-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(139, 92, 246, 0.1);
        border-radius: 8px;
        font-size: 1rem;
    }

    .material-info { flex: 1; }

    .material-name {
        font-weight: 600;
        font-size: 0.875rem;
        margin-bottom: 2px;
    }

    .material-desc {
        font-size: 0.75rem;
        color: var(--text-dim);
    }

    .material-action {
        color: var(--primary);
        font-size: 0.75rem;
        font-weight: 600;
        text-decoration: none;
    }

    .empty-materials {
        color: var(--text-muted);
        font-size: 0.875rem;
        text-align: center;
        padding: 20px;
    }

    .scrivania-full-link {
        display: block;
        text-align: center;
        padding: 12px;
        color: var(--primary);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .dash-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
    }

    .dash-stat {
        padding: 16px;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border);
        border-radius: 12px;
        text-align: center;
    }

    .dash-stat-label {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
        margin-bottom: 4px;
    }

    .dash-stat-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--primary);
    }

    .notes-area {
        width: 100%;
        min-height: 150px;
        padding: 14px;
        background: rgba(0,0,0,0.3);
        border: 1px solid var(--border);
        border-radius: 10px;
        color: var(--text);
        font-family: inherit;
        font-size: 0.875rem;
        resize: vertical;
    }

    .notes-area::placeholder { color: var(--text-muted); }

    .notes-actions {
        margin-top: 12px;
        text-align: right;
    }

    /* ═══════════════════════════════════════════
       CARDS
    ═══════════════════════════════════════════ */
    .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
    }

    .card-label {
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--text-muted);
        margin-bottom: 4px;
    }

    .card-title {
        font-size: 1rem;
        font-weight: 700;
    }

    .card-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--primary);
    }

    .progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        margin-bottom: 16px;
        overflow: hidden;
    }

    .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        transition: width 1s ease;
    }

    .objectives {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .obj-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: rgba(255,255,255,0.02);
        border-radius: 8px;
    }

    .obj-check {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.6875rem;
        font-weight: 700;
    }

    .obj-check.done {
        background: rgba(34, 197, 94, 0.15);
        color: var(--success);
    }

    .obj-check.current {
        background: rgba(139, 92, 246, 0.15);
        color: var(--primary);
        box-shadow: 0 0 0 2px var(--primary);
    }

    .obj-check.locked {
        background: rgba(255,255,255,0.05);
        color: var(--text-muted);
    }

    .obj-text {
        flex: 1;
        font-size: 0.8125rem;
    }

    .obj-text.done {
        color: var(--text-dim);
        text-decoration: line-through;
    }

    .obj-text.locked { color: var(--text-muted); }

    /* ═══════════════════════════════════════════
       JOURNEY
    ═══════════════════════════════════════════ */
    .journey {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        padding: 20px 0;
    }

    .journey-line {
        position: absolute;
        top: 50%;
        left: 30px;
        right: 30px;
        height: 2px;
        background: rgba(255,255,255,0.1);
        transform: translateY(-50%);
    }

    .journey-fill {
        position: absolute;
        top: 50%;
        left: 30px;
        height: 2px;
        background: linear-gradient(90deg, var(--success), var(--primary));
        transform: translateY(-50%);
        transition: width 1s ease;
    }

    .journey-node {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.75rem;
        position: relative;
        z-index: 1;
        background: var(--surface-2);
        border: 1px solid var(--border);
        color: var(--text-muted);
    }

    .journey-node.done {
        background: var(--success);
        color: white;
        border: none;
    }

    .journey-node.current {
        background: var(--primary);
        color: white;
        border: none;
        box-shadow: 0 0 20px var(--primary-glow);
    }

    .journey-node.final {
        background: rgba(255, 200, 50, 0.2);
        border-color: rgba(255, 200, 50, 0.3);
        font-size: 1rem;
    }

    /* ═══════════════════════════════════════════
       MISSION CARD
    ═══════════════════════════════════════════ */
    .mission-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        margin-bottom: 16px;
    }

    .mission-card.solo {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(217, 70, 239, 0.1) 100%);
        border-color: rgba(139, 92, 246, 0.3);
    }

    .mission-icon {
        font-size: 2.5rem;
        margin-bottom: 8px;
    }

    .mission-label, .mission-badge {
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--text-muted);
        margin-bottom: 4px;
    }

    .mission-badge {
        color: var(--primary);
        margin-bottom: 16px;
    }

    .mission-title, .mission-title-lg {
        font-size: 1.125rem;
        font-weight: 800;
        margin-bottom: 2px;
    }

    .mission-title-lg {
        font-size: 1.375rem;
        margin-bottom: 8px;
    }

    .mission-sub, .mission-desc {
        font-size: 0.875rem;
        color: var(--text-dim);
        margin-bottom: 16px;
    }

    .mission-progress {
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        margin-bottom: 8px;
        overflow: hidden;
    }

    .mission-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), #f472b6);
    }

    .mission-pct {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.75rem;
        font-weight: 900;
        color: var(--accent);
    }

    .progress-label {
        font-size: 0.875rem;
        color: var(--text-dim);
    }

    .cta-box {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.1);
    }

    .cta-text {
        color: var(--text-dim);
        margin-bottom: 16px;
        font-size: 0.9375rem;
    }

    .cta-icon {
        font-size: 2rem;
        margin-bottom: 12px;
    }

    .cta-message {
        color: var(--text-dim);
        margin-bottom: 20px;
    }

    /* ═══════════════════════════════════════════
       BOTTOM NAV
    ═══════════════════════════════════════════ */
    .bottomnav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(3, 3, 5, 0.95);
        backdrop-filter: blur(20px);
        border-top: 1px solid var(--border);
        padding: 8px 20px calc(8px + env(safe-area-inset-bottom));
        z-index: 100;
    }

    .bottomnav-inner {
        max-width: 400px;
        margin: 0 auto;
        display: flex;
        justify-content: space-around;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-radius: 12px;
        color: var(--text-muted);
        font-family: inherit;
        cursor: pointer;
        transition: all 0.3s;
        text-decoration: none;
    }

    .nav-item:hover { color: var(--text-dim); }

    .nav-item.active {
        color: var(--primary);
        background: rgba(139, 92, 246, 0.1);
    }

    .nav-icon { font-size: 1.25rem; }

    .nav-label {
        font-size: 0.5625rem;
        font-weight: 700;
        text-transform: uppercase;
    }

    /* ═══════════════════════════════════════════
       MODAL
    ═══════════════════════════════════════════ */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.9);
        backdrop-filter: blur(10px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
    }

    .modal-overlay.show { display: flex; }

    .modal {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 40px 32px;
        max-width: 360px;
        width: 100%;
        text-align: center;
        animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes modalPop {
        from { opacity: 0; transform: scale(0.9) translateY(20px); }
    }

    .modal-emoji {
        font-size: 4rem;
        margin-bottom: 12px;
    }

    .modal-title {
        font-size: 1.25rem;
        font-weight: 800;
        margin-bottom: 8px;
    }

    .modal-xp {
        font-family: 'JetBrains Mono', monospace;
        font-size: 2.5rem;
        font-weight: 900;
        color: var(--success);
        margin-bottom: 16px;
    }

    .modal-streak {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: rgba(245, 158, 11, 0.1);
        border-radius: 100px;
        color: var(--warning);
        font-weight: 700;
        font-size: 0.875rem;
        margin-bottom: 24px;
    }

    .modal-btn {
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        border: none;
        border-radius: 12px;
        color: white;
        font-family: inherit;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
    }

    /* ═══════════════════════════════════════════
       STATES
    ═══════════════════════════════════════════ */
    .loading-screen {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--bg);
        color: var(--text);
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

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
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 12px;
    }

    .empty-state p {
        color: var(--text-dim);
        margin-bottom: 28px;
    }

    .auth-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        text-align: center;
        padding: 40px;
        background: var(--bg);
    }

    .auth-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .auth-prompt h1 {
        font-size: 1.75rem;
        margin-bottom: 12px;
        color: var(--text);
    }

    .auth-prompt p {
        color: var(--text-dim);
        margin-bottom: 28px;
    }

    /* ═══════════════════════════════════════════
       STREAK MULTIPLIER
    ═══════════════════════════════════════════ */
    .streak-mult {
        font-size: 0.625rem;
        background: rgba(245, 158, 11, 0.3);
        padding: 2px 6px;
        border-radius: 10px;
        margin-left: 4px;
    }

    /* ═══════════════════════════════════════════
       XP BREAKDOWN
    ═══════════════════════════════════════════ */
    .xp-breakdown {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(217, 70, 239, 0.1));
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 12px;
        font-family: 'JetBrains Mono', monospace;
    }

    .xp-base {
        color: var(--text-dim);
        font-size: 0.875rem;
    }

    .xp-mult {
        color: var(--warning);
        font-weight: 700;
        font-size: 0.875rem;
    }

    .xp-equals {
        color: var(--text-muted);
        font-size: 0.75rem;
    }

    .xp-total {
        color: var(--success);
        font-weight: 800;
        font-size: 1rem;
    }

    /* ═══════════════════════════════════════════
       ONBOARDING SCREEN
    ═══════════════════════════════════════════ */
    .onboarding-screen {
        text-align: center;
        padding: 60px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
    }

    .onboarding-glow {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
        pointer-events: none;
    }

    .nur-avatar-large {
        position: relative;
        width: 120px;
        height: 120px;
        margin-bottom: 24px;
    }

    .avatar-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        animation: pulse-ring 2s ease-in-out infinite;
    }

    @keyframes pulse-ring {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.7; }
    }

    .avatar-emoji {
        position: absolute;
        inset: 8px;
        background: var(--surface);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3.5rem;
    }

    .onboarding-title {
        font-size: 2rem;
        font-weight: 800;
        margin-bottom: 12px;
        background: linear-gradient(90deg, var(--text), var(--primary-light));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .onboarding-subtitle {
        color: var(--text-dim);
        font-size: 1.125rem;
        margin-bottom: 40px;
        max-width: 400px;
    }

    .first-quest {
        background: var(--surface);
        border: 2px solid rgba(139, 92, 246, 0.3);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 32px;
        width: 100%;
        max-width: 400px;
    }

    .quest-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: rgba(139, 92, 246, 0.15);
        border-radius: 100px;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--primary-light);
        margin-bottom: 12px;
    }

    .first-quest h3 {
        font-size: 1.25rem;
        margin-bottom: 8px;
    }

    .first-quest p {
        color: var(--text-dim);
        font-size: 0.9375rem;
        margin-bottom: 16px;
    }

    .quest-reward {
        display: flex;
        justify-content: center;
    }

    .reward-xp {
        background: linear-gradient(90deg, var(--success), #10b981);
        color: white;
        padding: 8px 20px;
        border-radius: 100px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 800;
        font-size: 1rem;
    }

    .btn-primary-lg {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 18px 36px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        border: none;
        border-radius: 16px;
        color: white;
        font-size: 1.125rem;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.3s;
    }

    .btn-primary-lg:hover {
        transform: translateY(-3px);
        box-shadow: 0 20px 40px var(--primary-glow);
    }

    .btn-primary-lg.pulse {
        animation: btn-pulse 2s ease-in-out infinite;
    }

    @keyframes btn-pulse {
        0%, 100% { box-shadow: 0 10px 30px var(--primary-glow); }
        50% { box-shadow: 0 20px 50px rgba(139, 92, 246, 0.6); }
    }

    .preview-blurred {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        margin-top: 48px;
        opacity: 0.4;
        filter: blur(2px);
    }

    .preview-item {
        padding: 10px 16px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        font-size: 0.8125rem;
        color: var(--text-muted);
    }

    /* ═══════════════════════════════════════════
       RESPONSIVE
    ═══════════════════════════════════════════ */
    @media (max-width: 640px) {
        .topbar-inner { flex-wrap: wrap; }
        .task-hero { padding: 20px; }
        .panel-content { padding: 16px; }
        .panels-tabs { flex-wrap: wrap; }
        .panel-tab { flex: 1 1 33%; }
        .player-info { display: none; }
        .xp-bar { width: 60px; }
        .task-actions { flex-direction: column; }
        .dash-grid { grid-template-columns: 1fr 1fr; }
        .onboarding-title { font-size: 1.5rem; }
        .nur-avatar-large { width: 100px; height: 100px; }
        .avatar-emoji { font-size: 2.5rem; }
    }
`
