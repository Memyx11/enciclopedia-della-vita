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
    rank_name: string
    rank_emoji: string
}

interface Chapter {
    id: string
    title: string
    order_index: number
}

interface Task {
    id: string
    title: string
    description: string
    difficulty: 'easy' | 'medium' | 'hard'
    xp_reward: number
    estimated_minutes: number
    status: 'pending' | 'completed'
    order_index: number
    chapter_id: string
    chapter_title?: string
    displayStatus?: 'done' | 'current' | 'locked'
}

interface Mission {
    id: string
    title: string
    description: string
}

interface Material {
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

const DIFFICULTY_CONFIG = {
    easy: { label: 'Facile', xp: 30, time: 15, color: '#22c55e' },
    medium: { label: 'Media', xp: 60, time: 30, color: '#f59e0b' },
    hard: { label: 'Difficile', xp: 100, time: 60, color: '#ef4444' },
}

function getRank(level: number) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (level >= RANKS[i].level) return RANKS[i]
    }
    return RANKS[0]
}

function getXpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5))
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
        rank_name: 'Seme',
        rank_emoji: '🌱'
    })
    const [mission, setMission] = useState<Mission | null>(null)
    const [chapter, setChapter] = useState<Chapter | null>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const [materials, setMaterials] = useState<Material[]>([])
    const [loading, setLoading] = useState(true)
    const [activePanel, setActivePanel] = useState<'scrivania' | 'dashboard' | 'note' | null>(null)
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
                const rank = getRank(level)
                setStats({
                    level,
                    xp: statsData.xp || 0,
                    xp_to_next: getXpForLevel(level),
                    streak: statsData.streak || 0,
                    lives: statsData.lives ?? 3,
                    rank_name: rank.name,
                    rank_emoji: rank.emoji
                })
            }

            // 2. Load active mission
            const { data: missionData } = await supabase
                .from('user_mission')
                .select('*')
                .eq('clerk_user_id', user.id)
                .in('status', ['active', 'locked'])
                .order('created_at', { ascending: false })
                .maybeSingle()

            if (missionData) {
                setMission(missionData)

                // 3. Load tasks for this mission (ordered by sort_order)
                const { data: tasksData } = await supabase
                    .from('objectives')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .eq('mission_id', missionData.id)
                    .order('sort_order', { ascending: true })

                if (tasksData && tasksData.length > 0) {
                    // CHAIN LOGIC: Find FIRST non-completed task = ACTIVE
                    const firstPending = tasksData.find(t => t.status !== 'completed')

                    // Map tasks with display status
                    const processedTasks: Task[] = tasksData.map((t, index) => ({
                        id: t.id,
                        title: t.title,
                        description: t.description || '',
                        difficulty: t.difficulty || 'medium',
                        xp_reward: t.xp_reward || DIFFICULTY_CONFIG[t.difficulty || 'medium'].xp,
                        estimated_minutes: t.estimated_minutes || DIFFICULTY_CONFIG[t.difficulty || 'medium'].time,
                        status: t.status,
                        order_index: t.sort_order || index,
                        chapter_id: t.chapter_id || '',
                        chapter_title: t.chapter_title || 'Capitolo 1',
                        // CHAIN LOGIC: done/current/locked
                        displayStatus: t.status === 'completed'
                            ? 'done'
                            : t.id === firstPending?.id
                                ? 'current'
                                : 'locked'
                    }))

                    setTasks(processedTasks)
                    setActiveTask(processedTasks.find(t => t.displayStatus === 'current') || null)

                    // Set chapter from first task
                    if (processedTasks[0]?.chapter_title) {
                        setChapter({
                            id: processedTasks[0].chapter_id,
                            title: processedTasks[0].chapter_title,
                            order_index: 1
                        })
                    }
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

    // Keyboard shortcuts for panels
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLTextAreaElement) return
            if (e.key === '1') togglePanel('scrivania')
            if (e.key === '2') togglePanel('dashboard')
            if (e.key === '3') togglePanel('note')
        }
        window.addEventListener('keypress', handleKeyPress)
        return () => window.removeEventListener('keypress', handleKeyPress)
    }, [activePanel])

    // ═══════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════

    const completeTask = async () => {
        if (!user || !activeTask) return

        const xpEarned = activeTask.xp_reward
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

            // 2. Update user stats
            const newXp = stats.xp + xpEarned
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

            // 3. Check if all tasks completed (mission done)
            const remainingTasks = tasks.filter(t => t.id !== activeTask.id && t.status !== 'completed')
            if (remainingTasks.length === 0 && mission) {
                await supabase
                    .from('user_mission')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('id', mission.id)
            }

            // 4. Show celebration modal
            setModalData({ xp: xpEarned, streak: newStreak, levelUp })
            setShowModal(true)

            // 5. Reload data
            setTimeout(() => loadData(), 500)

        } catch (error) {
            console.error('Error completing task:', error)
        }
    }

    const skipTask = async () => {
        if (!user || stats.lives <= 0) {
            alert('Non hai più vite! Completa una task per continuare.')
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

    const togglePanel = (panel: 'scrivania' | 'dashboard' | 'note') => {
        setActivePanel(activePanel === panel ? null : panel)
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPUTED VALUES
    // ═══════════════════════════════════════════════════════════════

    const xpProgress = stats.xp_to_next > 0
        ? Math.round((stats.xp % stats.xp_to_next) / stats.xp_to_next * 100)
        : 0
    const completedTasks = tasks.filter(t => t.displayStatus === 'done').length
    const totalTasks = tasks.length
    const chapterProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const isDestinationUnlocked = completedTasks === totalTasks && totalTasks > 0

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

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TOPBAR */}
            {/* ══════════════════════════════════════════════════════════ */}
            <header className="topbar">
                <div className="topbar-inner">
                    <Link href="/" className="home-btn" title="Home">
                        🏠
                    </Link>
                    <div className="player">
                        <div className="level-badge">
                            <div className="level-ring" style={{ '--progress': `${xpProgress}%` } as React.CSSProperties}></div>
                            <div className="level-inner">
                                <span className="level-num">{stats.level}</span>
                            </div>
                        </div>
                        <div className="player-info">
                            <div className="player-rank">{stats.rank_emoji} {stats.rank_name}</div>
                            <div className="xp-row">
                                <div className="xp-bar">
                                    <div className="xp-fill" style={{ width: `${xpProgress}%` }}></div>
                                </div>
                                <span className="xp-text">{stats.xp}/{stats.xp_to_next}</span>
                            </div>
                        </div>
                    </div>

                    <div className="stats-row">
                        <div className="streak">
                            <span>🔥</span>
                            <span>{stats.streak}</span>
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

            {/* ══════════════════════════════════════════════════════════ */}
            {/* MAIN CONTENT */}
            {/* ══════════════════════════════════════════════════════════ */}
            <main className="main-content">

                {/* TASK SECTION - con tabs DENTRO */}
                {activeTask ? (
                    <section className="task-section">
                        <div className="task-hero">
                            <div className="task-meta">
                                <div className="task-badge">
                                    <span className="dot"></span>
                                    <span>Task Attiva</span>
                                </div>
                                <span className="task-chapter">
                                    📍 {chapter?.title || 'Capitolo 1'}
                                </span>
                            </div>

                            <h1 className="task-title">{activeTask.title}</h1>
                            <p className="task-desc">{activeTask.description}</p>

                            <div className="task-rewards">
                                <div className="reward xp">
                                    ✨ +{activeTask.xp_reward} XP
                                </div>
                                <div className="reward difficulty" style={{ '--diff-color': DIFFICULTY_CONFIG[activeTask.difficulty].color } as React.CSSProperties}>
                                    ⚔️ {DIFFICULTY_CONFIG[activeTask.difficulty].label}
                                </div>
                                <div className="reward time">
                                    ⏱️ ~{activeTask.estimated_minutes} min
                                </div>
                            </div>

                            <div className="task-actions">
                                <button className="btn btn-complete" onClick={completeTask}>
                                    ✓ HO FINITO
                                </button>
                                <button className="btn btn-skip" onClick={skipTask}>
                                    Salta →
                                </button>
                                <Link href="/chat" className="btn btn-nur">
                                    💬 Chiedi a NUR
                                </Link>
                            </div>
                        </div>

                        {/* TABS - DENTRO la task section */}
                        <div className="panels-tabs">
                            <button
                                className={`panel-tab ${activePanel === 'scrivania' ? 'active' : ''}`}
                                onClick={() => togglePanel('scrivania')}
                            >
                                <span>📁</span>
                                <span>Scrivania</span>
                            </button>
                            <button
                                className={`panel-tab ${activePanel === 'dashboard' ? 'active' : ''}`}
                                onClick={() => togglePanel('dashboard')}
                            >
                                <span>📊</span>
                                <span>Dashboard</span>
                            </button>
                            <button
                                className={`panel-tab ${activePanel === 'note' ? 'active' : ''}`}
                                onClick={() => togglePanel('note')}
                            >
                                <span>📝</span>
                                <span>Note</span>
                            </button>
                        </div>

                        {/* PANEL CONTENT */}
                        {activePanel === 'scrivania' && (
                            <div className="panel-content">
                                <div className="materials-list">
                                    {materials.length > 0 ? materials.map(m => (
                                        <Link key={m.id} href="/giornale" className="material-item">
                                            <div className="material-icon">📄</div>
                                            <div className="material-info">
                                                <div className="material-name">{m.title || 'Senza titolo'}</div>
                                                <div className="material-desc">{m.content?.slice(0, 50)}...</div>
                                            </div>
                                        </Link>
                                    )) : (
                                        <div className="empty-state">
                                            <p>Nessun materiale ancora</p>
                                            <Link href="/chat" className="btn btn-ghost">Chiedi a NUR</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activePanel === 'dashboard' && (
                            <div className="panel-content">
                                <div className="dash-grid">
                                    <div className="dash-stat">
                                        <div className="dash-stat-label">Task Completate</div>
                                        <div className="dash-stat-value">{completedTasks}/{totalTasks}</div>
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
                                        <div className="dash-stat-label">Livello</div>
                                        <div className="dash-stat-value">Lv.{stats.level}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activePanel === 'note' && (
                            <div className="panel-content">
                                <textarea
                                    className="notes-area"
                                    placeholder="Scrivi qui le tue note per questa task..."
                                    value={taskNotes}
                                    onChange={(e) => setTaskNotes(e.target.value)}
                                />
                                <button className="btn btn-ghost" onClick={saveNotes}>
                                    Salva Note
                                </button>
                            </div>
                        )}
                    </section>
                ) : (
                    <section className="no-task-section">
                        <div className="empty-icon">🎯</div>
                        <h2>Nessuna task attiva</h2>
                        <p>Parla con NUR per definire il tuo obiettivo!</p>
                        <Link href="/chat" className="btn btn-nur">
                            💬 Parla con NUR
                        </Link>
                    </section>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* CARDS GRID */}
                {/* ══════════════════════════════════════════════════════════ */}
                <div className="cards-grid">

                    {/* CHAPTER PROGRESS */}
                    {tasks.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-label">CAPITOLO 1</div>
                                    <div className="card-title">{chapter?.title || 'Il tuo percorso'}</div>
                                </div>
                                <div className="card-pct">{chapterProgress}%</div>
                            </div>

                            <div className="progress-bar">
                                <div className="progress-bar-fill" style={{ width: `${chapterProgress}%` }}></div>
                            </div>

                            <div className="objectives-list">
                                {tasks.map((task) => (
                                    <div key={task.id} className="obj-item">
                                        <div className={`obj-check ${task.displayStatus}`}>
                                            {task.displayStatus === 'done' && '✓'}
                                            {task.displayStatus === 'current' && '●'}
                                            {task.displayStatus === 'locked' && '🔒'}
                                        </div>
                                        <span className={`obj-text ${task.displayStatus}`}>
                                            {task.title}
                                        </span>
                                        {task.displayStatus === 'current' && (
                                            <span className="obj-badge">ATTIVA</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* JOURNEY */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-label">IL TUO</div>
                                <div className="card-title">Viaggio</div>
                            </div>
                        </div>

                        <div className="journey">
                            <div className="journey-line"></div>
                            <div className="journey-fill" style={{ width: `${Math.min(90, chapterProgress * 0.9)}%` }}></div>

                            {tasks.slice(0, 4).map((task, i) => (
                                <div key={task.id} className={`journey-node ${task.displayStatus}`}>
                                    {task.displayStatus === 'done' ? '✓' : i + 1}
                                </div>
                            ))}

                            {/* Destination node */}
                            <div className={`journey-node destination ${isDestinationUnlocked ? 'unlocked' : 'locked'}`}>
                                {isDestinationUnlocked ? '🏆' : '🎯'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* DESTINATION CARD */}
                {/* ══════════════════════════════════════════════════════════ */}
                {mission && (
                    <div className={`mission-card ${isDestinationUnlocked ? 'unlocked' : 'locked'}`}>
                        <div className="mission-icon">
                            {isDestinationUnlocked ? '🏆' : '🎯'}
                        </div>
                        <div className="mission-label">
                            {isDestinationUnlocked ? 'OBIETTIVO RAGGIUNTO!' : 'DESTINAZIONE FINALE'}
                        </div>
                        <div className="mission-title">{mission.title}</div>
                        <div className="mission-sub">
                            {completedTasks} / {totalTasks} task completate
                        </div>
                        <div className="mission-progress">
                            <div className="mission-progress-fill" style={{ width: `${chapterProgress}%` }}></div>
                        </div>
                        <div className="mission-pct">{chapterProgress}%</div>
                        {!isDestinationUnlocked && (
                            <div className="mission-hint">
                                🔒 Completa tutte le task per sbloccare
                            </div>
                        )}
                    </div>
                )}

            </main>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* BOTTOM NAV - 4 ITEMS */}
            {/* ══════════════════════════════════════════════════════════ */}
            <nav className="bottom-nav">
                <Link href="/la-mia-vita" className="nav-item active">
                    <span className="nav-icon">📖</span>
                    <span className="nav-label">Storia</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">NUR</span>
                </Link>
                <Link href="/calendario" className="nav-item">
                    <span className="nav-icon">📅</span>
                    <span className="nav-label">Calendario</span>
                </Link>
                <Link href="/giornale" className="nav-item">
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">Stats</span>
                </Link>
            </nav>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* COMPLETION MODAL */}
            {/* ══════════════════════════════════════════════════════════ */}
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
