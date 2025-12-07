'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MoodEntry {
    mood_score: number
    energy_level: number | null
    emotions: string[]
    created_at: string
}

export default function MoodChart({ userId }: { userId: string }) {
    const [moods, setMoods] = useState<MoodEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<7 | 14 | 30>(7)

    useEffect(() => {
        fetchMoods()
    }, [userId, period])

    const fetchMoods = async () => {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - period)

        const { data } = await supabase
            .from('mood_logs')
            .select('mood_score, energy_level, emotions, created_at')
            .eq('clerk_user_id', userId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true })

        setMoods(data || [])
        setLoading(false)
    }

    const getAverageMood = () => {
        if (moods.length === 0) return null
        return (moods.reduce((sum, m) => sum + m.mood_score, 0) / moods.length).toFixed(1)
    }

    const getTopEmotions = () => {
        const counts: Record<string, number> = {}
        moods.forEach(m => {
            (m.emotions || []).forEach(e => {
                counts[e] = (counts[e] || 0) + 1
            })
        })
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([emotion]) => emotion)
    }

    const getTrend = () => {
        if (moods.length < 2) return 'stable'
        const half = Math.ceil(moods.length / 2)
        const recent = moods.slice(-half)
        const older = moods.slice(0, half)
        const recentAvg = recent.reduce((s, m) => s + m.mood_score, 0) / recent.length
        const olderAvg = older.reduce((s, m) => s + m.mood_score, 0) / older.length
        if (recentAvg > olderAvg + 0.5) return 'up'
        if (recentAvg < olderAvg - 0.5) return 'down'
        return 'stable'
    }

    const getMoodColor = (score: number) => {
        if (score >= 8) return '#22c55e'
        if (score >= 6) return '#84cc16'
        if (score >= 4) return '#eab308'
        if (score >= 2) return '#f97316'
        return '#ef4444'
    }

    const getMoodEmoji = (score: number) => {
        if (score >= 8) return '😄'
        if (score >= 6) return '🙂'
        if (score >= 4) return '😐'
        if (score >= 2) return '😔'
        return '😢'
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    }

    if (loading) {
        return <div className="mood-loading">Caricamento mood...</div>
    }

    const avgMood = getAverageMood()
    const trend = getTrend()
    const topEmotions = getTopEmotions()

    return (
        <div className="mood-container">
            <div className="mood-header">
                <h3>😊 Andamento Umore</h3>
                <div className="period-selector">
                    {[7, 14, 30].map(p => (
                        <button
                            key={p}
                            className={`period-btn ${period === p ? 'active' : ''}`}
                            onClick={() => setPeriod(p as 7 | 14 | 30)}
                        >
                            {p}g
                        </button>
                    ))}
                </div>
            </div>

            {moods.length === 0 ? (
                <div className="mood-empty">
                    <p>Nessun dato sul mood ancora.</p>
                    <p className="mood-hint">NUR registrerà il tuo umore durante le conversazioni!</p>
                </div>
            ) : (
                <>
                    <div className="mood-stats">
                        <div className="mood-stat">
                            <div className="stat-value" style={{ color: avgMood ? getMoodColor(parseFloat(avgMood)) : undefined }}>
                                {avgMood ? getMoodEmoji(parseFloat(avgMood)) : '-'} {avgMood || '-'}
                            </div>
                            <div className="stat-label">Media</div>
                        </div>
                        <div className="mood-stat">
                            <div className="stat-value">
                                {trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}
                            </div>
                            <div className="stat-label">Trend</div>
                        </div>
                        <div className="mood-stat">
                            <div className="stat-value">{moods.length}</div>
                            <div className="stat-label">Rilevazioni</div>
                        </div>
                    </div>

                    <div className="mood-chart">
                        {moods.map((mood, i) => (
                            <div key={i} className="mood-bar-container">
                                <div
                                    className="mood-bar"
                                    style={{
                                        height: `${mood.mood_score * 10}%`,
                                        backgroundColor: getMoodColor(mood.mood_score)
                                    }}
                                    title={`${mood.mood_score}/10 - ${formatDate(mood.created_at)}`}
                                />
                                <div className="mood-date">{formatDate(mood.created_at)}</div>
                            </div>
                        ))}
                    </div>

                    {topEmotions.length > 0 && (
                        <div className="emotions-section">
                            <div className="emotions-label">Emozioni frequenti:</div>
                            <div className="emotions-list">
                                {topEmotions.map(emotion => (
                                    <span key={emotion} className="emotion-tag">{emotion}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style jsx>{`
                .mood-container {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .mood-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .mood-header h3 {
                    margin: 0;
                    font-size: 18px;
                    color: var(--text-primary, #fff);
                }

                .period-selector {
                    display: flex;
                    gap: 4px;
                }

                .period-btn {
                    padding: 6px 12px;
                    border: none;
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-muted, #888);
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }

                .period-btn.active {
                    background: rgba(132, 94, 247, 0.2);
                    color: #845ef7;
                }

                .mood-stats {
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 20px;
                }

                .mood-stat {
                    text-align: center;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--text-primary, #fff);
                }

                .stat-label {
                    font-size: 12px;
                    color: var(--text-muted, #888);
                    margin-top: 4px;
                }

                .mood-chart {
                    display: flex;
                    align-items: flex-end;
                    gap: 4px;
                    height: 120px;
                    padding: 10px 0;
                    overflow-x: auto;
                }

                .mood-bar-container {
                    flex: 1;
                    min-width: 24px;
                    max-width: 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    height: 100%;
                }

                .mood-bar {
                    width: 100%;
                    border-radius: 4px 4px 0 0;
                    transition: height 0.3s ease;
                    min-height: 4px;
                }

                .mood-date {
                    font-size: 9px;
                    color: var(--text-muted, #888);
                    margin-top: 4px;
                    white-space: nowrap;
                }

                .emotions-section {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .emotions-label {
                    font-size: 12px;
                    color: var(--text-muted, #888);
                    margin-bottom: 8px;
                }

                .emotions-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .emotion-tag {
                    padding: 4px 10px;
                    background: rgba(132, 94, 247, 0.15);
                    color: #a78bfa;
                    border-radius: 12px;
                    font-size: 12px;
                }

                .mood-empty {
                    text-align: center;
                    padding: 30px;
                    color: var(--text-muted, #888);
                }

                .mood-hint {
                    font-size: 13px;
                    margin-top: 8px;
                    opacity: 0.7;
                }

                .mood-loading {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-muted, #888);
                }
            `}</style>
        </div>
    )
}
