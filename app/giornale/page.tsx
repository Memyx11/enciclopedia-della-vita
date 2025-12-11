'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import './giornale.css'

// ============================================
// TYPES
// ============================================

interface TaskMaterial {
    id: string
    objective_id: string | null
    title: string
    description: string | null
    material_type: 'document' | 'link' | 'video' | 'checklist' | 'script' | 'template' | 'note'
    content: string | null
    url: string | null
    icon: string
    sort_order: number
    created_by: 'nur' | 'user'
    created_at: string
}

interface Objective {
    id: string
    mission_id: string
    parent_id: string | null
    level: 'major' | 'sub' | 'task' | 'micro'
    title: string
    description: string | null
    status: 'pending' | 'active' | 'completed' | 'skipped'
    progress: number
    difficulty: string
    xp_reward: number
}

interface Mission {
    id: string
    title: string
    description: string | null
}

// ============================================
// CONSTANTS
// ============================================

const MATERIAL_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    document: { icon: '📄', label: 'Documento', color: '#339af0' },
    link: { icon: '🔗', label: 'Link', color: '#51cf66' },
    video: { icon: '🎬', label: 'Video', color: '#ff6b6b' },
    checklist: { icon: '✅', label: 'Checklist', color: '#fab005' },
    script: { icon: '📝', label: 'Script', color: '#cc5de8' },
    template: { icon: '📋', label: 'Template', color: '#20c997' },
    note: { icon: '💭', label: 'Nota', color: '#845ef7' }
}

// ============================================
// COMPONENT
// ============================================

export default function ScrivaniaPage() {
    const { user, isLoaded } = useUser()

    // State
    const [loading, setLoading] = useState(true)
    const [mission, setMission] = useState<Mission | null>(null)
    const [activeTask, setActiveTask] = useState<Objective | null>(null)
    const [activeStep, setActiveStep] = useState<Objective | null>(null)
    const [materials, setMaterials] = useState<TaskMaterial[]>([])
    const [allMaterials, setAllMaterials] = useState<TaskMaterial[]>([])
    const [viewMode, setViewMode] = useState<'task' | 'all'>('task')
    const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null)
    const [editingMaterial, setEditingMaterial] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')

    // New material form
    const [showAddForm, setShowAddForm] = useState(false)
    const [newMaterial, setNewMaterial] = useState({
        title: '',
        content: '',
        url: '',
        material_type: 'note' as TaskMaterial['material_type']
    })

    // ============================================
    // DATA LOADING
    // ============================================

    const loadData = useCallback(async () => {
        if (!user) return

        try {
            // Load mission
            const { data: missionData } = await supabase
                .from('user_mission')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('status', 'active')
                .single()

            setMission(missionData)

            if (!missionData) {
                setLoading(false)
                return
            }

            // Load objectives
            const { data: objectives } = await supabase
                .from('objectives')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('mission_id', missionData.id)
                .order('sort_order')

            const objs = (objectives || []) as Objective[]

            // Find active task using chain logic
            const chapters = objs.filter(o => o.level === 'major').sort((a, b) => a.progress - b.progress)
            const activeChapter = chapters.find(c => c.status !== 'completed')

            if (activeChapter) {
                const steps = objs.filter(o => o.level === 'sub' && o.parent_id === activeChapter.id)
                const step = steps.find(s => s.status !== 'completed')
                setActiveStep(step || null)

                if (step) {
                    const tasks = objs.filter(o => o.level === 'task' && o.parent_id === step.id)
                    const task = tasks.find(t => t.status !== 'completed')
                    setActiveTask(task || null)
                }
            }

            // Load materials for active task
            if (activeTask?.id) {
                const { data: taskMaterials } = await supabase
                    .from('task_materials')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .eq('objective_id', activeTask.id)
                    .order('sort_order')

                setMaterials(taskMaterials || [])
            }

            // Load all materials
            const { data: allMats } = await supabase
                .from('task_materials')
                .select('*')
                .eq('clerk_user_id', user.id)
                .order('created_at', { ascending: false })

            setAllMaterials(allMats || [])

        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }, [user, activeTask?.id])

    useEffect(() => {
        if (isLoaded && user) {
            loadData()
        } else if (isLoaded && !user) {
            setLoading(false)
        }
    }, [isLoaded, user, loadData])

    // Reload materials when activeTask changes
    useEffect(() => {
        if (activeTask?.id && user) {
            supabase
                .from('task_materials')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('objective_id', activeTask.id)
                .order('sort_order')
                .then(({ data }) => {
                    setMaterials(data || [])
                })
        }
    }, [activeTask?.id, user])

    // ============================================
    // ACTIONS
    // ============================================

    const handleAddMaterial = async () => {
        if (!user || !newMaterial.title.trim()) return

        const { error } = await supabase
            .from('task_materials')
            .insert({
                clerk_user_id: user.id,
                objective_id: activeTask?.id || null,
                title: newMaterial.title.trim(),
                content: newMaterial.content.trim() || null,
                url: newMaterial.url.trim() || null,
                material_type: newMaterial.material_type,
                icon: MATERIAL_TYPE_CONFIG[newMaterial.material_type].icon,
                created_by: 'user',
                sort_order: materials.length
            })

        if (!error) {
            setNewMaterial({ title: '', content: '', url: '', material_type: 'note' })
            setShowAddForm(false)
            loadData()
        }
    }

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm('Eliminare questo materiale?')) return

        await supabase
            .from('task_materials')
            .delete()
            .eq('id', id)

        setMaterials(prev => prev.filter(m => m.id !== id))
        setAllMaterials(prev => prev.filter(m => m.id !== id))
    }

    const handleUpdateMaterial = async (id: string) => {
        if (!editContent.trim()) return

        await supabase
            .from('task_materials')
            .update({ content: editContent.trim() })
            .eq('id', id)

        setMaterials(prev => prev.map(m =>
            m.id === id ? { ...m, content: editContent.trim() } : m
        ))
        setAllMaterials(prev => prev.map(m =>
            m.id === id ? { ...m, content: editContent.trim() } : m
        ))
        setEditingMaterial(null)
        setEditContent('')
    }

    // ============================================
    // RENDER
    // ============================================

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="scrivania-page">
                <div className="scrivania-glow"></div>
                <div className="auth-state">
                    <div className="auth-icon">📚</div>
                    <h1>La Tua Scrivania</h1>
                    <p>Accedi per vedere i materiali che NUR ha preparato per te</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
            </div>
        )
    }

    const displayMaterials = viewMode === 'task' ? materials : allMaterials

    return (
        <div className="scrivania-page">
            <div className="scrivania-glow"></div>

            {/* ===== HEADER ===== */}
            <header className="scrivania-header">
                <Link href="/la-mia-vita" className="back-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </Link>
                <div className="header-title">
                    <span className="header-icon">📚</span>
                    <span>Scrivania</span>
                </div>
                <Link href="/chat" className="chat-fab">
                    <span>💬</span>
                </Link>
            </header>

            {/* ===== TASK CONTEXT ===== */}
            {activeTask && (
                <div className="task-context">
                    <div className="context-label">MATERIALI PER</div>
                    <div className="context-task">
                        <span className="task-icon">🎯</span>
                        <span className="task-title">{activeTask.title}</span>
                    </div>
                    {activeStep && (
                        <div className="context-step">
                            Step: {activeStep.title}
                        </div>
                    )}
                </div>
            )}

            {/* ===== VIEW TOGGLE ===== */}
            <div className="view-toggle">
                <button
                    className={`toggle-btn ${viewMode === 'task' ? 'active' : ''}`}
                    onClick={() => setViewMode('task')}
                >
                    <span>🎯</span>
                    Task Attuale ({materials.length})
                </button>
                <button
                    className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                    onClick={() => setViewMode('all')}
                >
                    <span>📁</span>
                    Tutti ({allMaterials.length})
                </button>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <main className="scrivania-main">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Carico i materiali...</p>
                    </div>
                ) : displayMaterials.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-visual">
                            <div className="empty-icon">📚</div>
                            <div className="empty-particles">
                                <span>✨</span>
                                <span>📄</span>
                                <span>🔗</span>
                            </div>
                        </div>
                        <h3>Nessun materiale ancora</h3>
                        <p>
                            {viewMode === 'task'
                                ? 'NUR aggiungerà qui i materiali per la tua task'
                                : 'Inizia aggiungendo materiali o parla con NUR'}
                        </p>
                        <div className="empty-actions">
                            <button className="btn-add" onClick={() => setShowAddForm(true)}>
                                <span>➕</span> Aggiungi materiale
                            </button>
                            <Link href="/chat" className="btn-nur">
                                <span>💬</span> Chiedi a NUR
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="materials-grid">
                        {displayMaterials.map(material => {
                            const typeConfig = MATERIAL_TYPE_CONFIG[material.material_type] || MATERIAL_TYPE_CONFIG.note
                            const isExpanded = expandedMaterial === material.id
                            const isEditing = editingMaterial === material.id

                            return (
                                <article
                                    key={material.id}
                                    className={`material-card ${isExpanded ? 'expanded' : ''}`}
                                    onClick={() => !isEditing && setExpandedMaterial(isExpanded ? null : material.id)}
                                >
                                    {/* Type Badge */}
                                    <div
                                        className="material-type-badge"
                                        style={{ '--type-color': typeConfig.color } as React.CSSProperties}
                                    >
                                        <span>{material.icon || typeConfig.icon}</span>
                                        <span>{typeConfig.label}</span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="material-title">{material.title}</h3>

                                    {/* Content */}
                                    {isEditing ? (
                                        <div className="edit-area" onClick={e => e.stopPropagation()}>
                                            <textarea
                                                value={editContent}
                                                onChange={e => setEditContent(e.target.value)}
                                                placeholder="Contenuto..."
                                                autoFocus
                                            />
                                            <div className="edit-actions">
                                                <button className="btn-save" onClick={() => handleUpdateMaterial(material.id)}>
                                                    ✓ Salva
                                                </button>
                                                <button className="btn-cancel" onClick={() => setEditingMaterial(null)}>
                                                    ✕ Annulla
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {material.content && (
                                                <div className={`material-content ${isExpanded ? 'full' : 'preview'}`}>
                                                    {material.content.split('\n').map((line, i) => (
                                                        <p key={i}>{line}</p>
                                                    ))}
                                                </div>
                                            )}

                                            {/* URL */}
                                            {material.url && (
                                                <a
                                                    href={material.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="material-url"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    🔗 {new URL(material.url).hostname}
                                                </a>
                                            )}
                                        </>
                                    )}

                                    {/* Description */}
                                    {material.description && isExpanded && (
                                        <p className="material-description">{material.description}</p>
                                    )}

                                    {/* Expand hint */}
                                    {!isExpanded && material.content && material.content.length > 100 && (
                                        <div className="expand-hint">Tocca per espandere</div>
                                    )}

                                    {/* Actions */}
                                    {isExpanded && !isEditing && (
                                        <div className="material-actions" onClick={e => e.stopPropagation()}>
                                            <button
                                                className="action-btn edit"
                                                onClick={() => {
                                                    setEditingMaterial(material.id)
                                                    setEditContent(material.content || '')
                                                }}
                                            >
                                                ✏️ Modifica
                                            </button>
                                            <Link
                                                href={`/chat?context=${encodeURIComponent(`Parliamo del materiale: ${material.title}`)}`}
                                                className="action-btn chat"
                                            >
                                                💬 Discuti
                                            </Link>
                                            <button
                                                className="action-btn delete"
                                                onClick={() => handleDeleteMaterial(material.id)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}

                                    {/* Source badge */}
                                    <div className="material-source">
                                        {material.created_by === 'nur' ? '✨ NUR' : '👤 Tu'}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* ===== ADD MATERIAL FORM ===== */}
            {showAddForm && (
                <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
                    <div className="add-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>➕ Nuovo Materiale</h2>
                            <button className="close-btn" onClick={() => setShowAddForm(false)}>✕</button>
                        </div>

                        <div className="form-group">
                            <label>Tipo</label>
                            <div className="type-selector">
                                {Object.entries(MATERIAL_TYPE_CONFIG).map(([key, config]) => (
                                    <button
                                        key={key}
                                        className={`type-option ${newMaterial.material_type === key ? 'active' : ''}`}
                                        onClick={() => setNewMaterial(prev => ({ ...prev, material_type: key as TaskMaterial['material_type'] }))}
                                        style={{ '--opt-color': config.color } as React.CSSProperties}
                                    >
                                        <span>{config.icon}</span>
                                        <span>{config.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Titolo *</label>
                            <input
                                type="text"
                                value={newMaterial.title}
                                onChange={e => setNewMaterial(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Es: Guida alla vendita telefonica"
                            />
                        </div>

                        <div className="form-group">
                            <label>Contenuto</label>
                            <textarea
                                value={newMaterial.content}
                                onChange={e => setNewMaterial(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Appunti, note, testo..."
                                rows={4}
                            />
                        </div>

                        <div className="form-group">
                            <label>URL (opzionale)</label>
                            <input
                                type="url"
                                value={newMaterial.url}
                                onChange={e => setNewMaterial(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddForm(false)}>
                                Annulla
                            </button>
                            <button
                                className="btn-save"
                                onClick={handleAddMaterial}
                                disabled={!newMaterial.title.trim()}
                            >
                                ✓ Aggiungi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== FAB ADD ===== */}
            {!showAddForm && displayMaterials.length > 0 && (
                <button className="fab-add" onClick={() => setShowAddForm(true)}>
                    <span>➕</span>
                </button>
            )}

            {/* ===== BOTTOM NAV ===== */}
            <nav className="bottom-nav">
                <Link href="/la-mia-vita" className="nav-item">
                    <span className="nav-icon">🏠</span>
                    <span className="nav-label">Dashboard</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">NUR</span>
                </Link>
                <Link href="/giornale" className="nav-item active">
                    <span className="nav-icon">📚</span>
                    <span className="nav-label">Scrivania</span>
                </Link>
            </nav>
        </div>
    )
}
