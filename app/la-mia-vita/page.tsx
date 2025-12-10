'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import './dashboard.css'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UserStats {
    level: number
    xp: number
    xp_to_next: number
    streak: number
    lives: number
    rank: string
    streak_multiplier: number
}

interface Mission {
    id: string
    title: string
    description: string
    target_value: number
    current_value: number
    unit: string
    status: 'active' | 'completed' | 'locked'
}

interface Task {
    id: string
    title: string
    description: string
    status: 'completed' | 'active' | 'locked'
    order_index: number
    xp_reward: number
    difficulty: 'easy' | 'medium' | 'hard'
    estimated_minutes: number
}

interface JournalEntry {
    id: string
    title: string
    content: string
    entry_type: string
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const RANKS = [
    { level: 1, name: 'Seme', emoji: '🌱' },
    { level: 5, name: 'Germoglio', emoji: '🌿' },
    { level: 10, name: 'Viaggiatore', emoji: '🚶' },
    { level: 20, name: 'Esploratore', emoji: '🧭' },
    { level: 30, name: 'Guerriero', emoji: '⚔️' },
    { level: 40, name: 'Maestro', emoji: '🎓' },
    { level: 50, name: 'Leggenda', emoji: '👑' },
]

const DIFFICULTY_CONFIG: Record<string, { label: string; xp: number; time: number }> = {
    easy: { label: 'Facile', xp: 30, time: 15 },
    medium: { label: 'Media', xp: 60, time: 30 },
    hard: { label: 'Difficile', xp: 100, time: 60 },
}

function getRank(level: number): { name: string; emoji: string } {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (level >= RANKS[i].level) return RANKS[i]
    }
    return RANKS[0]
}

function getXpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5))
}

function getStreakMultiplier(streak: number): number {
    if (streak >= 100) return 2.5
    if (streak >= 30) return 2.0
    if (streak >= 7) return 1.5
    return 1.0
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
    const { user, isLoaded } = useUser()

    // State
    const [stats, setStats] = useState<UserStats>({
        level: 1,
        xp: 0,
        xp_to_next: 100,
        streak: 0,
        lives: 3,
        rank: '🌱 Seme',
        streak_multiplier: 1.0
    })
    const [mission, setMission] = useState<Mission | null>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const [materials, setMaterials] = useState<JournalEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [activePanel, setActivePanel] = useState<string | null>(null)
    const [taskNotes, setTaskNotes] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [modalData, setModalData] = useState({ xp: 0, streak: 0, levelUp: false })

    // ═══════════════════════════════════════════════════════════════
    // DATA LOADING
    // ═══════════════════════════════════════════════════════════════

    const loadData = useCallback(async () => {
        if (!user) return

        try {
            // 1. Load user stats
            const { data: statsData } = await supabase
                .from('user_stats')
                .select('*')
                .eq('clerk_user_id', user.id)
                .maybeSingle()

            if (statsData) {
                const level = statsData.level || 1
                const streak = statsData.streak || 0
                const rank = getRank(level)

                setStats({
                    level,
                    xp: statsData.xp || 0,
                    xp_to_next: getXpForLevel(level),
                    streak,
                    lives: statsData.lives ?? 3,
                    rank: rank.emoji + ' ' + rank.name,
                    streak_multiplier: getStreakMultiplier(streak)
                })
            }

            // 2. Load active mission (Obiettivo Finale)
            const { data: missionData } = await supabase
                .from('user_mission')
                .select('*')
                .eq('clerk_user_id', user.id)
                .in('status', ['active', 'locked'])
                .order('created_at', { ascending: false })
                .maybeSingle()

            if (missionData) {
                setMission(missionData)

                // 3. Load tasks for this mission (ordered)
                const { data: tasksData } = await supabase
                    .from('objectives')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .eq('mission_id', missionData.id)
                    .order('sort_order', { ascending: true })

                if (tasksData && tasksData.length > 0) {
                    // Map to our Task interface
                    const mappedTasks: Task[] = tasksData.map((t: any, index: number) => ({
                        id: t.id,
                        title: t.title,
                        description: t.description || '',
                        status: t.status as 'completed' | 'active' | 'locked',
                        order_index: t.sort_order || index,
                        xp_reward: t.xp_reward || DIFFICULTY_CONFIG[t.difficulty || 'medium'].xp,
                        difficulty: t.difficulty || 'medium',
                        estimated_minutes: t.estimated_minutes || DIFFICULTY_CONFIG[t.difficulty || 'medium'].time
                    }))

                    // Ensure chain logic: only first non-completed is active
                    let foundActive = false
                    const chainedTasks = mappedTasks.map(task => {
                        if (task.status === 'completed') {
                            return task
                        } else if (!foundActive) {
                            foundActive = true
                            return { ...task, status: 'active' as const }
                        } else {
                            return { ...task, status: 'locked' as const }
                        }
                    })

                    setTasks(chainedTasks)

                    // Set active task
                    const active = chainedTasks.find(t => t.status === 'active')
                    setActiveTask(active || null)

                    // Update mission progress
                    const completedCount = chainedTasks.filter(t => t.status === 'completed').length
                    setMission(prev => prev ? {
                        ...prev,
                        current_value: completedCount,
                        target_value: chainedTasks.length,
                        status: completedCount === chainedTasks.length ? 'completed' : 'active'
                    } : null)
                }
            }

            // 4. Load materials
            const { data: materialsData } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('clerk_user_id', user.id)
                .in('entry_type', ['guide', 'resource', 'article', 'document'])
                .order('created_at', { ascending: false })
                .limit(5)

            if (materialsData) {
                setMaterials(materialsData)
            }

            // 5. Load saved notes
            const savedNotes = localStorage.getItem(`task_notes_${user.id}`)
            if (savedNotes) setTaskNotes(savedNotes)

        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (isLoaded && user) {
            loadData()
        } else if (isLoaded && !user) {
            setLoading(false)
        }
    }, [isLoaded, user, loadData])

    // ═══════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════

    const completeTask = async () => {
        if (!user || !activeTask) return

        const xpBase = activeTask.xp_reward
        const xpWithMultiplier = Math.round(xpBase * stats.streak_multiplier)
        const newStreak = stats.streak + 1

        try {
            // 1. Mark task as completed
            await supabase
                .from('objectives')
                .update({
                    status: 'completed',
                    progress: 100,
                    completed_at: new Date().toISOString()
                })
                .eq('id', activeTask.id)

            // 2. Unlock next task if exists
            const currentIndex = tasks.findIndex(t => t.id === activeTask.id)
            if (currentIndex < tasks.length - 1) {
                const nextTask = tasks[currentIndex + 1]
                await supabase
                    .from('objectives')
                    .update({ status: 'active' })
                    .eq('id', nextTask.id)
            }

            // 3. Update user stats
            const newXp = stats.xp + xpWithMultiplier
            let newLevel = stats.level
            let remainingXp = newXp
            let levelUp = false

            while (remainingXp >= getXpForLevel(newLevel)) {
                remainingXp -= getXpForLevel(newLevel)
                newLevel++
                levelUp = true
            }

            await supabase
                .from('user_stats')
                .upsert({
                    clerk_user_id: user.id,
                    level: newLevel,
                    xp: newXp,
                    streak: newStreak,
                    lives: stats.lives,
                    last_activity: new Date().toISOString()
                }, { onConflict: 'clerk_user_id' })

            // 4. Check if mission completed
            const completedCount = tasks.filter(t => t.status === 'completed').length + 1
            if (mission && completedCount === tasks.length) {
                await supabase
                    .from('user_mission')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('id', mission.id)
            }

            // 5. Show modal
            setModalData({ xp: xpWithMultiplier, streak: newStreak, levelUp })
            setShowModal(true)

            // 6. Reload
            setTimeout(() => loadData(), 500)

        } catch (error) {
            console.error('Error completing task:', error)
        }
    }

    const skipTask = async () => {
        if (!user || stats.lives <= 0) {
            alert('Non hai piu vite! Completa una task per continuare.')
            return
        }

        if (!confirm('Saltare costa 1 vita e -10 XP. Confermi?')) return

        try {
            await supabase
                .from('user_stats')
                .update({
                    lives: stats.lives - 1,
                    xp: Math.max(0, stats.xp - 10),
                    last_activity: new Date().toISOString()
                })
                .eq('clerk_user_id', user.id)

            loadData()
        } catch (error) {
            console.error('Error skipping task:', error)
        }
    }

    const saveNotes = () => {
        if (user) {
            localStorage.setItem(`task_notes_${user.id}`, taskNotes)
            alert('Note salvate!')
        }
    }

    const togglePanel = (panel: string) => {
        setActivePanel(activePanel === panel ? null : panel)
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPUTED
    // ═══════════════════════════════════════════════════════════════

    const xpProgress = Math.round((stats.xp % stats.xp_to_next) / stats.xp_to_next * 100)
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const missionProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
    const isObjectiveUnlocked = completedTasks === tasks.length && tasks.length > 0

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════

    if (!isLoaded || loading) {
        return (
            <div className="dashboard-page">
                <div className="bg-ambient"></div>
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Caricamento...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="dashboard-page">
                <div className="bg-ambient"></div>
                <div className="auth-prompt">
                    <div className="auth-icon">🎮</div>
                    <h1>Il Gioco della Vita</h1>
                    <p>Accedi per iniziare il tuo viaggio</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard-page">
            <div className="bg-ambient"></div>

            {/* TOP BAR */}
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="player">
                        <div className="level-badge" style={{ '--progress': xpProgress } as React.CSSProperties}>
                            <div className="level-ring"></div>
                            <div className="level-inner">
                                <span className="level-num">{stats.level}</span>
                            </div>
                        </div>
                        <div className="player-info">
                            <div className="player-rank">{stats.rank}</div>
                            <div className="xp-row">
                                <div className="xp-bar">
                                    <div className="xp-fill" style={{ width: `${xpProgress}%` }}></div>
                                </div>
                                <span className="xp-text">
                                    {stats.xp.toLocaleString()} / {stats.xp_to_next.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="stats-row">
                        <div className="streak">
                            <span>🔥</span>
                            <span>{stats.streak}</span>
                            {stats.streak_multiplier > 1 && (
                                <span className="multiplier">x{stats.streak_multiplier}</span>
                            )}
                        </div>
                        <div className="lives">
                            {[...Array(3)].map((_, i) => (
                                <span key={i} className={`heart ${i >= stats.lives ? 'dead' : ''}`}>❤️</span>
                            ))}
                        </div>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </header>

            {/* MAIN */}
            <main className="main-content">

                {/* TASK HERO */}
                {activeTask ? (
                    <div className="task-section">
                        <div className="task-hero">
                            <div className="task-meta">
                                <div className="task-badge">
                                    <span className="dot"></span>
                                    <span>Task Attiva</span>
                                </div>
                                <span className="task-chapter">
                                    Step {activeTask.order_index + 1} di {tasks.length}
                                </span>
                            </div>

                            <h1 className="task-title">{activeTask.title}</h1>
                            <p className="task-desc">{activeTask.description}</p>

                            <div className="task-rewards">
                                <div className="reward xp">
                                    +{Math.round(activeTask.xp_reward * stats.streak_multiplier)} XP
                                </div>
                                <div className="reward">
                                    {DIFFICULTY_CONFIG[activeTask.difficulty].label}
                                </div>
                                <div className="reward">
                                    ~{activeTask.estimated_minutes} min
                                </div>
                            </div>

                            <div className="task-actions">
                                <button className="btn btn-complete" onClick={completeTask}>
                                    HO FINITO
                                </button>
                                <button className="btn btn-ghost" onClick={skipTask}>
                                    Salta
                                </button>
                                <Link href="/chat" className="btn btn-nur">
                                    Chiedi a NUR
                                </Link>
                            </div>
                        </div>

                        {/* PANELS */}
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
                                    <div className="desk-title">Materiali</div>
                                    <div className="materials-list">
                                        {materials.length > 0 ? materials.map(m => (
                                            <Link key={m.id} href="/giornale" className="material-item">
                                                <div className="material-icon">📄</div>
                                                <div className="material-info">
                                                    <div className="material-name">{m.title || 'Senza titolo'}</div>
                                                    <div className="material-desc">
                                                        {m.content?.slice(0, 50)}...
                                                    </div>
                                                </div>
                                                <div className="material-action">Apri</div>
                                            </Link>
                                        )) : (
                                            <div className="empty-materials">
                                                <p>Nessun materiale ancora</p>
                                                <Link href="/chat" className="btn btn-ghost">
                                                    Chiedi a NUR
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Panel: Dashboard */}
                        {activePanel === 'dashboard' && (
                            <div className="panel-content">
                                <div className="dash-grid">
                                    <div className="dash-stat">
                                        <div className="dash-stat-label">Task Completate</div>
                                        <div className="dash-stat-value">{completedTasks}/{tasks.length}</div>
                                    </div>
                                    <div className="dash-stat">
                                        <div className="dash-stat-label">XP Totali</div>
                                        <div className="dash-stat-value">{stats.xp.toLocaleString()}</div>
                                    </div>
                                    <div className="dash-stat">
                                        <div className="dash-stat-label">Streak</div>
                                        <div className="dash-stat-value">🔥 {stats.streak}</div>
                                    </div>
                                    <div className="dash-stat">
                                        <div className="dash-stat-label">Moltiplicatore</div>
                                        <div className="dash-stat-value">x{stats.streak_multiplier}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Panel: Notes */}
                        {activePanel === 'notes' && (
                            <div className="panel-content">
                                <textarea
                                    className="notes-area"
                                    placeholder="Scrivi qui le tue note per questa task..."
                                    value={taskNotes}
                                    onChange={(e) => setTaskNotes(e.target.value)}
                                />
                                <div className="notes-actions">
                                    <button className="btn btn-ghost" onClick={saveNotes}>
                                        Salva Note
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="no-task-section">
                        <div className="empty-icon">🎯</div>
                        <h2>Nessuna task attiva</h2>
                        <p>Parla con NUR per definire il tuo obiettivo!</p>
                        <Link href="/chat" className="btn btn-nur">
                            Parla con NUR
                        </Link>
                    </div>
                )}

                {/* CARDS GRID */}
                <div className="cards-grid">

                    {/* TASKS CHAIN */}
                    {tasks.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-label">Percorso</div>
                                    <div className="card-title">Le tue Task</div>
                                </div>
                                <div className="card-value">{completedTasks}/{tasks.length}</div>
                            </div>

                            <div className="progress-bar">
                                <div className="progress-bar-fill" style={{ width: `${missionProgress}%` }}></div>
                            </div>

                            <div className="objectives">
                                {tasks.map((task) => (
                                    <div key={task.id} className="obj-item">
                                        <div className={`obj-check ${
                                            task.status === 'completed' ? 'done' :
                                            task.status === 'active' ? 'current' : 'locked'
                                        }`}>
                                            {task.status === 'completed' ? '✓' :
                                             task.status === 'active' ? '●' : '🔒'}
                                        </div>
                                        <span className={`obj-text ${task.status}`}>
                                            {task.title}
                                        </span>
                                        {task.status === 'active' && (
                                            <span className="obj-badge">ATTIVA</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* JOURNEY NODES */}
                    <div className="card">
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
                                style={{ width: `${Math.min(80, missionProgress * 0.8)}%` }}
                            ></div>

                            {tasks.slice(0, 4).map((task, i) => (
                                <div
                                    key={task.id}
                                    className={`journey-node ${
                                        task.status === 'completed' ? 'done' :
                                        task.status === 'active' ? 'current' : 'locked'
                                    }`}
                                >
                                    {task.status === 'completed' ? '✓' : i + 1}
                                </div>
                            ))}

                            {/* Final objective node */}
                            <div className={`journey-node ${isObjectiveUnlocked ? 'done' : 'final'}`}>
                                {isObjectiveUnlocked ? '🏆' : '🎯'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MISSION CARD */}
                {mission && (
                    <div className={`mission-card ${isObjectiveUnlocked ? 'unlocked' : 'locked'}`}>
                        <div className="mission-icon">
                            {isObjectiveUnlocked ? '🏆' : '🔒'}
                        </div>
                        <div className="mission-label">
                            {isObjectiveUnlocked ? 'OBIETTIVO RAGGIUNTO!' : 'Destinazione Finale'}
                        </div>
                        <div className="mission-title">{mission.title}</div>
                        <div className="mission-sub">
                            {completedTasks} / {tasks.length} task completate
                        </div>
                        <div className="mission-progress">
                            <div
                                className="mission-progress-fill"
                                style={{ width: `${missionProgress}%` }}
                            ></div>
                        </div>
                        <div className="mission-pct">{missionProgress}%</div>

                        {!isObjectiveUnlocked && (
                            <div className="mission-hint">
                                Completa tutte le task per sbloccare!
                            </div>
                        )}
                    </div>
                )}

            </main>

            {/* BOTTOM NAV */}
            <nav className="bottom-nav">
                <Link href="/la-mia-vita" className="nav-item active">
                    <span className="nav-icon">📖</span>
                    <span className="nav-label">Storia</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">NUR</span>
                </Link>
                <Link href="/giornale" className="nav-item">
                    <span className="nav-icon">📚</span>
                    <span className="nav-label">Scrivania</span>
                </Link>
            </nav>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-emoji">
                            {modalData.levelUp ? '⬆️' : '🎉'}
                        </div>
                        <h2 className="modal-title">
                            {modalData.levelUp ? 'Level Up!' : 'Task Completata!'}
                        </h2>
                        <div className="modal-xp">+{modalData.xp} XP</div>
                        <div className="modal-streak">🔥 Streak: {modalData.streak} giorni!</div>
                        <button className="modal-btn" onClick={() => setShowModal(false)}>
                            Continua
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
