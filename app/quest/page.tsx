'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'

// ============================================
// TYPES
// ============================================

interface Quest {
    id: string
    chapter: number
    order_in_chapter: number
    title: string
    description: string
    icon: string
    xp_reward: number
    completion_type: string
    unlock_after: string | null
    progress?: {
        status: 'locked' | 'available' | 'in_progress' | 'completed'
        progress_percent: number
        started_at: string | null
        completed_at: string | null
        xp_awarded: number
    }
}

interface ChapterInfo {
    number: number
    title: string
    description: string
    quests: Quest[]
    isLocked: boolean
    completedCount: number
}

interface UserStats {
    level: number
    xp: number
    xp_to_next_level: number
    streak: number
    lives: number
    max_lives: number
    total_quests_completed: number
}

// ============================================
// CHAPTER CONFIG
// ============================================

const CHAPTER_CONFIG: Record<number, { title: string; description: string; icon: string }> = {
    0: { title: 'Il Risveglio', description: 'Incontra NUR e inizia il tuo viaggio', icon: '🌅' },
    1: { title: 'Le Fondamenta', description: 'Costruisci le basi del tuo sistema', icon: '🏗️' },
    2: { title: 'La Routine', description: 'Crea abitudini che durano', icon: '🔄' },
    3: { title: 'La Crescita', description: 'Espandi i tuoi obiettivi', icon: '🌱' },
    4: { title: 'La Maestria', description: 'Padroneggia il tuo percorso', icon: '⭐' },
    5: { title: 'La Trascendenza', description: 'Vai oltre i limiti', icon: '🚀' }
}

// ============================================
// COMPONENT
// ============================================

export default function QuestPage() {
    const { user, isLoaded } = useUser()
    const [loading, setLoading] = useState(true)
    const [quests, setQuests] = useState<Quest[]>([])
    const [chapters, setChapters] = useState<ChapterInfo[]>([])
    const [stats, setStats] = useState<UserStats | null>(null)
    const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
    const [expandedChapter, setExpandedChapter] = useState<number | null>(null)

    useEffect(() => {
        if (user) loadData()
    }, [user])

    const loadData = async () => {
        if (!user) return

        try {
            // Carica quests con progressione
            const questsRes = await fetch(`/api/quests?userId=${user.id}&stats=true`)
            const questsData = await questsRes.json()

            if (questsData.quests) {
                setQuests(questsData.quests)

                // Organizza per capitolo
                const chaptersMap = new Map<number, Quest[]>()
                for (const quest of questsData.quests) {
                    const existing = chaptersMap.get(quest.chapter) || []
                    chaptersMap.set(quest.chapter, [...existing, quest])
                }

                // Crea chapter info
                const chaptersInfo: ChapterInfo[] = []
                for (const [num, chapterQuests] of chaptersMap) {
                    const config = CHAPTER_CONFIG[num] || { title: `Capitolo ${num}`, description: '', icon: '📖' }
                    const completedCount = chapterQuests.filter(q => q.progress?.status === 'completed').length
                    const isLocked = chapterQuests.every(q => q.progress?.status === 'locked')

                    chaptersInfo.push({
                        number: num,
                        title: config.title,
                        description: config.description,
                        quests: chapterQuests.sort((a, b) => a.order_in_chapter - b.order_in_chapter),
                        isLocked,
                        completedCount
                    })
                }

                setChapters(chaptersInfo.sort((a, b) => a.number - b.number))

                // Trova quest attiva
                const active = questsData.quests.find((q: Quest) => q.progress?.status === 'in_progress')
                setActiveQuest(active || null)

                // Auto-espandi capitolo con quest attiva o primo disponibile
                if (active) {
                    setExpandedChapter(active.chapter)
                } else {
                    const firstAvailable = questsData.quests.find((q: Quest) => q.progress?.status === 'available')
                    if (firstAvailable) {
                        setExpandedChapter(firstAvailable.chapter)
                    }
                }
            }

            if (questsData.stats) {
                setStats(questsData.stats)
            }
        } catch (e) {
            console.error('Error loading quests:', e)
        }

        setLoading(false)
    }

    const handleStartQuest = async (questId: string) => {
        if (!user) return

        try {
            const res = await fetch('/api/quests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start',
                    userId: user.id,
                    questId
                })
            })

            if (res.ok) {
                await loadData()
            }
        } catch (e) {
            console.error('Error starting quest:', e)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return '✓'
            case 'in_progress': return '●'
            case 'available': return '○'
            default: return '🔒'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'var(--success)'
            case 'in_progress': return 'var(--primary)'
            case 'available': return 'var(--warning)'
            default: return 'var(--text-muted)'
        }
    }

    if (!isLoaded || loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Caricamento quest...</p>
                <style jsx>{styles}</style>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="container">
                <div className="auth-prompt">
                    <div className="auth-icon">🎮</div>
                    <h1>Quest System</h1>
                    <p>Accedi per vedere le tue quest</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    const totalQuests = quests.length
    const completedQuests = quests.filter(q => q.progress?.status === 'completed').length
    const overallProgress = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0

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
                        <h1 className="page-title">🎮 Quest</h1>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            {/* ═══════════════════════════════════════════
                MAIN CONTENT
            ═══════════════════════════════════════════ */}
            <main className="main">
                {/* Overall Progress */}
                <section className="progress-overview">
                    <div className="progress-header">
                        <div>
                            <div className="progress-label">Progresso Totale</div>
                            <div className="progress-value">{completedQuests}/{totalQuests} Quest</div>
                        </div>
                        <div className="progress-percent">{overallProgress}%</div>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${overallProgress}%` }}></div>
                    </div>
                </section>

                {/* Active Quest Highlight */}
                {activeQuest && (
                    <section className="active-quest">
                        <div className="active-badge">
                            <span className="dot"></span>
                            Quest Attiva
                        </div>
                        <div className="active-icon">{activeQuest.icon}</div>
                        <h2 className="active-title">{activeQuest.title}</h2>
                        <p className="active-desc">{activeQuest.description}</p>
                        <div className="active-reward">+{activeQuest.xp_reward} XP</div>
                        <Link href="/chat" className="btn-primary">
                            💬 Vai da NUR per completarla
                        </Link>
                    </section>
                )}

                {/* Chapters */}
                <section className="chapters">
                    {chapters.map(chapter => (
                        <div
                            key={chapter.number}
                            className={`chapter ${chapter.isLocked ? 'locked' : ''} ${expandedChapter === chapter.number ? 'expanded' : ''}`}
                        >
                            <div
                                className="chapter-header"
                                onClick={() => !chapter.isLocked && setExpandedChapter(
                                    expandedChapter === chapter.number ? null : chapter.number
                                )}
                            >
                                <div className="chapter-icon">
                                    {chapter.isLocked ? '🔒' : CHAPTER_CONFIG[chapter.number]?.icon || '📖'}
                                </div>
                                <div className="chapter-info">
                                    <div className="chapter-number">Capitolo {chapter.number}</div>
                                    <div className="chapter-title">{chapter.title}</div>
                                    <div className="chapter-desc">{chapter.description}</div>
                                </div>
                                <div className="chapter-progress">
                                    <span className="progress-text">{chapter.completedCount}/{chapter.quests.length}</span>
                                    {!chapter.isLocked && (
                                        <span className="expand-icon">{expandedChapter === chapter.number ? '▼' : '▶'}</span>
                                    )}
                                </div>
                            </div>

                            {expandedChapter === chapter.number && !chapter.isLocked && (
                                <div className="chapter-quests">
                                    {chapter.quests.map(quest => (
                                        <div
                                            key={quest.id}
                                            className={`quest-item ${quest.progress?.status || 'locked'}`}
                                        >
                                            <div
                                                className="quest-status"
                                                style={{ color: getStatusColor(quest.progress?.status || 'locked') }}
                                            >
                                                {getStatusIcon(quest.progress?.status || 'locked')}
                                            </div>
                                            <div className="quest-icon">{quest.icon}</div>
                                            <div className="quest-content">
                                                <div className="quest-title">{quest.title}</div>
                                                <div className="quest-desc">{quest.description}</div>
                                                {quest.progress?.status === 'in_progress' && quest.progress.progress_percent > 0 && (
                                                    <div className="quest-progress-bar">
                                                        <div
                                                            className="quest-progress-fill"
                                                            style={{ width: `${quest.progress.progress_percent}%` }}
                                                        ></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="quest-reward">
                                                {quest.progress?.status === 'completed' ? (
                                                    <span className="completed-badge">✓</span>
                                                ) : (
                                                    <span className="xp-badge">+{quest.xp_reward}</span>
                                                )}
                                            </div>
                                            {quest.progress?.status === 'available' && (
                                                <button
                                                    className="btn-start"
                                                    onClick={() => handleStartQuest(quest.id)}
                                                >
                                                    Inizia
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </section>

                {/* Stats Summary */}
                {stats && (
                    <section className="stats-summary">
                        <div className="stat-item">
                            <div className="stat-icon">⭐</div>
                            <div className="stat-value">{stats.level}</div>
                            <div className="stat-label">Livello</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-icon">🔥</div>
                            <div className="stat-value">{stats.streak}</div>
                            <div className="stat-label">Streak</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-icon">🏆</div>
                            <div className="stat-value">{stats.total_quests_completed || completedQuests}</div>
                            <div className="stat-label">Quest</div>
                        </div>
                    </section>
                )}
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
                    <Link href="/quest" className="nav-item active">
                        <span className="nav-icon">🎮</span>
                        <span className="nav-label">Quest</span>
                    </Link>
                    <Link href="/giornale" className="nav-item">
                        <span className="nav-icon">🗂️</span>
                        <span className="nav-label">Scrivania</span>
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
       PROGRESS OVERVIEW
    ═══════════════════════════════════════════ */
    .progress-overview {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 12px;
    }

    .progress-label {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--text-muted);
        margin-bottom: 4px;
    }

    .progress-value {
        font-weight: 700;
    }

    .progress-percent {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--primary);
    }

    .progress-bar {
        height: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        transition: width 0.5s ease;
    }

    /* ═══════════════════════════════════════════
       ACTIVE QUEST
    ═══════════════════════════════════════════ */
    .active-quest {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(217, 70, 239, 0.1));
        border: 2px solid rgba(139, 92, 246, 0.3);
        border-radius: 20px;
        padding: 28px;
        text-align: center;
        margin-bottom: 24px;
    }

    .active-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        background: rgba(139, 92, 246, 0.2);
        border-radius: 100px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--primary-light);
        margin-bottom: 16px;
    }

    .active-badge .dot {
        width: 8px;
        height: 8px;
        background: var(--primary);
        border-radius: 50%;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    .active-icon {
        font-size: 3rem;
        margin-bottom: 12px;
    }

    .active-title {
        font-size: 1.375rem;
        font-weight: 800;
        margin-bottom: 8px;
    }

    .active-desc {
        color: var(--text-dim);
        font-size: 0.9375rem;
        margin-bottom: 16px;
    }

    .active-reward {
        display: inline-block;
        padding: 8px 20px;
        background: rgba(34, 197, 94, 0.15);
        border: 1px solid rgba(34, 197, 94, 0.3);
        border-radius: 100px;
        color: var(--success);
        font-family: 'JetBrains Mono', monospace;
        font-weight: 800;
        margin-bottom: 20px;
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

    /* ═══════════════════════════════════════════
       CHAPTERS
    ═══════════════════════════════════════════ */
    .chapters {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .chapter {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
        transition: all 0.3s;
    }

    .chapter.locked {
        opacity: 0.5;
    }

    .chapter.expanded {
        border-color: rgba(139, 92, 246, 0.3);
    }

    .chapter-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        cursor: pointer;
        transition: background 0.3s;
    }

    .chapter:not(.locked) .chapter-header:hover {
        background: rgba(255,255,255,0.02);
    }

    .chapter-icon {
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(139, 92, 246, 0.1);
        border-radius: 12px;
        font-size: 1.5rem;
    }

    .chapter.locked .chapter-icon {
        background: rgba(255,255,255,0.05);
    }

    .chapter-info {
        flex: 1;
    }

    .chapter-number {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--text-muted);
        margin-bottom: 2px;
    }

    .chapter-title {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 2px;
    }

    .chapter-desc {
        font-size: 0.8125rem;
        color: var(--text-dim);
    }

    .chapter-progress {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .progress-text {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.875rem;
        color: var(--text-dim);
    }

    .expand-icon {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    /* ═══════════════════════════════════════════
       QUEST ITEMS
    ═══════════════════════════════════════════ */
    .chapter-quests {
        border-top: 1px solid var(--border);
        padding: 12px;
        background: var(--surface-2);
    }

    .quest-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border);
        border-radius: 12px;
        margin-bottom: 8px;
        transition: all 0.3s;
    }

    .quest-item:last-child {
        margin-bottom: 0;
    }

    .quest-item.in_progress {
        border-color: rgba(139, 92, 246, 0.3);
        background: rgba(139, 92, 246, 0.05);
    }

    .quest-item.completed {
        opacity: 0.7;
    }

    .quest-item.locked {
        opacity: 0.4;
    }

    .quest-status {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        font-weight: 700;
    }

    .quest-icon {
        font-size: 1.5rem;
    }

    .quest-content {
        flex: 1;
    }

    .quest-title {
        font-size: 0.9375rem;
        font-weight: 700;
        margin-bottom: 2px;
    }

    .quest-desc {
        font-size: 0.75rem;
        color: var(--text-dim);
    }

    .quest-progress-bar {
        height: 3px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        margin-top: 8px;
        overflow: hidden;
    }

    .quest-progress-fill {
        height: 100%;
        background: var(--primary);
    }

    .quest-reward {
        text-align: right;
    }

    .xp-badge {
        display: inline-block;
        padding: 4px 10px;
        background: rgba(34, 197, 94, 0.1);
        border: 1px solid rgba(34, 197, 94, 0.2);
        border-radius: 100px;
        color: var(--success);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .completed-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: var(--success);
        border-radius: 50%;
        color: white;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .btn-start {
        padding: 8px 16px;
        background: var(--primary);
        border: none;
        border-radius: 8px;
        color: white;
        font-family: inherit;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-start:hover {
        background: var(--primary-light);
    }

    /* ═══════════════════════════════════════════
       STATS SUMMARY
    ═══════════════════════════════════════════ */
    .stats-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 24px;
    }

    .stat-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 20px;
        text-align: center;
    }

    .stat-icon {
        font-size: 1.5rem;
        margin-bottom: 8px;
    }

    .stat-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--primary);
    }

    .stat-label {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
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
        .chapter-header {
            padding: 16px;
        }

        .chapter-icon {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
        }

        .chapter-desc {
            display: none;
        }

        .quest-item {
            flex-wrap: wrap;
        }

        .btn-start {
            width: 100%;
            margin-top: 8px;
        }

        .stats-summary {
            grid-template-columns: repeat(3, 1fr);
        }

        .stat-item {
            padding: 14px 10px;
        }

        .stat-value {
            font-size: 1.25rem;
        }
    }
`
