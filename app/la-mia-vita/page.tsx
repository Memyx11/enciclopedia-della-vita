'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'
import { getLevelInfo, AREA_INFO, AreaSlug } from '@/lib/supabase/types'
import styles from './home.module.css'

// ============================================
// TYPES
// ============================================

interface Profile {
    xp: number
    level: number
    title: string
    streak_days: number
    lives: number
    onboarding_completed: boolean
}

interface Task {
    id: string
    title: string
    description: string | null
    is_boss_task: boolean
    xp_reward: number
    status: 'pending' | 'completed' | 'failed' | 'skipped'
    goal?: { title: string; area?: { slug: AreaSlug } }
}

interface AreaStatus {
    slug: AreaSlug
    name: string
    has_primary_goal: boolean
    progress: number
}

// ============================================
// COMPONENT
// ============================================

export default function HomePage() {
    const router = useRouter()
    const { user, isLoaded } = useUser()

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [todayTasks, setTodayTasks] = useState<Task[]>([])
    const [areas, setAreas] = useState<AreaStatus[]>([])
    const [nurMessage, setNurMessage] = useState<string>('')

    useEffect(() => {
        if (!isLoaded) return
        if (!user) {
            router.push('/sign-in')
            return
        }
        loadData()
    }, [isLoaded, user, router])

    const loadData = async () => {
        if (!user) return

        try {
            const today = new Date().toISOString().split('T')[0]

            const [
                { data: profileData },
                { data: tasksData },
                { data: areasData }
            ] = await Promise.all([
                supabaseClient
                    .from('profiles')
                    .select('xp, level, title, streak_days, lives, onboarding_completed')
                    .eq('clerk_user_id', user.id)
                    .single(),
                supabaseClient
                    .from('tasks')
                    .select(`
                        id, title, description, is_boss_task, xp_reward, status,
                        goal:goals(title, area:life_areas(slug))
                    `)
                    .eq('clerk_user_id', user.id)
                    .eq('scheduled_date', today)
                    .order('is_boss_task', { ascending: false }),
                supabaseClient
                    .from('life_areas')
                    .select('slug, name, has_primary_goal, progress')
                    .eq('clerk_user_id', user.id)
            ])

            if (profileData) {
                // Check onboarding
                if (!profileData.onboarding_completed) {
                    router.push('/onboarding')
                    return
                }
                setProfile(profileData)
            }

            if (tasksData) {
                setTodayTasks(tasksData as Task[])
            }

            if (areasData) {
                setAreas(areasData as AreaStatus[])
            }

            // Generate NUR message based on context
            generateNurMessage(profileData, tasksData || [], areasData || [])

        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const generateNurMessage = (
        profile: Profile | null,
        tasks: Task[],
        areas: AreaStatus[]
    ) => {
        const pendingTasks = tasks.filter(t => t.status === 'pending')
        const completedTasks = tasks.filter(t => t.status === 'completed')
        const bossTask = tasks.find(t => t.is_boss_task)
        const areasWithGoal = areas.filter(a => a.has_primary_goal).length

        let message = ''

        // Morning/evening context
        const hour = new Date().getHours()
        if (hour < 12) {
            message = 'Buongiorno. '
        } else if (hour < 18) {
            message = ''
        } else {
            message = 'Sera. '
        }

        // Tasks context
        if (pendingTasks.length === 0 && completedTasks.length > 0) {
            message += 'Tutto fatto per oggi. Rispetto.'
        } else if (pendingTasks.length > 0) {
            message += `Hai ${pendingTasks.length} task da fare. `
            if (bossTask && bossTask.status === 'pending') {
                message += 'Il Boss Task ti aspetta.'
            }
        } else {
            message += 'Nessun task per oggi. Vuoi aggiungerne?'
        }

        // Streak context
        if (profile?.streak_days && profile.streak_days >= 7) {
            message += ` Streak al giorno ${profile.streak_days}. Non mollarla.`
        }

        // Lives warning
        if (profile?.lives && profile.lives < 3) {
            message += ` ⚠️ Hai solo ${profile.lives} ${profile.lives === 1 ? 'vita' : 'vite'}.`
        }

        // Mission 10/10
        if (areasWithGoal < 10 && areasWithGoal > 0) {
            message += ` Missione 10/10: ${areasWithGoal}/10 aree attive.`
        }

        setNurMessage(message)
    }

    const completeTask = async (taskId: string, isBossTask: boolean) => {
        try {
            const response = await fetch('/api/tasks/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId })
            })

            if (response.ok) {
                // Reload data
                loadData()
            }
        } catch (error) {
            console.error('Error completing task:', error)
        }
    }

    // Loading state
    if (!isLoaded || loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Caricamento...</p>
                </div>
            </div>
        )
    }

    if (!profile) {
        return null
    }

    const levelInfo = getLevelInfo(profile.xp)
    const bossTask = todayTasks.find(t => t.is_boss_task)
    const regularTasks = todayTasks.filter(t => !t.is_boss_task)
    const pendingCount = todayTasks.filter(t => t.status === 'pending').length
    const areasWithGoal = areas.filter(a => a.has_primary_goal).length

    return (
        <div className={styles.container}>
            <div className="bg-gradient" />

            {/* HEADER */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.logo}>💜</span>
                    <span className={styles.logoText}>NUR: LIFE</span>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.levelBadge}>
                        <span className={styles.levelNum}>Lv.{levelInfo.level}</span>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className={styles.main}>

                {/* NUR MESSAGE */}
                <section className={styles.nurCard}>
                    <div className={styles.nurHeader}>
                        <span className={styles.nurEmoji}>💋</span>
                        <span className={styles.nurLabel}>NUR</span>
                    </div>
                    <p className={styles.nurMessage}>{nurMessage}</p>
                </section>

                {/* BOSS TASK */}
                {bossTask && (
                    <section className={styles.bossSection}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>👹</span>
                            <span className={styles.sectionTitle}>BOSS TASK DI OGGI</span>
                        </div>
                        <div className={`${styles.bossCard} ${bossTask.status === 'completed' ? styles.completed : ''}`}>
                            <div className={styles.bossInfo}>
                                <h3 className={styles.bossTitle}>{bossTask.title}</h3>
                                {bossTask.description && (
                                    <p className={styles.bossDesc}>{bossTask.description}</p>
                                )}
                                <span className={styles.bossXp}>+{bossTask.xp_reward} XP</span>
                            </div>
                            {bossTask.status === 'pending' ? (
                                <button
                                    className={styles.completeBtn}
                                    onClick={() => completeTask(bossTask.id, true)}
                                >
                                    Completa ✓
                                </button>
                            ) : (
                                <span className={styles.completedBadge}>✓ Fatto</span>
                            )}
                        </div>
                    </section>
                )}

                {/* TASKS */}
                <section className={styles.tasksSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>📋</span>
                        <span className={styles.sectionTitle}>
                            TASK DI OGGI {pendingCount > 0 && `(${pendingCount} rimanenti)`}
                        </span>
                    </div>

                    {regularTasks.length > 0 ? (
                        <div className={styles.tasksList}>
                            {regularTasks.map(task => (
                                <div
                                    key={task.id}
                                    className={`${styles.taskItem} ${task.status === 'completed' ? styles.completed : ''}`}
                                >
                                    <button
                                        className={styles.taskCheck}
                                        onClick={() => task.status === 'pending' && completeTask(task.id, false)}
                                        disabled={task.status === 'completed'}
                                    >
                                        {task.status === 'completed' ? '✓' : '○'}
                                    </button>
                                    <div className={styles.taskInfo}>
                                        <span className={styles.taskTitle}>{task.title}</span>
                                        {task.goal?.area && (
                                            <span className={styles.taskArea}>
                                                {AREA_INFO[task.goal.area.slug]?.icon} {task.goal.title}
                                            </span>
                                        )}
                                    </div>
                                    <span className={styles.taskXp}>+{task.xp_reward} XP</span>
                                </div>
                            ))}
                        </div>
                    ) : !bossTask ? (
                        <div className={styles.emptyTasks}>
                            <p>Nessun task per oggi.</p>
                            <Link href="/chat" className={styles.addTaskBtn}>
                                Chiedi a NUR di crearne uno
                            </Link>
                        </div>
                    ) : null}
                </section>

                {/* MISSIONE 10/10 */}
                <section className={styles.missionSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>🎯</span>
                        <span className={styles.sectionTitle}>MISSIONE 10/10</span>
                    </div>
                    <div className={styles.missionCard}>
                        <div className={styles.missionProgress}>
                            <div className={styles.missionBar}>
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`${styles.missionBlock} ${i < areasWithGoal ? styles.filled : ''}`}
                                    />
                                ))}
                            </div>
                            <span className={styles.missionCount}>{areasWithGoal}/10 aree con goal primario</span>
                        </div>
                        <Link href="/goals" className={styles.missionLink}>
                            Gestisci aree →
                        </Link>
                    </div>
                </section>

                {/* QUICK STATS */}
                <section className={styles.statsSection}>
                    <div className={styles.statCard}>
                        <span className={styles.statIcon}>⚡</span>
                        <span className={styles.statValue}>{profile.xp}</span>
                        <span className={styles.statLabel}>XP</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statIcon}>🔥</span>
                        <span className={styles.statValue}>{profile.streak_days}</span>
                        <span className={styles.statLabel}>Streak</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statIcon}>❤️</span>
                        <span className={styles.statValue}>{profile.lives}/3</span>
                        <span className={styles.statLabel}>Vite</span>
                    </div>
                </section>

            </main>

            {/* BOTTOM NAV */}
            <nav className={styles.bottomNav}>
                <Link href="/la-mia-vita" className={`${styles.navItem} ${styles.active}`}>
                    <span className={styles.navIcon}>🏠</span>
                    <span className={styles.navLabel}>Home</span>
                </Link>
                <Link href="/routine" className={styles.navItem}>
                    <span className={styles.navIcon}>📅</span>
                    <span className={styles.navLabel}>Routine</span>
                </Link>
                <Link href="/goals" className={styles.navItem}>
                    <span className={styles.navIcon}>🎯</span>
                    <span className={styles.navLabel}>Goals</span>
                </Link>
                <Link href="/chat" className={styles.navItem}>
                    <span className={styles.navIcon}>💬</span>
                    <span className={styles.navLabel}>Chat</span>
                </Link>
                <Link href="/profile" className={styles.navItem}>
                    <span className={styles.navIcon}>👤</span>
                    <span className={styles.navLabel}>Profilo</span>
                </Link>
            </nav>
        </div>
    )
}
