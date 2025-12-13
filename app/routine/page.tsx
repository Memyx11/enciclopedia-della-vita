'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'

// ============================================
// TYPES
// ============================================

interface RoutineTask {
    id: string
    area_id: string
    title: string
    description: string | null
    scheduled_time: string
    duration_minutes: number
    frequency: 'daily' | 'weekday' | 'weekend' | 'custom'
    frequency_days: number[]
    difficulty: string
    xp_reward: number
    status: 'pending' | 'completed' | 'skipped'
    log?: {
        status: string
        completed_at: string | null
        xp_earned: number
    }
}

interface DayTemplate {
    wake_time: string
    sleep_time: string
    obligations: Array<{
        from: string
        to: string
        label: string
        type: string
    }>
}

interface DayStats {
    total: number
    completed: number
    pending: number
    completion_percent: number
    xp_earned: number
}

// ============================================
// AREA CONFIG
// ============================================

const AREA_CONFIG: Record<string, { name: string; icon: string; color: string }> = {
    health: { name: 'Salute', icon: '💪', color: '#22c55e' },
    finance: { name: 'Finanze', icon: '💰', color: '#f59e0b' },
    relationships: { name: 'Relazioni', icon: '❤️', color: '#ef4444' },
    career: { name: 'Carriera', icon: '💼', color: '#3b82f6' },
    growth: { name: 'Crescita', icon: '🧠', color: '#8b5cf6' },
    home: { name: 'Casa', icon: '🏠', color: '#06b6d4' },
    social: { name: 'Sociale', icon: '👥', color: '#ec4899' },
    hobbies: { name: 'Hobby', icon: '🎨', color: '#f97316' },
    spirituality: { name: 'Spiritualità', icon: '🙏', color: '#a855f7' },
    future: { name: 'Futuro', icon: '🔮', color: '#6366f1' }
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const DAY_NAMES_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

// ============================================
// COMPONENT
// ============================================

export default function RoutinePage() {
    const { user, isLoaded } = useUser()
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [tasks, setTasks] = useState<RoutineTask[]>([])
    const [template, setTemplate] = useState<DayTemplate | null>(null)
    const [stats, setStats] = useState<DayStats | null>(null)
    const [completingTask, setCompletingTask] = useState<string | null>(null)

    const dayOfWeek = selectedDate.getDay()
    const dateStr = selectedDate.toISOString().split('T')[0]

    useEffect(() => {
        if (user) loadData()
    }, [user, selectedDate])

    const loadData = async () => {
        if (!user) return
        setLoading(true)

        try {
            const res = await fetch(`/api/routine?userId=${user.id}&date=${dateStr}`)
            const data = await res.json()

            if (data.tasks) {
                setTasks(data.tasks)
            }
            if (data.template) {
                setTemplate(data.template)
            }
            if (data.stats) {
                setStats(data.stats)
            }
        } catch (e) {
            console.error('Error loading routine:', e)
        }

        setLoading(false)
    }

    const handleCompleteTask = async (taskId: string) => {
        if (!user) return
        setCompletingTask(taskId)

        try {
            const res = await fetch('/api/routine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'complete_task',
                    userId: user.id,
                    taskId,
                    date: dateStr
                })
            })

            if (res.ok) {
                await loadData()
            }
        } catch (e) {
            console.error('Error completing task:', e)
        }

        setCompletingTask(null)
    }

    const handleSkipTask = async (taskId: string) => {
        if (!user) return

        try {
            const res = await fetch('/api/routine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'skip_task',
                    userId: user.id,
                    taskId,
                    date: dateStr
                })
            })

            if (res.ok) {
                await loadData()
            }
        } catch (e) {
            console.error('Error skipping task:', e)
        }
    }

    const navigateDate = (days: number) => {
        const newDate = new Date(selectedDate)
        newDate.setDate(newDate.getDate() + days)
        setSelectedDate(newDate)
    }

    const isToday = dateStr === new Date().toISOString().split('T')[0]

    // Ordina task per orario
    const sortedTasks = [...tasks].sort((a, b) => {
        if (!a.scheduled_time) return 1
        if (!b.scheduled_time) return -1
        return a.scheduled_time.localeCompare(b.scheduled_time)
    })

    // Raggruppa per area
    const tasksByArea = new Map<string, RoutineTask[]>()
    for (const task of sortedTasks) {
        const existing = tasksByArea.get(task.area_id) || []
        tasksByArea.set(task.area_id, [...existing, task])
    }

    if (!isLoaded || loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Caricamento routine...</p>
                <style jsx>{styles}</style>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="container">
                <div className="auth-prompt">
                    <div className="auth-icon">📅</div>
                    <h1>La Mia Routine</h1>
                    <p>Accedi per vedere la tua routine</p>
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
                TOP BAR
            ═══════════════════════════════════════════ */}
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="nav-left">
                        <Link href="/la-mia-vita" className="back-btn">← Torna</Link>
                        <h1 className="page-title">📅 Routine</h1>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            {/* ═══════════════════════════════════════════
                MAIN CONTENT
            ═══════════════════════════════════════════ */}
            <main className="main">
                {/* Date Navigator */}
                <section className="date-nav">
                    <button className="date-btn" onClick={() => navigateDate(-1)}>←</button>
                    <div className="date-info">
                        <div className="date-day">{DAY_NAMES_FULL[dayOfWeek]}</div>
                        <div className="date-full">
                            {selectedDate.toLocaleDateString('it-IT', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </div>
                        {isToday && <span className="today-badge">Oggi</span>}
                    </div>
                    <button className="date-btn" onClick={() => navigateDate(1)}>→</button>
                </section>

                {/* Stats Overview */}
                {stats && (
                    <section className="stats-bar">
                        <div className="stat">
                            <span className="stat-value">{stats.completed}/{stats.total}</span>
                            <span className="stat-label">Completate</span>
                        </div>
                        <div className="stat progress">
                            <div className="progress-ring">
                                <svg viewBox="0 0 36 36">
                                    <path
                                        className="circle-bg"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="circle-fg"
                                        strokeDasharray={`${stats.completion_percent}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <span className="progress-value">{stats.completion_percent}%</span>
                            </div>
                        </div>
                        <div className="stat">
                            <span className="stat-value">+{stats.xp_earned}</span>
                            <span className="stat-label">XP Oggi</span>
                        </div>
                    </section>
                )}

                {/* Template Info */}
                {template && (
                    <section className="template-info">
                        <div className="template-times">
                            <span>🌅 {template.wake_time}</span>
                            <span className="divider">—</span>
                            <span>🌙 {template.sleep_time}</span>
                        </div>
                        {template.obligations && template.obligations.length > 0 && (
                            <div className="obligations">
                                {template.obligations.map((obl, idx) => (
                                    <span key={idx} className="obligation-tag">
                                        {obl.label} ({obl.from}-{obl.to})
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Task List */}
                {tasks.length === 0 ? (
                    <section className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>Nessuna task per questo giorno</h3>
                        <p>Parla con NUR per creare la tua routine</p>
                        <Link href="/chat" className="btn-primary">
                            💬 Crea routine con NUR
                        </Link>
                    </section>
                ) : (
                    <section className="tasks-section">
                        {/* Timeline View */}
                        <div className="timeline">
                            {sortedTasks.map(task => {
                                const area = AREA_CONFIG[task.area_id] || { name: task.area_id, icon: '📌', color: '#666' }
                                const isCompleted = task.status === 'completed'
                                const isSkipped = task.status === 'skipped'
                                const isCompleting = completingTask === task.id

                                return (
                                    <div
                                        key={task.id}
                                        className={`task-card ${isCompleted ? 'completed' : ''} ${isSkipped ? 'skipped' : ''}`}
                                    >
                                        <div className="task-time">
                                            {task.scheduled_time || '—'}
                                        </div>

                                        <div className="task-content">
                                            <div className="task-header">
                                                <span
                                                    className="task-area"
                                                    style={{ background: `${area.color}20`, color: area.color }}
                                                >
                                                    {area.icon} {area.name}
                                                </span>
                                                <span className="task-duration">
                                                    ⏱️ {task.duration_minutes}min
                                                </span>
                                            </div>

                                            <div className="task-title">{task.title}</div>

                                            {task.description && (
                                                <div className="task-desc">{task.description}</div>
                                            )}

                                            <div className="task-footer">
                                                <span className="task-xp">+{task.xp_reward} XP</span>
                                                <span className="task-difficulty">{task.difficulty}</span>
                                            </div>
                                        </div>

                                        <div className="task-actions">
                                            {isCompleted ? (
                                                <div className="completed-badge">✓</div>
                                            ) : isSkipped ? (
                                                <div className="skipped-badge">—</div>
                                            ) : (
                                                <>
                                                    <button
                                                        className="btn-complete"
                                                        onClick={() => handleCompleteTask(task.id)}
                                                        disabled={isCompleting}
                                                    >
                                                        {isCompleting ? '...' : '✓'}
                                                    </button>
                                                    <button
                                                        className="btn-skip"
                                                        onClick={() => handleSkipTask(task.id)}
                                                    >
                                                        ×
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* CTA to add more */}
                <section className="cta-section">
                    <Link href="/chat" className="btn-secondary">
                        💬 Aggiungi task con NUR
                    </Link>
                </section>
            </main>

            {/* ═══════════════════════════════════════════
                BOTTOM NAV
            ═══════════════════════════════════════════ */}
            <nav className="bottomnav">
                <div className="bottomnav-inner">
                    <Link href="/la-mia-vita" className="nav-item">
                        <span className="nav-icon">📖</span>
                        <span className="nav-label">Storia</span>
                    </Link>
                    <Link href="/chat" className="nav-item">
                        <span className="nav-icon">💬</span>
                        <span className="nav-label">NUR</span>
                    </Link>
                    <Link href="/routine" className="nav-item active">
                        <span className="nav-icon">📅</span>
                        <span className="nav-label">Routine</span>
                    </Link>
                    <Link href="/quest" className="nav-item">
                        <span className="nav-icon">🎮</span>
                        <span className="nav-label">Quest</span>
                    </Link>
                </div>
            </nav>

            <style jsx>{styles}</style>
        </div>
    )
}

// ============================================
// STYLES
// ============================================

const styles = `
    :root {
        --bg: #030305;
        --surface: #0a0a0f;
        --surface-2: #12121a;
        --border: rgba(255,255,255,0.06);
        --text: #f5f5f7;
        --text-dim: #a0a0b0;
        --text-muted: #606070;
        --primary: #8b5cf6;
        --primary-light: #a78bfa;
        --primary-glow: rgba(139, 92, 246, 0.4);
        --accent: #d946ef;
        --success: #22c55e;
        --warning: #f59e0b;
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
        max-width: 800px;
        margin: 0 auto;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .nav-left {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .back-btn {
        color: var(--text-dim);
        text-decoration: none;
        font-size: 0.875rem;
    }

    .page-title {
        font-size: 1.25rem;
        font-weight: 700;
    }

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
       DATE NAV
    ═══════════════════════════════════════════ */
    .date-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 16px;
    }

    .date-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        border-radius: 10px;
        color: var(--text);
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s;
    }

    .date-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: var(--primary);
    }

    .date-info {
        text-align: center;
    }

    .date-day {
        font-size: 1.125rem;
        font-weight: 700;
    }

    .date-full {
        font-size: 0.8125rem;
        color: var(--text-dim);
    }

    .today-badge {
        display: inline-block;
        padding: 2px 10px;
        background: rgba(139, 92, 246, 0.2);
        border-radius: 100px;
        color: var(--primary-light);
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        margin-top: 4px;
    }

    /* ═══════════════════════════════════════════
       STATS BAR
    ═══════════════════════════════════════════ */
    .stats-bar {
        display: flex;
        align-items: center;
        justify-content: space-around;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 16px;
    }

    .stat {
        text-align: center;
    }

    .stat-value {
        display: block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--primary);
    }

    .stat-label {
        display: block;
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
    }

    .progress-ring {
        position: relative;
        width: 60px;
        height: 60px;
    }

    .progress-ring svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }

    .circle-bg {
        fill: none;
        stroke: rgba(255,255,255,0.1);
        stroke-width: 3;
    }

    .circle-fg {
        fill: none;
        stroke: var(--primary);
        stroke-width: 3;
        stroke-linecap: round;
        transition: stroke-dasharray 0.5s ease;
    }

    .progress-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        font-weight: 800;
    }

    /* ═══════════════════════════════════════════
       TEMPLATE INFO
    ═══════════════════════════════════════════ */
    .template-info {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 20px;
    }

    .template-times {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-size: 0.9375rem;
        color: var(--text-dim);
    }

    .divider {
        color: var(--text-muted);
    }

    .obligations {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
        justify-content: center;
    }

    .obligation-tag {
        padding: 4px 10px;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        border-radius: 100px;
        font-size: 0.75rem;
        color: var(--text-dim);
    }

    /* ═══════════════════════════════════════════
       TASKS SECTION
    ═══════════════════════════════════════════ */
    .tasks-section {
        margin-bottom: 24px;
    }

    .timeline {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .task-card {
        display: flex;
        gap: 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 16px;
        transition: all 0.3s;
    }

    .task-card:hover {
        border-color: rgba(139, 92, 246, 0.3);
    }

    .task-card.completed {
        opacity: 0.6;
        border-color: rgba(34, 197, 94, 0.3);
    }

    .task-card.skipped {
        opacity: 0.4;
    }

    .task-time {
        width: 50px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8125rem;
        font-weight: 700;
        color: var(--text-dim);
        flex-shrink: 0;
    }

    .task-content {
        flex: 1;
    }

    .task-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        flex-wrap: wrap;
    }

    .task-area {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 100px;
        font-size: 0.6875rem;
        font-weight: 700;
    }

    .task-duration {
        font-size: 0.6875rem;
        color: var(--text-muted);
    }

    .task-title {
        font-size: 0.9375rem;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .task-desc {
        font-size: 0.8125rem;
        color: var(--text-dim);
        margin-bottom: 8px;
    }

    .task-footer {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .task-xp {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--success);
    }

    .task-difficulty {
        font-size: 0.6875rem;
        color: var(--text-muted);
        text-transform: capitalize;
    }

    .task-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-shrink: 0;
    }

    .btn-complete {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--success);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-complete:hover {
        transform: scale(1.05);
    }

    .btn-complete:disabled {
        opacity: 0.5;
    }

    .btn-skip {
        width: 40px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-muted);
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-skip:hover {
        border-color: var(--warning);
        color: var(--warning);
    }

    .completed-badge {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(34, 197, 94, 0.2);
        border-radius: 10px;
        color: var(--success);
        font-size: 1.25rem;
    }

    .skipped-badge {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        color: var(--text-muted);
        font-size: 1.25rem;
    }

    /* ═══════════════════════════════════════════
       CTA SECTION
    ═══════════════════════════════════════════ */
    .cta-section {
        text-align: center;
    }

    .btn-primary {
        display: inline-block;
        padding: 16px 32px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        border: none;
        border-radius: 14px;
        color: white;
        font-family: inherit;
        font-size: 1rem;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px var(--primary-glow);
    }

    .btn-secondary {
        display: inline-block;
        padding: 14px 28px;
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 12px;
        color: var(--text);
        font-family: inherit;
        font-size: 0.9375rem;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-secondary:hover {
        border-color: var(--primary);
        color: var(--primary);
    }

    /* ═══════════════════════════════════════════
       EMPTY STATE
    ═══════════════════════════════════════════ */
    .empty-state {
        text-align: center;
        padding: 60px 24px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        margin-bottom: 24px;
    }

    .empty-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .empty-state h3 {
        font-size: 1.25rem;
        font-weight: 700;
        margin-bottom: 8px;
    }

    .empty-state p {
        color: var(--text-dim);
        margin-bottom: 24px;
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
    }

    .auth-prompt p {
        color: var(--text-dim);
        margin-bottom: 28px;
    }

    /* ═══════════════════════════════════════════
       RESPONSIVE
    ═══════════════════════════════════════════ */
    @media (max-width: 640px) {
        .task-card {
            flex-wrap: wrap;
        }

        .task-time {
            width: 100%;
            margin-bottom: 4px;
        }

        .task-actions {
            flex-direction: row;
            width: 100%;
            margin-top: 12px;
        }

        .btn-complete, .btn-skip, .completed-badge, .skipped-badge {
            flex: 1;
        }
    }
`
