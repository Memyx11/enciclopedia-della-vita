'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

interface Objective {
    id: string
    mission_id: string | null
    parent_id: string | null
    level: 'major' | 'sub' | 'task' | 'micro'
    title: string
    description: string | null
    related_areas: string[] | null
    target_value: number | null
    current_value: number | null
    unit: string | null
    sort_order: number
    status: 'pending' | 'active' | 'completed' | 'skipped'
    progress: number
    due_date: string | null
    completed_at: string | null
}

interface ObjectiveTreeProps {
    missionId?: string
    onSelectObjective?: (objective: Objective) => void
}

const levelConfig = {
    major: { emoji: '🎯', label: 'Obiettivo Maggiore', indent: 0 },
    sub: { emoji: '📌', label: 'Sub-obiettivo', indent: 1 },
    task: { emoji: '✅', label: 'Task', indent: 2 },
    micro: { emoji: '•', label: 'Micro-task', indent: 3 }
}

const statusConfig = {
    pending: { emoji: '⏳', color: 'rgba(255,255,255,0.4)' },
    active: { emoji: '🔥', color: '#667eea' },
    completed: { emoji: '✅', color: '#51cf66' },
    skipped: { emoji: '⏭️', color: 'rgba(255,255,255,0.3)' }
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

export default function ObjectiveTree({ missionId, onSelectObjective }: ObjectiveTreeProps) {
    const { user } = useUser()
    const [objectives, setObjectives] = useState<Objective[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!user) return

        const fetchObjectives = async () => {
            let query = supabase
                .from('objectives')
                .select('*')
                .eq('clerk_user_id', user.id)
                .order('sort_order', { ascending: true })

            if (missionId) {
                query = query.eq('mission_id', missionId)
            }

            const { data, error } = await query

            if (!error && data) {
                setObjectives(data)
                // Espandi automaticamente gli obiettivi major e attivi
                const autoExpand = new Set<string>()
                data.forEach(obj => {
                    if (obj.level === 'major' || obj.status === 'active') {
                        autoExpand.add(obj.id)
                    }
                })
                setExpandedIds(autoExpand)
            }
            setLoading(false)
        }

        fetchObjectives()
    }, [user, missionId])

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const toggleStatus = async (objective: Objective) => {
        if (!user) return

        const nextStatus = objective.status === 'completed' ? 'active' : 'completed'
        const updates: Partial<Objective> = {
            status: nextStatus,
            progress: nextStatus === 'completed' ? 100 : objective.progress,
            completed_at: nextStatus === 'completed' ? new Date().toISOString() : null
        }

        try {
            await supabase
                .from('objectives')
                .update(updates)
                .eq('id', objective.id)

            setObjectives(prev =>
                prev.map(o => o.id === objective.id ? { ...o, ...updates } : o)
            )
        } catch (error) {
            console.error('Error updating objective:', error)
        }
    }

    // Costruisce l'albero gerarchico
    const buildTree = (parentId: string | null = null): Objective[] => {
        return objectives
            .filter(o => o.parent_id === parentId)
            .sort((a, b) => a.sort_order - b.sort_order)
    }

    const renderObjective = (objective: Objective, depth: number = 0) => {
        const children = buildTree(objective.id)
        const hasChildren = children.length > 0
        const isExpanded = expandedIds.has(objective.id)
        const config = levelConfig[objective.level]
        const statusCfg = statusConfig[objective.status]

        return (
            <div key={objective.id} className="objective-node">
                <div
                    className={`objective-item ${objective.status}`}
                    style={{
                        marginLeft: `${depth * 16}px`,
                        borderLeftColor: statusCfg.color
                    }}
                >
                    <div className="objective-main">
                        {hasChildren && (
                            <button
                                className="expand-btn"
                                onClick={() => toggleExpand(objective.id)}
                            >
                                {isExpanded ? '▼' : '▶'}
                            </button>
                        )}

                        <button
                            className={`status-checkbox ${objective.status}`}
                            onClick={() => toggleStatus(objective)}
                        >
                            {objective.status === 'completed' ? '✓' : ''}
                        </button>

                        <div
                            className="objective-content"
                            onClick={() => onSelectObjective?.(objective)}
                        >
                            <div className="objective-header">
                                <span className="level-emoji">{config.emoji}</span>
                                <span className={`objective-title ${objective.status === 'completed' ? 'completed' : ''}`}>
                                    {objective.title}
                                </span>
                            </div>

                            {objective.related_areas && objective.related_areas.length > 0 && (
                                <div className="objective-areas">
                                    {objective.related_areas.map(area => (
                                        <span key={area} className="area-tag">
                                            {areaEmojis[area] || '📌'} {area}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {objective.progress > 0 && objective.progress < 100 && (
                                <div className="objective-progress">
                                    <div className="progress-mini">
                                        <div
                                            className="progress-mini__fill"
                                            style={{ width: `${objective.progress}%` }}
                                        />
                                    </div>
                                    <span className="progress-text">{objective.progress}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="objective-children">
                        {children.map(child => renderObjective(child, depth + 1))}
                    </div>
                )}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="objective-tree objective-tree--loading">
                <div className="loading-pulse"></div>
                <style jsx>{styles}</style>
            </div>
        )
    }

    const rootObjectives = buildTree(null)

    if (rootObjectives.length === 0) {
        return (
            <div className="objective-tree objective-tree--empty">
                <div className="empty-icon">🎯</div>
                <p>Nessun obiettivo ancora definito</p>
                <p className="empty-hint">Parla con NUR per impostare i tuoi obiettivi</p>
                <style jsx>{styles}</style>
            </div>
        )
    }

    return (
        <div className="objective-tree">
            <div className="tree-header">
                <h3>📋 I Tuoi Obiettivi</h3>
                <div className="tree-stats">
                    <span className="stat">
                        {objectives.filter(o => o.status === 'completed').length}/{objectives.length} completati
                    </span>
                </div>
            </div>

            <div className="tree-content">
                {rootObjectives.map(obj => renderObjective(obj))}
            </div>

            <style jsx>{styles}</style>
        </div>
    )
}

const styles = `
    .objective-tree {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 20px;
    }

    .objective-tree--empty {
        text-align: center;
        padding: 40px 20px;
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
    }

    .objective-tree--empty p {
        color: rgba(255,255,255,0.6);
        margin-bottom: 4px;
    }

    .empty-hint {
        font-size: 13px;
        color: rgba(255,255,255,0.4) !important;
    }

    .tree-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .tree-header h3 {
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        margin: 0;
    }

    .tree-stats .stat {
        font-size: 13px;
        color: rgba(255,255,255,0.5);
    }

    .tree-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .objective-node {
        display: flex;
        flex-direction: column;
    }

    .objective-item {
        display: flex;
        align-items: flex-start;
        padding: 8px 12px;
        border-radius: 8px;
        border-left: 3px solid;
        background: rgba(255,255,255,0.02);
        transition: all 0.2s;
    }

    .objective-item:hover {
        background: rgba(255,255,255,0.05);
    }

    .objective-item.completed {
        opacity: 0.7;
    }

    .objective-main {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
    }

    .expand-btn {
        background: none;
        border: none;
        color: rgba(255,255,255,0.5);
        font-size: 10px;
        padding: 4px;
        cursor: pointer;
        flex-shrink: 0;
    }

    .status-checkbox {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 2px solid rgba(255,255,255,0.3);
        background: transparent;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s;
    }

    .status-checkbox.completed {
        background: #51cf66;
        border-color: #51cf66;
    }

    .status-checkbox.active {
        border-color: #667eea;
    }

    .objective-content {
        flex: 1;
        cursor: pointer;
    }

    .objective-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .level-emoji {
        font-size: 14px;
    }

    .objective-title {
        font-size: 14px;
        color: rgba(255,255,255,0.9);
    }

    .objective-title.completed {
        text-decoration: line-through;
        color: rgba(255,255,255,0.5);
    }

    .objective-areas {
        display: flex;
        gap: 6px;
        margin-top: 6px;
        flex-wrap: wrap;
    }

    .area-tag {
        font-size: 11px;
        padding: 2px 8px;
        background: rgba(255,255,255,0.08);
        border-radius: 12px;
        color: rgba(255,255,255,0.6);
    }

    .objective-progress {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 6px;
    }

    .progress-mini {
        flex: 1;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        max-width: 100px;
    }

    .progress-mini__fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 2px;
        transition: width 0.3s;
    }

    .progress-text {
        font-size: 11px;
        color: #667eea;
    }

    .objective-children {
        margin-top: 4px;
    }

    .loading-pulse {
        height: 150px;
        background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
        background-size: 200% 100%;
        animation: pulse 1.5s infinite;
        border-radius: 12px;
    }

    @keyframes pulse {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`
