"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { UserButton, useUser } from "@clerk/nextjs"
import { supabase } from "@/lib/supabase"

// ============================================
// TYPES - UNIFIED SYSTEM
// ============================================

interface Profile {
    level: number
    xp: number
    xp_to_next_level: number
    streak: number
    lives: number
    max_lives: number
    rank: string
    onboarding_completed: boolean
}

interface Quest {
    id: string
    chapter: number
    sort_order: number
    title: string
    description: string
    xp_reward: number
    icon: string
    status: "locked" | "available" | "in_progress" | "completed"
    completed_at?: string
}

// ============================================
// HELPERS
// ============================================

function getLevelTitle(level: number): { title: string; emoji: string } {
    if (level <= 5) return { title: "Dormiente", emoji: "🌱" }
    if (level <= 10) return { title: "Risvegliato", emoji: "🌿" }
    if (level <= 15) return { title: "Cercatore", emoji: "🌳" }
    if (level <= 20) return { title: "Viaggiatore", emoji: "⭐" }
    if (level <= 30) return { title: "Maestro", emoji: "🔥" }
    if (level <= 50) return { title: "Saggio", emoji: "👑" }
    return { title: "Leggenda", emoji: "🌌" }
}

function getStreakMultiplier(streak: number): number {
    if (streak >= 30) return 2.0
    if (streak >= 14) return 1.5
    if (streak >= 7) return 1.25
    if (streak >= 3) return 1.1
    return 1.0
}


// ============================================
// COMPONENT
// ============================================

export default function LaMiaVitaPage() {
    const { user, isLoaded } = useUser()
    const [loading, setLoading] = useState(true)
    
    // Profile data (from profiles table)
    const [profile, setProfile] = useState<Profile>({
        level: 1,
        xp: 0,
        xp_to_next_level: 100,
        streak: 0,
        lives: 3,
        max_lives: 3,
        rank: "dormiente",
        onboarding_completed: false
    })
    
    // Quest data (from user_quest_progress + game_quests)
    const [quests, setQuests] = useState<Quest[]>([])
    const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
    const [currentChapter, setCurrentChapter] = useState(0)
    
    // Computed values
    const levelTitle = getLevelTitle(profile.level)
    const streakMultiplier = getStreakMultiplier(profile.streak)
    const xpProgress = profile.xp_to_next_level > 0
        ? Math.round((profile.xp / profile.xp_to_next_level) * 100)
        : 0
    
    const chapterQuests = quests.filter(q => q.chapter === currentChapter)
    const completedInChapter = chapterQuests.filter(q => q.status === "completed").length
    const chapterProgress = chapterQuests.length > 0 
        ? Math.round((completedInChapter / chapterQuests.length) * 100)
        : 0

    useEffect(() => {
        if (user) loadData()
    }, [user])

    const loadData = async () => {
        if (!user) return

        try {
            // 1. Load profile (game stats) from profiles table
            const { data: profileData } = await supabase
                .from("profiles")
                .select("level, xp, xp_to_next_level, streak, lives, max_lives, rank, onboarding_completed")
                .eq("clerk_user_id", user.id)
                .single()

            if (profileData) {
                setProfile({
                    level: profileData.level || 1,
                    xp: profileData.xp || 0,
                    xp_to_next_level: profileData.xp_to_next_level || 100,
                    streak: profileData.streak || 0,
                    lives: profileData.lives ?? 3,
                    max_lives: profileData.max_lives || 3,
                    rank: profileData.rank || "dormiente",
                    onboarding_completed: profileData.onboarding_completed || false
                })
            }

            // 2. Load quests with progress (UNIFIED: from user_quest_progress + game_quests)
            const { data: questData } = await supabase
                .from("user_quest_progress")
                .select(`
                    quest_id,
                    status,
                    completed_at,
                    game_quests (
                        id,
                        chapter,
                        sort_order,
                        title,
                        description,
                        xp_reward,
                        icon
                    )
                `)
                .eq("clerk_user_id", user.id)
                .order("quest_id")

            if (questData) {
                const formattedQuests: Quest[] = questData
                    .filter(q => q.game_quests)
                    .map(q => ({
                        id: (q.game_quests as any).id,
                        chapter: (q.game_quests as any).chapter,
                        sort_order: (q.game_quests as any).sort_order,
                        title: (q.game_quests as any).title,
                        description: (q.game_quests as any).description,
                        xp_reward: (q.game_quests as any).xp_reward,
                        icon: (q.game_quests as any).icon || "📜",
                        status: q.status as Quest["status"],
                        completed_at: q.completed_at || undefined
                    }))
                    .sort((a, b) => {
                        if (a.chapter !== b.chapter) return a.chapter - b.chapter
                        return a.sort_order - b.sort_order
                    })

                setQuests(formattedQuests)

                // Find active quest (first in_progress or available)
                const active = formattedQuests.find(q => q.status === "in_progress" || q.status === "available")
                setActiveQuest(active || null)
                
                // Set current chapter
                if (active) {
                    setCurrentChapter(active.chapter)
                } else {
                    const incompleteQuest = formattedQuests.find(q => q.status !== "completed")
                    setCurrentChapter(incompleteQuest?.chapter || 0)
                }
            }
        } catch (e) {
            console.error("Error loading data:", e)
        }

        setLoading(false)
    }

    // Loading state
    if (!isLoaded || loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Caricamento...</p>
                <style jsx>{styles}</style>
            </div>
        )
    }

    // Not logged in
    if (!user) {
        return (
            <div className="container">
                <div className="auth-prompt">
                    <div className="auth-icon">🎯</div>
                    <h1>Il Gioco della Vita</h1>
                    <p>Accedi per iniziare la tua avventura</p>
                    <Link href="/sign-in" className="btn-primary">Accedi</Link>
                </div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    const isNewUser = !profile.onboarding_completed && quests.length === 0

    return (
        <div className="container">
            <div className="bg-ambient"></div>

            {/* TOP BAR */}
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="player">
                        <Link href="/" className="home-btn">🏠</Link>
                        <div className="level-badge" style={{ "--progress": xpProgress } as React.CSSProperties}>
                            <div className="level-ring"></div>
                            <div className="level-inner">
                                <span className="level-num">{profile.level}</span>
                            </div>
                        </div>
                        <div className="player-info">
                            <div className="player-rank">{levelTitle.emoji} {levelTitle.title}</div>
                            <div className="xp-row">
                                <div className="xp-bar">
                                    <div className="xp-fill" style={{ width: xpProgress + "%" }}></div>
                                </div>
                                <span className="xp-text">{profile.xp} / {profile.xp_to_next_level}</span>
                            </div>
                        </div>
                    </div>
                    <div className="stats">
                        <div className="streak" title={streakMultiplier + "x XP"}>
                            <span>🔥</span>
                            <span>{profile.streak}</span>
                            {streakMultiplier > 1 && <span className="streak-mult">x{streakMultiplier}</span>}
                        </div>
                        <div className="lives">
                            {Array.from({ length: profile.max_lives }).map((_, i) => (
                                <span key={i} className={"heart " + (i >= profile.lives ? "dead" : "")}>❤️</span>
                            ))}
                        </div>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </header>

            {/* MAIN */}
            <main className="main">
                
                {/* ONBOARDING - New user */}
                {isNewUser && (
                    <section className="onboarding-screen">
                        <div className="onboarding-glow"></div>
                        <div className="nur-avatar-large">
                            <div className="avatar-ring"></div>
                            <span className="avatar-emoji">🌟</span>
                        </div>
                        <h1 className="onboarding-title">Ciao! Sono NUR</h1>
                        <p className="onboarding-subtitle">
                            Il tuo coach personale per trasformare i sogni in realta.
                        </p>
                        <div className="first-quest">
                            <div className="quest-badge">
                                <span>⭐</span> PRIMA QUEST
                            </div>
                            <h3>Incontra NUR</h3>
                            <p>Inizia la conversazione e scopri come posso aiutarti.</p>
                            <div className="quest-reward">
                                <span className="reward-xp">+30 XP</span>
                            </div>
                        </div>
                        <Link href="/chat" className="btn-primary-lg pulse">
                            💬 Inizia la conversazione
                        </Link>
                    </section>
                )}

                {/* ACTIVE QUEST */}
                {!isNewUser && activeQuest && (
                    <section className="quest-hero">
                        <div className="quest-meta">
                            <div className="quest-badge-active">
                                <span className="dot"></span>
                                <span>Quest Attiva</span>
                            </div>
                            <span className="quest-chapter-label">
                                Capitolo {activeQuest.chapter}: {activeQuest.chapter === 0 ? "Il Risveglio" : "Le Fondamenta"}
                            </span>
                        </div>
                        <div className="quest-icon-large">{activeQuest.icon}</div>
                        <h1 className="quest-title">{activeQuest.title}</h1>
                        <p className="quest-desc">{activeQuest.description}</p>
                        <div className="quest-reward-box">
                            <span className="xp-reward">+{activeQuest.xp_reward} XP</span>
                        </div>
                        <Link href="/chat" className="btn-primary-lg">
                            💬 Parla con NUR
                        </Link>
                    </section>
                )}

                {/* NO ACTIVE QUEST */}
                {!isNewUser && !activeQuest && quests.length > 0 && (
                    <section className="empty-quest">
                        <div className="empty-icon">🎉</div>
                        <h2>Tutte le quest completate!</h2>
                        <p>Continua a parlare con NUR per scoprire nuove sfide.</p>
                        <Link href="/chat" className="btn-primary">
                            💬 Parla con NUR
                        </Link>
                    </section>
                )}

                {/* CHAPTER PROGRESS */}
                {!isNewUser && chapterQuests.length > 0 && (
                    <section className="chapter-card">
                        <div className="chapter-header">
                            <div>
                                <div className="chapter-label">Capitolo {currentChapter}</div>
                                <div className="chapter-title">
                                    {currentChapter === 0 ? "Il Risveglio" : currentChapter === 1 ? "Le Fondamenta" : "Capitolo " + currentChapter}
                                </div>
                            </div>
                            <div className="chapter-progress-num">{chapterProgress}%</div>
                        </div>
                        <div className="chapter-progress-bar">
                            <div className="chapter-progress-fill" style={{ width: chapterProgress + "%" }}></div>
                        </div>
                        <div className="chapter-quests">
                            {chapterQuests.map(quest => (
                                <div key={quest.id} className={"chapter-quest-item " + quest.status}>
                                    <div className="quest-status-icon">
                                        {quest.status === "completed" ? "✓" : quest.status === "in_progress" ? "●" : quest.status === "available" ? "○" : "🔒"}
                                    </div>
                                    <div className="quest-info">
                                        <span className="quest-name">{quest.icon} {quest.title}</span>
                                        <span className="quest-xp">+{quest.xp_reward} XP</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="chapter-footer">
                            <span>{completedInChapter}/{chapterQuests.length} completate</span>
                            <Link href="/quest" className="see-all-link">Vedi tutte →</Link>
                        </div>
                    </section>
                )}

                {/* QUICK STATS */}
                {!isNewUser && (
                    <section className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">⚡</div>
                            <div className="stat-value">{profile.xp}</div>
                            <div className="stat-label">XP Totali</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🔥</div>
                            <div className="stat-value">{profile.streak}</div>
                            <div className="stat-label">Giorni Streak</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-value">{quests.filter(q => q.status === "completed").length}</div>
                            <div className="stat-label">Quest Completate</div>
                        </div>
                    </section>
                )}

            </main>

            {/* BOTTOM NAV */}
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
                    <Link href="/routine" className="nav-item">
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
        --border: rgba(255,255,255,0.08);
        --text: #f5f5f5;
        --text-dim: #a1a1aa;
        --text-muted: #52525b;
        --primary: #8b5cf6;
        --primary-light: #a78bfa;
        --primary-glow: rgba(139, 92, 246, 0.4);
        --accent: #f472b6;
        --success: #22c55e;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .container {
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        position: relative;
        overflow-x: hidden;
        padding-bottom: 80px;
    }

    .bg-ambient {
        position: fixed;
        top: -50%;
        left: 50%;
        transform: translateX(-50%);
        width: 150%;
        height: 100%;
        background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.08) 0%, transparent 60%);
        pointer-events: none;
        z-index: 0;
    }

    .topbar {
        position: sticky;
        top: 0;
        z-index: 50;
        background: rgba(3, 3, 5, 0.85);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--border);
        padding: 12px 16px;
    }

    .topbar-inner {
        max-width: 600px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .player {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .home-btn {
        font-size: 20px;
        text-decoration: none;
        padding: 8px;
        border-radius: 10px;
        background: var(--surface);
        transition: all 0.2s;
    }

    .home-btn:hover {
        background: var(--primary);
        transform: scale(1.1);
    }

    .level-badge {
        position: relative;
        width: 44px;
        height: 44px;
    }

    .level-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(
            var(--primary) calc(var(--progress) * 1%),
            rgba(255,255,255,0.1) calc(var(--progress) * 1%)
        );
    }

    .level-inner {
        position: absolute;
        inset: 3px;
        background: var(--surface);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .level-num {
        font-size: 1rem;
        font-weight: 800;
        color: var(--primary);
    }

    .player-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .player-rank {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-dim);
    }

    .xp-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .xp-bar {
        width: 80px;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        overflow: hidden;
    }

    .xp-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        transition: width 0.5s ease;
    }

    .xp-text {
        font-size: 0.625rem;
        color: var(--text-muted);
        font-family: monospace;
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
        padding: 6px 10px;
        background: rgba(255, 119, 0, 0.1);
        border-radius: 100px;
        font-size: 0.8125rem;
        font-weight: 700;
    }

    .streak-mult {
        font-size: 0.625rem;
        color: #ff7700;
        margin-left: 2px;
    }

    .lives {
        display: flex;
        gap: 2px;
    }

    .heart {
        font-size: 0.875rem;
        transition: all 0.3s;
    }

    .heart.dead {
        filter: grayscale(1);
        opacity: 0.3;
    }

    .main {
        position: relative;
        z-index: 1;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px 16px;
    }

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
        font-family: monospace;
        font-weight: 800;
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

    .quest-hero {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 32px;
        text-align: center;
        margin-bottom: 20px;
    }

    .quest-meta {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }

    .quest-badge-active {
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

    .quest-badge-active .dot {
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

    .quest-chapter-label {
        font-size: 0.8125rem;
        color: var(--text-dim);
    }

    .quest-icon-large {
        font-size: 3rem;
        margin-bottom: 12px;
    }

    .quest-title {
        font-size: 1.5rem;
        font-weight: 800;
        margin-bottom: 8px;
    }

    .quest-desc {
        color: var(--text-dim);
        font-size: 0.9375rem;
        margin-bottom: 20px;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
    }

    .quest-reward-box {
        margin-bottom: 24px;
    }

    .xp-reward {
        display: inline-block;
        background: rgba(34, 197, 94, 0.15);
        border: 1px solid rgba(34, 197, 94, 0.3);
        color: var(--success);
        padding: 10px 24px;
        border-radius: 100px;
        font-family: monospace;
        font-weight: 800;
        font-size: 1.125rem;
    }

    .empty-quest {
        text-align: center;
        padding: 60px 24px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        margin-bottom: 20px;
    }

    .empty-icon {
        font-size: 4rem;
        margin-bottom: 16px;
    }

    .empty-quest h2 {
        font-size: 1.25rem;
        margin-bottom: 8px;
    }

    .empty-quest p {
        color: var(--text-dim);
        margin-bottom: 24px;
    }

    .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 28px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        border: none;
        border-radius: 12px;
        color: white;
        font-weight: 700;
        text-decoration: none;
    }

    .chapter-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .chapter-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
    }

    .chapter-label {
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--text-muted);
        margin-bottom: 4px;
    }

    .chapter-title {
        font-size: 1rem;
        font-weight: 700;
    }

    .chapter-progress-num {
        font-family: monospace;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--primary);
    }

    .chapter-progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        margin-bottom: 16px;
        overflow: hidden;
    }

    .chapter-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        transition: width 1s ease;
    }

    .chapter-quests {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
    }

    .chapter-quest-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(255,255,255,0.02);
        border-radius: 10px;
    }

    .chapter-quest-item.in_progress {
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .quest-status-icon {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
        background: rgba(255,255,255,0.05);
        color: var(--text-muted);
    }

    .chapter-quest-item.completed .quest-status-icon {
        background: rgba(34, 197, 94, 0.15);
        color: var(--success);
    }

    .chapter-quest-item.in_progress .quest-status-icon {
        background: rgba(139, 92, 246, 0.15);
        color: var(--primary);
    }

    .quest-info {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .quest-name {
        font-size: 0.875rem;
        font-weight: 600;
    }

    .chapter-quest-item.completed .quest-name {
        color: var(--text-dim);
        text-decoration: line-through;
    }

    .chapter-quest-item.locked .quest-name {
        color: var(--text-muted);
    }

    .quest-xp {
        font-family: monospace;
        font-size: 0.75rem;
        color: var(--success);
    }

    .chapter-quest-item.locked .quest-xp {
        color: var(--text-muted);
    }

    .chapter-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .see-all-link {
        color: var(--primary);
        text-decoration: none;
        font-weight: 600;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
    }

    .stat-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
    }

    .stat-icon {
        font-size: 1.5rem;
        margin-bottom: 8px;
    }

    .stat-value {
        font-family: monospace;
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--primary);
    }

    .stat-label {
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
        margin-top: 4px;
    }

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
        text-decoration: none;
        transition: all 0.3s;
    }

    .nav-item:hover {
        color: var(--text-dim);
    }

    .nav-item.active {
        color: var(--primary);
        background: rgba(139, 92, 246, 0.1);
    }

    .nav-icon {
        font-size: 1.25rem;
    }

    .nav-label {
        font-size: 0.5625rem;
        font-weight: 700;
        text-transform: uppercase;
    }

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

    @media (max-width: 640px) {
        .player-info { display: none; }
        .stats-grid { grid-template-columns: 1fr; }
        .quest-hero { padding: 24px 16px; }
    }
`
