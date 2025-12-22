'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'
import { getLevelInfo, getTitleForLevel } from '@/lib/supabase/types'
import styles from './profile.module.css'

// ============================================
// TYPES
// ============================================

interface ProfileData {
    full_name: string | null
    xp: number
    level: number
    title: string
    streak_days: number
    lives: number
}

interface Stats {
    totalXp: number
    goalsCompleted: number
    tasksCompleted: number
    streakRecord: number
    daysActive: number
}

interface Achievement {
    id: string
    slug: string
    name: string
    description: string | null
    icon: string | null
    unlocked_at: string
}

// ============================================
// COMPONENT
// ============================================

export default function ProfilePage() {
    const router = useRouter()
    const { user, isLoaded } = useUser()

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [stats, setStats] = useState<Stats>({
        totalXp: 0,
        goalsCompleted: 0,
        tasksCompleted: 0,
        streakRecord: 0,
        daysActive: 0
    })
    const [achievements, setAchievements] = useState<Achievement[]>([])

    useEffect(() => {
        if (!isLoaded) return
        if (!user) {
            router.push('/sign-in')
            return
        }
        loadProfileData()
    }, [isLoaded, user, router])

    const loadProfileData = async () => {
        if (!user) return

        try {
            // Load profile
            const { data: profileData } = await supabaseClient
                .from('profiles')
                .select('full_name, xp, level, title, streak_days, lives')
                .eq('clerk_user_id', user.id)
                .single()

            if (profileData) {
                setProfile(profileData)
            }

            // Load stats
            const [
                { count: goalsCount },
                { count: tasksCount },
                { data: achievementsData }
            ] = await Promise.all([
                supabaseClient
                    .from('goals')
                    .select('*', { count: 'exact', head: true })
                    .eq('clerk_user_id', user.id)
                    .eq('status', 'completed'),
                supabaseClient
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('clerk_user_id', user.id)
                    .eq('status', 'completed'),
                supabaseClient
                    .from('achievements')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .order('unlocked_at', { ascending: false })
            ])

            setStats({
                totalXp: profileData?.xp || 0,
                goalsCompleted: goalsCount || 0,
                tasksCompleted: tasksCount || 0,
                streakRecord: profileData?.streak_days || 0,
                daysActive: 0 // Would need to calculate from activity_log
            })

            if (achievementsData) {
                setAchievements(achievementsData)
            }

        } catch (error) {
            console.error('Error loading profile:', error)
        } finally {
            setLoading(false)
        }
    }

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
    const displayName = profile.full_name || user?.firstName || 'Giocatore'

    return (
        <div className={styles.container}>
            <div className="bg-gradient" />

            {/* HEADER */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/la-mia-vita" className={styles.backBtn}>←</Link>
                    <h1>PROFILO</h1>
                </div>
                <UserButton afterSignOutUrl="/" />
            </header>

            {/* MAIN CONTENT */}
            <main className={styles.main}>

                {/* AVATAR & LEVEL */}
                <section className={styles.avatarSection}>
                    <div className={styles.avatarContainer}>
                        <div className={styles.avatar}>
                            <div className={styles.avatarRing} style={{
                                background: `conic-gradient(var(--purple) ${levelInfo.progress}%, transparent ${levelInfo.progress}%)`
                            }} />
                            <div className={styles.avatarInner}>
                                <span className={styles.avatarEmoji}>💜</span>
                            </div>
                        </div>
                        <div className={styles.levelBadge}>Lv.{levelInfo.level}</div>
                    </div>
                    <div className={styles.userInfo}>
                        <span className={styles.title}>{levelInfo.title}</span>
                        <div className={styles.nameRow}>
                            <span className={styles.name}>{displayName}</span>
                            <span className={styles.streak}>🔥 {profile.streak_days}</span>
                        </div>
                    </div>
                </section>

                {/* XP PROGRESS */}
                <section className={styles.xpSection}>
                    <div className={styles.xpHeader}>
                        <span>XP</span>
                        <span className={styles.xpValues}>
                            {profile.xp.toLocaleString()} / {levelInfo.xpForNextLevel.toLocaleString()}
                        </span>
                    </div>
                    <div className={styles.xpBar}>
                        <div
                            className={styles.xpFill}
                            style={{ width: `${levelInfo.progress}%` }}
                        />
                    </div>
                    <span className={styles.xpPercent}>{levelInfo.progress}%</span>
                </section>

                {/* STATS */}
                <section className={styles.statsSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>📊</span>
                        <span className={styles.sectionTitle}>STATISTICHE</span>
                    </div>
                    <div className={styles.statsList}>
                        <div className={styles.statItem}>
                            <span className={styles.statIcon}>⚡</span>
                            <span className={styles.statLabel}>XP Totali</span>
                            <span className={styles.statValue}>{stats.totalXp.toLocaleString()}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statIcon}>🎯</span>
                            <span className={styles.statLabel}>Goal Completati</span>
                            <span className={styles.statValue}>{stats.goalsCompleted}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statIcon}>✅</span>
                            <span className={styles.statLabel}>Task Completati</span>
                            <span className={styles.statValue}>{stats.tasksCompleted}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statIcon}>🔥</span>
                            <span className={styles.statLabel}>Streak Record</span>
                            <span className={styles.statValue}>{stats.streakRecord}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statIcon}>❤️</span>
                            <span className={styles.statLabel}>Vite Attuali</span>
                            <span className={styles.statValue}>{profile.lives}/3</span>
                        </div>
                    </div>
                </section>

                {/* ACHIEVEMENTS */}
                <section className={styles.achievementsSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>🏆</span>
                        <span className={styles.sectionTitle}>ACHIEVEMENT ({achievements.length})</span>
                    </div>
                    {achievements.length > 0 ? (
                        <div className={styles.achievementsList}>
                            {achievements.map(achievement => (
                                <div key={achievement.id} className={styles.achievementCard}>
                                    <span className={styles.achievementIcon}>
                                        {achievement.icon || '🌟'}
                                    </span>
                                    <span className={styles.achievementName}>
                                        {achievement.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyAchievements}>
                            <p>Nessun achievement sbloccato ancora.</p>
                            <p>Continua a giocare per sbloccarli!</p>
                        </div>
                    )}
                </section>

            </main>

            {/* BOTTOM NAV */}
            <nav className={styles.bottomNav}>
                <Link href="/la-mia-vita" className={styles.navItem}>
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
                <Link href="/profile" className={`${styles.navItem} ${styles.active}`}>
                    <span className={styles.navIcon}>👤</span>
                    <span className={styles.navLabel}>Profilo</span>
                </Link>
            </nav>
        </div>
    )
}
