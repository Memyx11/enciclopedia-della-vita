'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase/client'
import './profilo.css'

interface Profile {
    id: string
    display_name: string
    level: number
    total_xp: number
    current_streak: number
    longest_streak: number
    title: string
}

interface Achievement {
    id: string
    name: string
    description: string
    icon: string
    unlocked_at: string
}

export default function ProfiloPage() {
    const { user, isLoaded } = useUser()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [achievements, setAchievements] = useState<Achievement[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isLoaded || !user) {
            setLoading(false)
            return
        }

        const loadData = async () => {
            try {
                // Load profile
                const { data: profileData } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .single()

                if (profileData) {
                    setProfile(profileData)
                }

                // Load achievements
                const { data: achievementsData } = await supabaseClient
                    .from('user_achievements')
                    .select(`
                        id,
                        unlocked_at,
                        achievement_definitions(name, description, icon)
                    `)
                    .eq('clerk_user_id', user.id)
                    .order('unlocked_at', { ascending: false })

                if (achievementsData) {
                    const formattedAchievements = achievementsData.map((a: any) => ({
                        id: a.id,
                        name: a.achievement_definitions?.name || 'Achievement',
                        description: a.achievement_definitions?.description || '',
                        icon: a.achievement_definitions?.icon || '🏆',
                        unlocked_at: a.unlocked_at
                    }))
                    setAchievements(formattedAchievements)
                }
            } catch (error) {
                console.error('Error loading profile:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [isLoaded, user])

    if (!isLoaded) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Caricamento...</p>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="auth-required">
                <h2>Accedi per vedere il tuo profilo</h2>
                <Link href="/sign-in" className="btn-primary">Accedi</Link>
            </div>
        )
    }

    const xpForNextLevel = profile ? (profile.level + 1) * 1000 : 1000
    const xpProgress = profile ? ((profile.total_xp % 1000) / 1000) * 100 : 0

    return (
        <>
            <div className="bg-gradient"></div>

            <header>
                <div className="header-content">
                    <Link href="/" className="logo">NUR</Link>
                    <Link href="/la-mia-vita" className="back-link">← Torna indietro</Link>
                </div>
            </header>

            <main className="profilo-container">
                <div className="profilo-header">
                    <div className="user-avatar">
                        {user.imageUrl ? (
                            <img src={user.imageUrl} alt={user.firstName || 'Avatar'} />
                        ) : (
                            <div className="avatar-placeholder">
                                {(user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || '?').toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="user-info">
                        <h1>{profile?.display_name || user.firstName || 'Utente'}</h1>
                        <p className="user-email">{user.emailAddresses[0]?.emailAddress}</p>
                        {profile && (
                            <p className="user-title">{profile.title}</p>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        {profile && (
                            <div className="profilo-stats">
                                <div className="stat-card">
                                    <div className="stat-icon">⚡</div>
                                    <div className="stat-value">{profile.level}</div>
                                    <div className="stat-label">Livello</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">✨</div>
                                    <div className="stat-value">{profile.total_xp.toLocaleString()}</div>
                                    <div className="stat-label">XP Totali</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">🔥</div>
                                    <div className="stat-value">{profile.current_streak}</div>
                                    <div className="stat-label">Streak</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">🏆</div>
                                    <div className="stat-value">{profile.longest_streak}</div>
                                    <div className="stat-label">Record</div>
                                </div>
                            </div>
                        )}

                        {/* XP Progress */}
                        {profile && (
                            <div className="xp-progress-section">
                                <div className="xp-header">
                                    <span>Progresso al prossimo livello</span>
                                    <span>{profile.total_xp % 1000} / 1000 XP</span>
                                </div>
                                <div className="xp-bar">
                                    <div className="xp-fill" style={{ width: `${xpProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Achievements */}
                        <div className="achievements-section">
                            <h2>🏆 Achievements ({achievements.length})</h2>
                            {achievements.length === 0 ? (
                                <div className="empty-achievements">
                                    <p>Nessun achievement sbloccato ancora.</p>
                                    <p>Continua a giocare per sbloccarli!</p>
                                </div>
                            ) : (
                                <div className="achievements-grid">
                                    {achievements.map(achievement => (
                                        <div key={achievement.id} className="achievement-card">
                                            <div className="achievement-icon">{achievement.icon}</div>
                                            <div className="achievement-info">
                                                <div className="achievement-name">{achievement.name}</div>
                                                <div className="achievement-desc">{achievement.description}</div>
                                                <div className="achievement-date">
                                                    {new Date(achievement.unlocked_at).toLocaleDateString('it-IT')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            <Link href="/chat" className="chat-button" title="Chatta con NUR">
                💬
            </Link>

            <footer>
                <p>NUR - Il tuo coach personale</p>
            </footer>
        </>
    )
}
