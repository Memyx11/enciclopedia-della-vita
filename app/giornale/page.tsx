'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase/client'
import './giornale.css'

interface Material {
    id: string
    name: string
    description: string | null
    category: string
    rarity: string
    is_owned: boolean
    progress: number
}

interface Goal {
    id: string
    title: string
    goal_type: string
    status: string
    progress: number
}

export default function GiornalePage() {
    const { user, isLoaded } = useUser()
    const [materials, setMaterials] = useState<Material[]>([])
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'materials' | 'goals'>('materials')

    useEffect(() => {
        if (!isLoaded || !user) {
            setLoading(false)
            return
        }

        const loadData = async () => {
            try {
                // Load materials
                const { data: materialsData } = await supabaseClient
                    .from('materials')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .order('created_at', { ascending: false })

                if (materialsData) {
                    setMaterials(materialsData)
                }

                // Load goals
                const { data: goalsData } = await supabaseClient
                    .from('goals')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .neq('status', 'completed')
                    .order('sort_order')

                if (goalsData) {
                    setGoals(goalsData)
                }
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [isLoaded, user])

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="scrivania-page">
                <div className="scrivania-glow"></div>
                <div className="auth-state">
                    <div className="auth-icon">📚</div>
                    <h1>La Tua Scrivania</h1>
                    <p>Accedi per vedere i tuoi materiali e obiettivi</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
            </div>
        )
    }

    const getRarityColor = (rarity: string) => {
        const colors: Record<string, string> = {
            comune: '#718096',
            non_comune: '#48BB78',
            raro: '#4299E1',
            epico: '#9F7AEA',
            leggendario: '#F6AD55'
        }
        return colors[rarity] || colors.comune
    }

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            tech: '💻',
            libri: '📚',
            corsi: '🎓',
            strumenti: '🔧',
            documenti: '📄',
            veicoli: '🚗'
        }
        return icons[category] || '📦'
    }

    const getGoalTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            obiettivo: '🎯',
            boss: '👹',
            sogno: '⭐'
        }
        return icons[type] || '🎯'
    }

    return (
        <div className="scrivania-page">
            <div className="scrivania-glow"></div>

            {/* Header */}
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

            {/* View Toggle */}
            <div className="view-toggle">
                <button
                    className={`toggle-btn ${viewMode === 'materials' ? 'active' : ''}`}
                    onClick={() => setViewMode('materials')}
                >
                    <span>📦</span>
                    Materiali ({materials.length})
                </button>
                <button
                    className={`toggle-btn ${viewMode === 'goals' ? 'active' : ''}`}
                    onClick={() => setViewMode('goals')}
                >
                    <span>🎯</span>
                    Obiettivi ({goals.length})
                </button>
            </div>

            {/* Main Content */}
            <main className="scrivania-main">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Caricamento...</p>
                    </div>
                ) : viewMode === 'materials' ? (
                    materials.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-visual">
                                <div className="empty-icon">📚</div>
                            </div>
                            <h3>Nessun materiale</h3>
                            <p>Parla con NUR per aggiungere materiali</p>
                            <Link href="/chat" className="btn-nur">
                                <span>💬</span> Parla con NUR
                            </Link>
                        </div>
                    ) : (
                        <div className="materials-grid">
                            {materials.map(material => (
                                <article key={material.id} className="material-card">
                                    <div
                                        className="material-type-badge"
                                        style={{ '--type-color': getRarityColor(material.rarity) } as React.CSSProperties}
                                    >
                                        <span>{getCategoryIcon(material.category)}</span>
                                        <span>{material.category}</span>
                                    </div>
                                    <h3 className="material-title">{material.name}</h3>
                                    {material.description && (
                                        <p className="material-content">{material.description}</p>
                                    )}
                                    <div className="material-footer">
                                        <span className="material-rarity" style={{ color: getRarityColor(material.rarity) }}>
                                            {material.rarity}
                                        </span>
                                        {material.is_owned && (
                                            <span className="material-owned">✅ Posseduto</span>
                                        )}
                                    </div>
                                    {material.progress > 0 && material.progress < 100 && (
                                        <div className="material-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${material.progress}%` }}
                                                />
                                            </div>
                                            <span>{material.progress}%</span>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )
                ) : (
                    goals.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-visual">
                                <div className="empty-icon">🎯</div>
                            </div>
                            <h3>Nessun obiettivo attivo</h3>
                            <p>Parla con NUR per creare i tuoi obiettivi</p>
                            <Link href="/chat" className="btn-nur">
                                <span>💬</span> Parla con NUR
                            </Link>
                        </div>
                    ) : (
                        <div className="goals-list">
                            {goals.map(goal => (
                                <article key={goal.id} className="goal-card">
                                    <div className="goal-icon">{getGoalTypeIcon(goal.goal_type)}</div>
                                    <div className="goal-info">
                                        <h3>{goal.title}</h3>
                                        <div className="goal-meta">
                                            <span className={`goal-type ${goal.goal_type}`}>{goal.goal_type}</span>
                                            <span className={`goal-status ${goal.status}`}>{goal.status}</span>
                                        </div>
                                        <div className="goal-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${goal.progress}%` }}
                                                />
                                            </div>
                                            <span>{goal.progress}%</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )
                )}
            </main>

            {/* Bottom Nav */}
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
