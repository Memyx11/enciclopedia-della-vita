'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Mission {
    id: string
    title: string
    description: string
    why: string
    start_value: number | null
    target_value: number | null
    current_value: number | null
    unit: string | null
    start_date: string
    target_date: string | null
    status: string
}

export default function MissionHero() {
    const { user } = useUser()
    const [mission, setMission] = useState<Mission | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const fetchMission = async () => {
            const { data, error } = await supabase
                .from('user_mission')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('status', 'active')
                .maybeSingle()

            if (!error && data) {
                setMission(data)
            }
            setLoading(false)
        }

        fetchMission()
    }, [user])

    if (loading) {
        return (
            <div className="mission-hero mission-hero--loading">
                <div className="loading-pulse"></div>
            </div>
        )
    }

    if (!mission) {
        return (
            <div className="mission-hero mission-hero--empty">
                <div className="mission-hero__icon">🎯</div>
                <h2>Qual è la tua missione?</h2>
                <p>Parla con NUR per scoprire il tuo vero obiettivo</p>
                <Link href="/chat" className="btn btn-primary">
                    💬 Parla con NUR
                </Link>
            </div>
        )
    }

    // Calcola progresso
    let progress = 0
    if (mission.start_value !== null && mission.target_value !== null && mission.current_value !== null) {
        const total = mission.target_value - mission.start_value
        const current = mission.current_value - mission.start_value
        progress = Math.round((current / total) * 100)
        progress = Math.max(0, Math.min(100, progress))
    }

    // Calcola giorni rimanenti
    let daysRemaining = null
    if (mission.target_date) {
        const target = new Date(mission.target_date)
        const today = new Date()
        const diff = target.getTime() - today.getTime()
        daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    return (
        <div className="mission-hero">
            <div className="mission-hero__header">
                <span className="mission-hero__badge">🎯 LA TUA MISSIONE</span>
            </div>

            <h2 className="mission-hero__title">{mission.title}</h2>

            {mission.description && (
                <p className="mission-hero__description">{mission.description}</p>
            )}

            {/* Progress bar con valori */}
            {mission.start_value !== null && mission.target_value !== null && (
                <div className="mission-hero__progress">
                    <div className="progress-labels">
                        <span className="progress-start">
                            {mission.unit === 'euro' ? '€' : ''}{mission.start_value?.toLocaleString()}
                            {mission.unit && mission.unit !== 'euro' ? ` ${mission.unit}` : ''}
                        </span>
                        <span className="progress-current">
                            {mission.unit === 'euro' ? '€' : ''}{mission.current_value?.toLocaleString() || mission.start_value?.toLocaleString()}
                        </span>
                        <span className="progress-target">
                            {mission.unit === 'euro' ? '€' : ''}{mission.target_value?.toLocaleString()}
                            {mission.unit && mission.unit !== 'euro' ? ` ${mission.unit}` : ''}
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-bar__fill"
                            style={{ width: `${progress}%` }}
                        >
                            <span className="progress-bar__marker">●</span>
                        </div>
                    </div>
                    <div className="progress-percentage">{progress}%</div>
                </div>
            )}

            {/* Timeline */}
            <div className="mission-hero__timeline">
                <div className="timeline-item">
                    <span className="timeline-icon">⏱️</span>
                    <span className="timeline-label">Inizio:</span>
                    <span className="timeline-value">
                        {new Date(mission.start_date).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </span>
                </div>
                {mission.target_date && (
                    <div className="timeline-item">
                        <span className="timeline-icon">🎯</span>
                        <span className="timeline-label">Target:</span>
                        <span className="timeline-value">
                            {new Date(mission.target_date).toLocaleDateString('it-IT', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                            {daysRemaining !== null && daysRemaining > 0 && (
                                <span className="days-remaining">({daysRemaining} giorni)</span>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Why */}
            {mission.why && (
                <div className="mission-hero__why">
                    <span className="why-icon">💡</span>
                    <span className="why-text">{mission.why}</span>
                </div>
            )}

            <style jsx>{`
                .mission-hero {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
                    border: 1px solid rgba(102, 126, 234, 0.3);
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 20px;
                }

                .mission-hero--empty {
                    text-align: center;
                    padding: 40px 24px;
                }

                .mission-hero--empty .mission-hero__icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }

                .mission-hero--empty h2 {
                    color: #fff;
                    font-size: 20px;
                    margin-bottom: 8px;
                }

                .mission-hero--empty p {
                    color: rgba(255,255,255,0.6);
                    margin-bottom: 20px;
                }

                .mission-hero__header {
                    margin-bottom: 12px;
                }

                .mission-hero__badge {
                    font-size: 12px;
                    font-weight: 600;
                    color: #667eea;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .mission-hero__title {
                    font-size: 24px;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 8px;
                }

                .mission-hero__description {
                    color: rgba(255,255,255,0.7);
                    font-size: 14px;
                    margin-bottom: 20px;
                }

                .mission-hero__progress {
                    margin: 20px 0;
                }

                .progress-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: rgba(255,255,255,0.6);
                    margin-bottom: 8px;
                }

                .progress-current {
                    color: #667eea;
                    font-weight: 600;
                }

                .progress-bar {
                    height: 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    overflow: visible;
                    position: relative;
                }

                .progress-bar__fill {
                    height: 100%;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    border-radius: 4px;
                    position: relative;
                    transition: width 0.5s ease;
                }

                .progress-bar__marker {
                    position: absolute;
                    right: -4px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #fff;
                    font-size: 12px;
                    text-shadow: 0 0 8px rgba(102, 126, 234, 0.8);
                }

                .progress-percentage {
                    text-align: center;
                    font-size: 24px;
                    font-weight: 700;
                    color: #667eea;
                    margin-top: 8px;
                }

                .mission-hero__timeline {
                    display: flex;
                    gap: 24px;
                    margin-top: 16px;
                    flex-wrap: wrap;
                }

                .timeline-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                }

                .timeline-icon {
                    font-size: 14px;
                }

                .timeline-label {
                    color: rgba(255,255,255,0.5);
                }

                .timeline-value {
                    color: rgba(255,255,255,0.9);
                }

                .days-remaining {
                    color: rgba(255,255,255,0.5);
                    margin-left: 4px;
                }

                .mission-hero__why {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    margin-top: 16px;
                    padding: 12px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                }

                .why-icon {
                    font-size: 16px;
                }

                .why-text {
                    font-size: 13px;
                    color: rgba(255,255,255,0.7);
                    font-style: italic;
                }

                .btn {
                    display: inline-block;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: #fff;
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
                }

                .loading-pulse {
                    height: 200px;
                    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                    background-size: 200% 100%;
                    animation: pulse 1.5s infinite;
                    border-radius: 12px;
                }

                @keyframes pulse {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    )
}
