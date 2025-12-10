'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Task {
    id: string
    title: string
    description: string | null
    related_areas: string[] | null
    progress: number
    status: string
    due_date: string | null
    parent_title?: string
}

const areaEmojis: Record<string, string> = {
    'salute': '💪',
    'soldi': '💰',
    'relazioni': '❤️',
    'lavoro': '💼',
    'hobby': '🎨',
    'crescita': '📚',
    'casa': '🏠',
    'sociale': '👥',
    'spirituale': '🧘',
    'futuro': '🎯'
}

export default function CurrentTask() {
    const { user } = useUser()
    const [task, setTask] = useState<Task | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const fetchCurrentTask = async () => {
            // Prende il task attivo di livello più basso (micro > task > sub)
            const { data, error } = await supabase
                .from('objectives')
                .select(`
                    id,
                    title,
                    description,
                    related_areas,
                    progress,
                    status,
                    due_date,
                    parent:parent_id (title)
                `)
                .eq('clerk_user_id', user.id)
                .eq('status', 'active')
                .in('level', ['micro', 'task'])
                .order('level', { ascending: false })
                .limit(1)
                .single()

            if (!error && data) {
                setTask({
                    ...data,
                    parent_title: (data.parent as any)?.title
                })
            }
            setLoading(false)
        }

        fetchCurrentTask()
    }, [user])

    const markAsComplete = async () => {
        if (!task || !user) return

        try {
            await supabase
                .from('objectives')
                .update({
                    status: 'completed',
                    progress: 100,
                    completed_at: new Date().toISOString()
                })
                .eq('id', task.id)

            // Aggiorna UI
            setTask(null)
        } catch (error) {
            console.error('Error completing task:', error)
        }
    }

    const updateProgress = async (newProgress: number) => {
        if (!task || !user) return

        try {
            await supabase
                .from('objectives')
                .update({ progress: newProgress })
                .eq('id', task.id)

            setTask(prev => prev ? { ...prev, progress: newProgress } : null)
        } catch (error) {
            console.error('Error updating progress:', error)
        }
    }

    if (loading) {
        return (
            <div className="current-task current-task--loading">
                <div className="loading-pulse"></div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    if (!task) {
        return (
            <div className="current-task current-task--empty">
                <div className="empty-content">
                    <span className="empty-icon">✨</span>
                    <p>Nessun task attivo</p>
                    <span className="empty-hint">Parla con NUR per il prossimo step</span>
                </div>
                <Link href="/chat" className="action-btn">
                    💬 Chiedi a NUR
                </Link>
                <style jsx>{styles}</style>
            </div>
        )
    }

    return (
        <div className="current-task">
            <div className="task-badge">
                <span className="badge-icon">🔥</span>
                <span className="badge-text">TASK ATTUALE</span>
            </div>

            {task.parent_title && (
                <div className="task-parent">
                    📌 {task.parent_title}
                </div>
            )}

            <h3 className="task-title">{task.title}</h3>

            {task.description && (
                <p className="task-description">{task.description}</p>
            )}

            {task.related_areas && task.related_areas.length > 0 && (
                <div className="task-areas">
                    {task.related_areas.map(area => (
                        <span key={area} className="area-chip">
                            {areaEmojis[area] || '📌'} {area}
                        </span>
                    ))}
                </div>
            )}

            {/* Progress Slider */}
            <div className="task-progress-section">
                <div className="progress-header">
                    <span>Progresso</span>
                    <span className="progress-value">{task.progress}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={task.progress}
                    onChange={(e) => updateProgress(parseInt(e.target.value))}
                    className="progress-slider"
                />
            </div>

            {task.due_date && (
                <div className="task-due">
                    ⏰ Scadenza: {new Date(task.due_date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short'
                    })}
                </div>
            )}

            <div className="task-actions">
                <button
                    className="complete-btn"
                    onClick={markAsComplete}
                >
                    ✅ Completato!
                </button>
                <Link href="/chat" className="help-btn">
                    💬 Ho bisogno di aiuto
                </Link>
            </div>

            <style jsx>{styles}</style>
        </div>
    )
}

const styles = `
    .current-task {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
        border: 2px solid rgba(102, 126, 234, 0.4);
        border-radius: 20px;
        padding: 24px;
        position: relative;
    }

    .current-task--empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 32px 24px;
        background: rgba(255,255,255,0.03);
        border: 1px dashed rgba(255,255,255,0.2);
    }

    .empty-content {
        margin-bottom: 16px;
    }

    .empty-icon {
        font-size: 32px;
        display: block;
        margin-bottom: 8px;
    }

    .current-task--empty p {
        color: rgba(255,255,255,0.7);
        margin: 0;
    }

    .empty-hint {
        font-size: 13px;
        color: rgba(255,255,255,0.4);
    }

    .action-btn {
        padding: 10px 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 12px;
        color: #fff;
        text-decoration: none;
        font-weight: 500;
        font-size: 14px;
    }

    .task-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        background: rgba(255, 107, 107, 0.2);
        border-radius: 20px;
        margin-bottom: 12px;
    }

    .badge-icon {
        font-size: 14px;
    }

    .badge-text {
        font-size: 11px;
        font-weight: 700;
        color: #ff6b6b;
        letter-spacing: 1px;
    }

    .task-parent {
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 8px;
    }

    .task-title {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 8px 0;
    }

    .task-description {
        font-size: 14px;
        color: rgba(255,255,255,0.7);
        margin: 0 0 12px 0;
        line-height: 1.5;
    }

    .task-areas {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 16px;
    }

    .area-chip {
        font-size: 12px;
        padding: 4px 10px;
        background: rgba(255,255,255,0.1);
        border-radius: 16px;
        color: rgba(255,255,255,0.8);
    }

    .task-progress-section {
        margin: 16px 0;
    }

    .progress-header {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: rgba(255,255,255,0.6);
        margin-bottom: 8px;
    }

    .progress-value {
        color: #667eea;
        font-weight: 600;
    }

    .progress-slider {
        width: 100%;
        height: 8px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        outline: none;
    }

    .progress-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }

    .progress-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 50%;
        cursor: pointer;
        border: none;
    }

    .task-due {
        font-size: 13px;
        color: rgba(255,255,255,0.6);
        margin-bottom: 16px;
    }

    .task-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }

    .complete-btn {
        flex: 1;
        min-width: 140px;
        padding: 14px 20px;
        background: linear-gradient(135deg, #51cf66, #40c057);
        border: none;
        border-radius: 12px;
        color: #fff;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .complete-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(81, 207, 102, 0.4);
    }

    .help-btn {
        flex: 1;
        min-width: 140px;
        padding: 14px 20px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        color: rgba(255,255,255,0.8);
        font-weight: 500;
        font-size: 14px;
        text-decoration: none;
        text-align: center;
        transition: all 0.2s;
    }

    .help-btn:hover {
        background: rgba(255,255,255,0.15);
    }

    .loading-pulse {
        height: 180px;
        background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
        background-size: 200% 100%;
        animation: pulse 1.5s infinite;
        border-radius: 16px;
    }

    @keyframes pulse {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`
