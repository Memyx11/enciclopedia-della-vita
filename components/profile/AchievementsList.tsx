'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Achievement {
    id: string
    name: string
    description: string
    emoji: string
    points: number
    rarity: string
    unlocked?: boolean
    awarded_at?: string
}

export default function AchievementsList({ userId }: { userId: string }) {
    const [achievements, setAchievements] = useState<Achievement[]>([])
    const [totalPoints, setTotalPoints] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAchievements()
    }, [userId])

    const fetchAchievements = async () => {
        // Ottieni tutte le definizioni
        const { data: allDefs } = await supabase
            .from('achievement_definitions')
            .select('*')
            .order('points', { ascending: true })

        // Ottieni quelli sbloccati dall'utente
        const { data: userAchievements } = await supabase
            .from('user_achievements')
            .select('achievement_id, awarded_at')
            .eq('clerk_user_id', userId)

        const unlockedIds = new Set((userAchievements || []).map(a => a.achievement_id))
        const unlockedMap = new Map((userAchievements || []).map(a => [a.achievement_id, a.awarded_at]))

        const merged = (allDefs || []).map(def => ({
            ...def,
            unlocked: unlockedIds.has(def.id),
            awarded_at: unlockedMap.get(def.id)
        }))

        // Ordina: prima sbloccati, poi per punti
        merged.sort((a, b) => {
            if (a.unlocked && !b.unlocked) return -1
            if (!a.unlocked && b.unlocked) return 1
            return a.points - b.points
        })

        setAchievements(merged)
        setTotalPoints(merged.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0))
        setLoading(false)
    }

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'comune': return '#9ca3af'
            case 'raro': return '#3b82f6'
            case 'epico': return '#a855f7'
            case 'leggendario': return '#f59e0b'
            default: return '#9ca3af'
        }
    }

    if (loading) {
        return <div className="achievements-loading">Caricamento achievements...</div>
    }

    const unlockedCount = achievements.filter(a => a.unlocked).length

    return (
        <div className="achievements-container">
            <div className="achievements-header">
                <h3>🏆 Achievement</h3>
                <div className="achievements-stats">
                    <span className="unlocked-count">{unlockedCount}/{achievements.length}</span>
                    <span className="total-points">{totalPoints} punti</span>
                </div>
            </div>

            <div className="achievements-grid">
                {achievements.map(achievement => (
                    <div
                        key={achievement.id}
                        className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                        style={{ borderColor: achievement.unlocked ? getRarityColor(achievement.rarity) : undefined }}
                    >
                        <div className="achievement-emoji">
                            {achievement.unlocked ? achievement.emoji : '🔒'}
                        </div>
                        <div className="achievement-info">
                            <div className="achievement-name">{achievement.name}</div>
                            <div className="achievement-description">{achievement.description}</div>
                            <div className="achievement-meta">
                                <span
                                    className="achievement-rarity"
                                    style={{ color: getRarityColor(achievement.rarity) }}
                                >
                                    {achievement.rarity}
                                </span>
                                <span className="achievement-points">{achievement.points} pt</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .achievements-container {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .achievements-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .achievements-header h3 {
                    margin: 0;
                    font-size: 18px;
                    color: var(--text-primary, #fff);
                }

                .achievements-stats {
                    display: flex;
                    gap: 12px;
                }

                .unlocked-count {
                    background: rgba(132, 94, 247, 0.2);
                    color: #845ef7;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                }

                .total-points {
                    background: rgba(245, 158, 11, 0.2);
                    color: #f59e0b;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                }

                .achievements-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 12px;
                }

                .achievement-card {
                    display: flex;
                    gap: 12px;
                    padding: 14px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    transition: all 0.2s ease;
                }

                .achievement-card.unlocked {
                    background: rgba(132, 94, 247, 0.08);
                    border-width: 2px;
                }

                .achievement-card.locked {
                    opacity: 0.5;
                }

                .achievement-emoji {
                    font-size: 32px;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    flex-shrink: 0;
                }

                .achievement-info {
                    flex: 1;
                    min-width: 0;
                }

                .achievement-name {
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                    font-size: 14px;
                    margin-bottom: 4px;
                }

                .achievement-description {
                    color: var(--text-muted, #888);
                    font-size: 12px;
                    line-height: 1.4;
                    margin-bottom: 6px;
                }

                .achievement-meta {
                    display: flex;
                    gap: 10px;
                    font-size: 11px;
                    text-transform: capitalize;
                }

                .achievement-points {
                    color: var(--text-muted, #888);
                }

                .achievements-loading {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-muted, #888);
                }

                @media (max-width: 600px) {
                    .achievements-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
