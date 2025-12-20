'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser, UserButton } from '@clerk/nextjs'
import styles from './dashboard.module.css'
import { AREA_INFO, AreaSlug, getLevelInfo } from '@/lib/supabase/types'

interface DashboardData {
    profile: {
        full_name: string | null
        xp: number
        streak_days: number
        lives: number
    }
    areas: Array<{
        slug: string
        name: string
        progress: number
        has_primary_goal: boolean
    }>
    primaryGoal: {
        title: string
        progress: number
        area_name: string
    } | null
    todayTasks: Array<{
        id: string
        title: string
        status: string
        is_boss_task: boolean
        xp_reward: number
        goal_title?: string
    }>
    currentActivity: {
        title: string
        started_at: string
        planned_duration_minutes: number
    } | null
}

const NAV_ITEMS = [
    { href: '/la-mia-vita', icon: '🏠', label: 'Dashboard', active: true },
    { href: '/chat', icon: '💬', label: 'Chat con NUR' },
    { href: '/goals', icon: '🎯', label: 'Obiettivi' },
    { href: '/skills', icon: '🛠️', label: 'Skills' },
    { href: '/materials', icon: '📚', label: 'Materiali' },
    { href: '/routine', icon: '⏰', label: 'Routine' },
]

export function Dashboard() {
    const { user } = useUser()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/dashboard')
            if (res.ok) {
                const data = await res.json()
                setData(data)
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const levelInfo = data?.profile ? getLevelInfo(data.profile.xp) : null

    if (loading) {
        return (
            <div className={styles.layout}>
                <div className="bg-gradient" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: '1 / -1' }}>
                    <div className="animate-pulse">Caricamento...</div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.layout}>
            <div className="bg-gradient" />

            {/* Left Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>✦</span>
                    <span className={styles.logoText}>NUR: LIFE</span>
                </div>

                <nav className={styles.nav}>
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${item.active ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}

                    <div className={styles.navDivider} />

                    <Link href="/profilo" className={styles.navItem}>
                        <span className={styles.navIcon}>⚙️</span>
                        Impostazioni
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userCard}>
                        <div className={styles.userAvatar}>
                            {data?.profile?.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>
                                {data?.profile?.full_name || 'Utente'}
                            </div>
                            <div className={styles.userLevel}>
                                Lv. {levelInfo?.level || 1} · {levelInfo?.title || 'Dormiente'}
                            </div>
                        </div>
                        <UserButton />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Stats Row */}
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.purple}`}>⭐</div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{levelInfo?.level || 1}</div>
                            <div className={styles.statLabel}>Livello</div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.gold}`}>💎</div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{data?.profile?.xp || 0}</div>
                            <div className={styles.statLabel}>XP Totali</div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.green}`}>🔥</div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{data?.profile?.streak_days || 0}</div>
                            <div className={styles.statLabel}>Giorni Streak</div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.red}`}>❤️</div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{data?.profile?.lives || 3}/3</div>
                            <div className={styles.statLabel}>Vite</div>
                        </div>
                    </div>
                </div>

                {/* Mission Banner */}
                {data?.primaryGoal && (
                    <div className={styles.missionBanner}>
                        <div className={styles.missionIcon}>🎯</div>
                        <div className={styles.missionContent}>
                            <div className={styles.missionLabel}>OBIETTIVO PRIMARIO</div>
                            <div className={styles.missionTitle}>{data.primaryGoal.title}</div>
                            <div className={styles.missionProgress}>
                                <div className={styles.missionProgressBar}>
                                    <div
                                        className={styles.missionProgressFill}
                                        style={{ width: `${data.primaryGoal.progress}%` }}
                                    />
                                </div>
                                <span className={styles.missionProgressText}>
                                    {data.primaryGoal.progress}%
                                </span>
                            </div>
                        </div>
                        <Link href="/goals">
                            <button className={styles.missionAction}>Vai al Goal</button>
                        </Link>
                    </div>
                )}

                {/* Areas Section */}
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <span>🌍</span> Le Tue Aree
                    </h2>
                    <Link href="/area" className={styles.sectionLink}>
                        Vedi tutte →
                    </Link>
                </div>

                <div className={styles.areasGrid}>
                    {data?.areas?.slice(0, 5).map((area) => {
                        const info = AREA_INFO[area.slug as AreaSlug]
                        return (
                            <Link
                                key={area.slug}
                                href={`/area/${area.slug}`}
                                className={`${styles.areaCard} ${area.has_primary_goal ? styles.hasPrimary : ''}`}
                            >
                                <div className={styles.areaIcon}>{info?.icon || '📌'}</div>
                                <div className={styles.areaName}>{area.name}</div>
                                <div className={styles.areaProgress}>{area.progress}%</div>
                                <div className={styles.areaBar}>
                                    <div
                                        className={styles.areaBarFill}
                                        style={{
                                            width: `${area.progress}%`,
                                            background: info?.color || 'var(--purple)'
                                        }}
                                    />
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* Tasks Section */}
                <div className={styles.tasksSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <span>📋</span> Task di Oggi
                        </h2>
                        <span className={styles.sectionLink}>
                            {data?.todayTasks?.filter(t => t.status === 'completed').length || 0}/
                            {data?.todayTasks?.length || 0} completati
                        </span>
                    </div>

                    <div className={styles.tasksList}>
                        {data?.todayTasks?.length === 0 ? (
                            <div className={styles.taskItem}>
                                <div className={styles.taskContent}>
                                    <div className={styles.taskTitle}>Nessun task per oggi</div>
                                    <div className={styles.taskMeta}>Parla con NUR per creare dei task</div>
                                </div>
                            </div>
                        ) : (
                            data?.todayTasks?.map((task) => (
                                <div
                                    key={task.id}
                                    className={`${styles.taskItem} ${task.is_boss_task ? styles.boss : ''} ${task.status === 'completed' ? styles.completed : ''}`}
                                >
                                    <div className={styles.taskCheckbox}>
                                        {task.status === 'completed' && '✓'}
                                    </div>
                                    <div className={styles.taskContent}>
                                        <div className={styles.taskTitle}>{task.title}</div>
                                        <div className={styles.taskMeta}>
                                            {task.goal_title && <span>{task.goal_title}</span>}
                                        </div>
                                    </div>
                                    {task.is_boss_task && (
                                        <span className={styles.taskBadge}>BOSS</span>
                                    )}
                                    <span className={styles.taskXp}>+{task.xp_reward} XP</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Right Panel */}
            <aside className={styles.rightPanel}>
                {/* Current Activity */}
                {data?.currentActivity && (
                    <div className={styles.activityCard}>
                        <div className={styles.activityHeader}>
                            <div className={styles.activityLabel}>
                                <span className={styles.activityDot} />
                                In corso
                            </div>
                            <div className={styles.activityTimer}>
                                {formatTimer(data.currentActivity.started_at, data.currentActivity.planned_duration_minutes)}
                            </div>
                        </div>
                        <div className={styles.activityTitle}>{data.currentActivity.title}</div>
                        <div className={styles.activityProgress}>
                            <div
                                className={styles.activityProgressFill}
                                style={{ width: `${calculateProgress(data.currentActivity.started_at, data.currentActivity.planned_duration_minutes)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Streak Card */}
                <div className={styles.streakCard}>
                    <div className={styles.streakIcon}>🔥</div>
                    <div className={styles.streakValue}>{data?.profile?.streak_days || 0}</div>
                    <div className={styles.streakLabel}>giorni di streak</div>
                    {(data?.profile?.streak_days || 0) >= 7 && (
                        <div className={styles.streakBonus}>
                            +{getStreakBonus(data?.profile?.streak_days || 0)}% XP Bonus
                        </div>
                    )}
                </div>

                {/* NUR Widget */}
                <div className={styles.nurWidget}>
                    <div className={styles.nurHeader}>
                        <div className={styles.nurAvatar}>✦</div>
                        <div>
                            <div className={styles.nurName}>NUR</div>
                            <div className={styles.nurStatus}>Online</div>
                        </div>
                    </div>
                    <div className={styles.nurMessages}>
                        <div className={styles.nurMessage}>
                            Ehi! Come sta andando oggi? Hai bisogno di aiuto con qualcosa?
                        </div>
                    </div>
                    <div className={styles.nurInput}>
                        <Link href="/chat">
                            <input
                                className={styles.nurInputField}
                                placeholder="Scrivi a NUR..."
                                readOnly
                            />
                        </Link>
                    </div>
                </div>
            </aside>
        </div>
    )
}

function formatTimer(startedAt: string, plannedMinutes: number): string {
    const start = new Date(startedAt)
    const elapsed = Math.floor((Date.now() - start.getTime()) / 60000)
    const remaining = Math.max(0, plannedMinutes - elapsed)
    const mins = Math.floor(remaining)
    const secs = Math.floor((remaining - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

function calculateProgress(startedAt: string, plannedMinutes: number): number {
    const start = new Date(startedAt)
    const elapsed = (Date.now() - start.getTime()) / 60000
    return Math.min(100, (elapsed / plannedMinutes) * 100)
}

function getStreakBonus(days: number): number {
    if (days >= 30) return 50
    if (days >= 14) return 25
    if (days >= 7) return 10
    return 0
}
