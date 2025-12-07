'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Habit {
    id: string
    name: string
    area_related: string | null
    frequency: 'daily' | 'weekly'
    streak_current: number
    streak_best: number
    total_completions: number
    is_active: boolean
    created_at: string
}

export default function HabitsList({ userId }: { userId: string }) {
    const [habits, setHabits] = useState<Habit[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchHabits()
    }, [userId])

    const fetchHabits = async () => {
        const { data } = await supabase
            .from('habits')
            .select('*')
            .eq('clerk_user_id', userId)
            .eq('is_active', true)
            .order('streak_current', { ascending: false })

        setHabits(data || [])
        setLoading(false)
    }

    const getAreaEmoji = (area: string | null) => {
        const areaEmojis: Record<string, string> = {
            salute: '💪',
            soldi: '💰',
            relazioni: '❤️',
            lavoro: '💼',
            hobby: '🎨',
            crescita: '📚',
            casa: '🏠',
            sociale: '👥',
            spirituale: '🧘',
            futuro: '🎯'
        }
        return area ? areaEmojis[area] || '✨' : '✨'
    }

    const getStreakColor = (streak: number) => {
        if (streak >= 30) return '#f59e0b'
        if (streak >= 14) return '#a855f7'
        if (streak >= 7) return '#3b82f6'
        if (streak >= 3) return '#22c55e'
        return '#9ca3af'
    }

    const getStreakLabel = (streak: number) => {
        if (streak >= 30) return '🔥 Leggendario!'
        if (streak >= 14) return '⚡ Impressionante!'
        if (streak >= 7) return '💪 Grande!'
        if (streak >= 3) return '👍 Bravo!'
        return ''
    }

    if (loading) {
        return <div className="habits-loading">Caricamento abitudini...</div>
    }

    const totalCompletions = habits.reduce((sum, h) => sum + h.total_completions, 0)
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak_best), 0)

    return (
        <div className="habits-container">
            <div className="habits-header">
                <h3>📅 Abitudini</h3>
                {habits.length > 0 && (
                    <div className="habits-stats">
                        <span className="stat">{totalCompletions} completamenti</span>
                        <span className="stat best">🏆 Record: {bestStreak}g</span>
                    </div>
                )}
            </div>

            {habits.length === 0 ? (
                <div className="habits-empty">
                    <p>Nessuna abitudine ancora.</p>
                    <p className="habits-hint">Chiedi a NUR di creare un'abitudine per te!</p>
                    <p className="habits-example">Es: "Voglio meditare ogni giorno"</p>
                </div>
            ) : (
                <div className="habits-list">
                    {habits.map(habit => (
                        <div key={habit.id} className="habit-card">
                            <div className="habit-emoji">{getAreaEmoji(habit.area_related)}</div>
                            <div className="habit-info">
                                <div className="habit-name">{habit.name}</div>
                                <div className="habit-meta">
                                    <span className="habit-frequency">
                                        {habit.frequency === 'daily' ? 'Giornaliera' : 'Settimanale'}
                                    </span>
                                    <span className="habit-total">{habit.total_completions}x</span>
                                </div>
                            </div>
                            <div className="habit-streak">
                                <div
                                    className="streak-number"
                                    style={{ color: getStreakColor(habit.streak_current) }}
                                >
                                    {habit.streak_current}
                                </div>
                                <div className="streak-label">giorni</div>
                                {getStreakLabel(habit.streak_current) && (
                                    <div className="streak-badge">{getStreakLabel(habit.streak_current)}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .habits-container {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .habits-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .habits-header h3 {
                    margin: 0;
                    font-size: 18px;
                    color: var(--text-primary, #fff);
                }

                .habits-stats {
                    display: flex;
                    gap: 12px;
                }

                .stat {
                    font-size: 12px;
                    color: var(--text-muted, #888);
                }

                .stat.best {
                    color: #f59e0b;
                }

                .habits-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .habit-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                }

                .habit-emoji {
                    font-size: 28px;
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    flex-shrink: 0;
                }

                .habit-info {
                    flex: 1;
                    min-width: 0;
                }

                .habit-name {
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                    font-size: 14px;
                    margin-bottom: 4px;
                }

                .habit-meta {
                    display: flex;
                    gap: 10px;
                    font-size: 12px;
                    color: var(--text-muted, #888);
                }

                .habit-streak {
                    text-align: center;
                    flex-shrink: 0;
                }

                .streak-number {
                    font-size: 28px;
                    font-weight: 700;
                    line-height: 1;
                }

                .streak-label {
                    font-size: 10px;
                    color: var(--text-muted, #888);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .streak-badge {
                    font-size: 10px;
                    margin-top: 4px;
                }

                .habits-empty {
                    text-align: center;
                    padding: 30px;
                    color: var(--text-muted, #888);
                }

                .habits-hint {
                    font-size: 13px;
                    margin-top: 8px;
                    opacity: 0.7;
                }

                .habits-example {
                    font-size: 12px;
                    margin-top: 4px;
                    font-style: italic;
                    opacity: 0.5;
                }

                .habits-loading {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-muted, #888);
                }
            `}</style>
        </div>
    )
}
