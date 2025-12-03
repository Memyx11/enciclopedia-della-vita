'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import './area.css'

// Configurazione aree
const areeConfig: Record<string, {
    nome: string
    emoji: string
    color: string
    vibe: string
    domande: string[]
}> = {
    salute: {
        nome: 'Salute Fisica',
        emoji: '💪',
        color: '#51cf66',
        vibe: 'coach',
        domande: ['Peso attuale', 'Ore di sonno', 'Allenamenti/settimana', 'Alimentazione', 'Energia (1-10)']
    },
    soldi: {
        nome: 'Finanze',
        emoji: '💰',
        color: '#ffd43b',
        vibe: 'consulente',
        domande: ['Entrate mensili', 'Spese fisse', 'Risparmi', 'Debiti', 'Obiettivo finanziario']
    },
    relazioni: {
        nome: 'Relazioni',
        emoji: '❤️',
        color: '#ff6b6b',
        vibe: 'amico',
        domande: ['Stato relazione', 'Qualità rapporti familiari', 'Amicizie strette', 'Conflitti aperti', 'Bisogno principale']
    },
    lavoro: {
        nome: 'Carriera',
        emoji: '💼',
        color: '#ff922b',
        vibe: 'mentor',
        domande: ['Ruolo attuale', 'Soddisfazione (1-10)', 'Prossimo step', 'Skills da sviluppare', 'Timeline obiettivo']
    },
    hobby: {
        nome: 'Hobby & Passioni',
        emoji: '🎨',
        color: '#22b8cf',
        vibe: 'creativo',
        domande: ['Hobby attivi', 'Tempo dedicato/settimana', 'Nuovo hobby desiderato', 'Blocchi creativi', 'Progetti in corso']
    },
    crescita: {
        nome: 'Crescita Personale',
        emoji: '📚',
        color: '#cc5de8',
        vibe: 'filosofo',
        domande: ['Ultimo libro letto', 'Cosa stai imparando', 'Abitudini in sviluppo', 'Area di miglioramento', 'Mentore/ispirazione']
    },
    casa: {
        nome: 'Casa & Spazio',
        emoji: '🏠',
        color: '#868e96',
        vibe: 'organizzatore',
        domande: ['Soddisfazione casa (1-10)', 'Cosa sistemare', 'Prossimo acquisto', 'Ordine generale', 'Comfort']
    },
    sociale: {
        nome: 'Vita Sociale',
        emoji: '👥',
        color: '#5c7cfa',
        vibe: 'connector',
        domande: ['Frequenza uscite', 'Qualità interazioni', 'Network professionale', 'Community', 'Eventi in programma']
    },
    spirituale: {
        nome: 'Benessere Interiore',
        emoji: '🧘',
        color: '#845ef7',
        vibe: 'guida',
        domande: ['Pratica meditativa', 'Livello stress (1-10)', 'Gratitudine per', 'Paure principali', 'Senso di scopo']
    },
    futuro: {
        nome: 'Visione Futura',
        emoji: '🎯',
        color: '#f783ac',
        vibe: 'visionario',
        domande: ['Dove tra 1 anno', 'Dove tra 5 anni', 'Sogno più grande', 'Prossimo passo concreto', 'Ostacolo principale']
    }
}

interface LifeArea {
    id: string
    progress: number
    current_state: Record<string, any>
    goal_state: Record<string, any>
    active_tasks: any[]
    notes: string
    priority: number
}

interface Memory {
    id: string
    memory_type: string
    content: string
    importance: number
    created_at: string
}

interface Insight {
    id: string
    content: string
    title?: string
    created_at: string
    insight_type: string
}

interface Solution {
    id: string
    title: string
    status: string
    progress: number
    steps: string[]
}

export default function AreaPage() {
    const params = useParams()
    const router = useRouter()
    const { user, isLoaded } = useUser()
    const areaId = params?.id as string

    const [lifeArea, setLifeArea] = useState<LifeArea | null>(null)
    const [memories, setMemories] = useState<Memory[]>([])
    const [insights, setInsights] = useState<Insight[]>([])
    const [solutions, setSolutions] = useState<Solution[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'memories' | 'journey'>('overview')
    const [editingState, setEditingState] = useState<'current' | 'goal' | null>(null)
    const [formData, setFormData] = useState<Record<string, string>>({})

    const config = areeConfig[areaId]

    useEffect(() => {
        if (!config) {
            router.push('/la-mia-vita')
            return
        }

        if (isLoaded && user) {
            loadAreaData()
        }
    }, [areaId, isLoaded, user])

    const loadAreaData = async () => {
        if (!user) return
        setLoading(true)

        try {
            // 1. Carica dati dell'area
            const { data: areaData } = await supabase
                .from('life_areas')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('area_type', areaId)
                .single()

            if (areaData) {
                setLifeArea(areaData)
                setFormData(areaData.current_state || {})
            }

            // 2. Carica memorie relative a quest'area
            const { data: memoriesData } = await supabase
                .from('user_memory')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('area_related', areaId)
                .eq('is_current', true)
                .order('importance', { ascending: false })
                .limit(10)

            if (memoriesData) {
                setMemories(memoriesData)
            }

            // 3. Carica insights/journal entries per quest'area
            const { data: insightsData } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('area_related', areaId)
                .order('created_at', { ascending: false })
                .limit(5)

            if (insightsData) {
                setInsights(insightsData)
            }

            // 4. Carica soluzioni/piani per quest'area
            const { data: solutionsData } = await supabase
                .from('solutions')
                .select('*')
                .eq('clerk_user_id', user.id)
                .eq('area_type', areaId)
                .in('status', ['proposta', 'accettata', 'in_corso'])
                .order('created_at', { ascending: false })
                .limit(5)

            if (solutionsData) {
                setSolutions(solutionsData)
            }

        } catch (err) {
            console.error('Error loading area data:', err)
        } finally {
            setLoading(false)
        }
    }

    const updateProgress = async (newProgress: number) => {
        if (!user || !lifeArea) return

        const { error } = await supabase
            .from('life_areas')
            .update({
                progress: newProgress,
                updated_at: new Date().toISOString()
            })
            .eq('id', lifeArea.id)

        if (!error) {
            setLifeArea({ ...lifeArea, progress: newProgress })
        }
    }

    const saveState = async (stateType: 'current' | 'goal') => {
        if (!user || !lifeArea) return

        const updateField = stateType === 'current' ? 'current_state' : 'goal_state'

        const { error } = await supabase
            .from('life_areas')
            .update({
                [updateField]: formData,
                updated_at: new Date().toISOString()
            })
            .eq('id', lifeArea.id)

        if (!error) {
            setLifeArea({
                ...lifeArea,
                [updateField]: formData
            })
            setEditingState(null)
        }
    }

    const updateSolutionStatus = async (solutionId: string, newStatus: string) => {
        const { error } = await supabase
            .from('solutions')
            .update({ status: newStatus })
            .eq('id', solutionId)

        if (!error) {
            setSolutions(solutions.map(s =>
                s.id === solutionId ? { ...s, status: newStatus } : s
            ))
        }
    }

    const getMemoryIcon = (type: string) => {
        const icons: Record<string, string> = {
            fact: '📌',
            preference: '💭',
            goal: '🎯',
            struggle: '😓',
            achievement: '🏆',
            pattern: '🔄',
            emotion: '💜',
            relationship: '👥',
            trigger: '⚡',
            value: '💎'
        }
        return icons[type] || '📝'
    }

    if (!config) return null
    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="area-container" style={{ '--area-color': config.color } as React.CSSProperties}>
                <div className="bg-gradient"></div>
                <div className="auth-prompt">
                    <h1>{config.emoji} {config.nome}</h1>
                    <p>Accedi per vedere i tuoi dati</p>
                    <Link href="/" className="btn btn-primary">Vai alla Home</Link>
                </div>
            </div>
        )
    }

    const userName = user?.firstName || 'Amico'
    const progress = lifeArea?.progress || 0

    return (
        <div className="area-container" style={{ '--area-color': config.color } as React.CSSProperties}>
            <div className="bg-gradient"></div>
            <div className="stars"></div>

            {/* Header */}
            <header className="area-header">
                <Link href="/la-mia-vita" className="back-button">
                    <span>←</span>
                    <span>Universo</span>
                </Link>
                <div className="area-title-section">
                    <span className="area-emoji">{config.emoji}</span>
                    <h1 className="area-title">{config.nome}</h1>
                </div>
                <Link href={`/chat?area=${areaId}`} className="quick-chat-btn">
                    💬
                </Link>
            </header>

            {/* Tab Navigation */}
            <nav className="area-tabs">
                <button
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Panoramica
                </button>
                <button
                    className={`tab ${activeTab === 'memories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('memories')}
                >
                    🧠 Memorie NUR
                </button>
                <button
                    className={`tab ${activeTab === 'journey' ? 'active' : ''}`}
                    onClick={() => setActiveTab('journey')}
                >
                    🛤️ Viaggio
                </button>
            </nav>

            <main className="area-main">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Carico i tuoi dati...</p>
                    </div>
                ) : (
                    <>
                        {/* === OVERVIEW TAB === */}
                        {activeTab === 'overview' && (
                            <div className="overview-content">
                                {/* Progress Section */}
                                <section className="progress-section">
                                    <h3>Il tuo progresso</h3>
                                    <div className="progress-bar-container">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                        <span className="progress-value">{progress}%</span>
                                    </div>
                                    <div className="progress-controls">
                                        <button onClick={() => updateProgress(Math.max(0, progress - 10))}>-10</button>
                                        <button onClick={() => updateProgress(Math.min(100, progress + 10))}>+10</button>
                                    </div>
                                </section>

                                {/* Quick Stats */}
                                <section className="quick-stats">
                                    <div className="stat-card">
                                        <div className="stat-value">{memories.length}</div>
                                        <div className="stat-label">Cose che NUR sa</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{solutions.length}</div>
                                        <div className="stat-label">Piani attivi</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{insights.length}</div>
                                        <div className="stat-label">Insights</div>
                                    </div>
                                </section>

                                {/* Solutions/Plans */}
                                {solutions.length > 0 && (
                                    <section className="solutions-section">
                                        <h3>📋 I tuoi piani</h3>
                                        {solutions.map(solution => (
                                            <div key={solution.id} className="solution-card">
                                                <div className="solution-header">
                                                    <span className="solution-title">{solution.title}</span>
                                                    <span className={`solution-status ${solution.status}`}>
                                                        {solution.status}
                                                    </span>
                                                </div>
                                                {solution.steps && solution.steps.length > 0 && (
                                                    <ul className="solution-steps">
                                                        {(solution.steps as string[]).slice(0, 3).map((step, i) => (
                                                            <li key={i}>{step}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                                <div className="solution-actions">
                                                    {solution.status === 'proposta' && (
                                                        <>
                                                            <button
                                                                className="btn-accept"
                                                                onClick={() => updateSolutionStatus(solution.id, 'accettata')}
                                                            >
                                                                Accetta
                                                            </button>
                                                            <button
                                                                className="btn-decline"
                                                                onClick={() => updateSolutionStatus(solution.id, 'rifiutata')}
                                                            >
                                                                Rifiuta
                                                            </button>
                                                        </>
                                                    )}
                                                    {solution.status === 'accettata' && (
                                                        <button
                                                            className="btn-start"
                                                            onClick={() => updateSolutionStatus(solution.id, 'in_corso')}
                                                        >
                                                            Inizia
                                                        </button>
                                                    )}
                                                    {solution.status === 'in_corso' && (
                                                        <button
                                                            className="btn-complete"
                                                            onClick={() => updateSolutionStatus(solution.id, 'completata')}
                                                        >
                                                            Completa
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {/* Latest Insight */}
                                {insights.length > 0 && (
                                    <section className="ai-insight-card">
                                        <div className="insight-header">
                                            <span className="insight-icon">💡</span>
                                            <span className="insight-title">
                                                {insights[0].title || 'Ultimo insight'}
                                            </span>
                                        </div>
                                        <p className="insight-message">{insights[0].content}</p>
                                    </section>
                                )}

                                {/* CTA */}
                                <Link href={`/chat?area=${areaId}`} className="cta-chat">
                                    💬 Parla con NUR di {config.nome.toLowerCase()}
                                </Link>
                            </div>
                        )}

                        {/* === MEMORIES TAB === */}
                        {activeTab === 'memories' && (
                            <div className="memories-content">
                                <h3>🧠 Cosa NUR sa di te in quest&apos;area</h3>

                                {memories.length === 0 ? (
                                    <div className="empty-state">
                                        <p>NUR non ha ancora memorie su di te in quest&apos;area.</p>
                                        <p>Inizia a parlare con lei per costruire la tua storia!</p>
                                        <Link href={`/chat?area=${areaId}`} className="cta-chat">
                                            💬 Inizia una conversazione
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="memories-list">
                                        {memories.map(memory => (
                                            <div key={memory.id} className="memory-card">
                                                <div className="memory-icon">
                                                    {getMemoryIcon(memory.memory_type)}
                                                </div>
                                                <div className="memory-content">
                                                    <span className="memory-type">{memory.memory_type}</span>
                                                    <p>{memory.content}</p>
                                                    <span className="memory-importance">
                                                        Importanza: {memory.importance}/10
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Journal Insights */}
                                {insights.length > 0 && (
                                    <>
                                        <h3 style={{ marginTop: '24px' }}>📰 Insights dal Giornale</h3>
                                        <div className="insights-list">
                                            {insights.map(insight => (
                                                <div key={insight.id} className="insight-card-small">
                                                    <span className="insight-type">{insight.insight_type}</span>
                                                    <p>{insight.content}</p>
                                                    <span className="insight-date">
                                                        {new Date(insight.created_at).toLocaleDateString('it-IT')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* === JOURNEY TAB === */}
                        {activeTab === 'journey' && (
                            <div className="journey-content">
                                {/* Situazione Attuale */}
                                <section className="comparison-card current">
                                    <h3>📍 Dove Sei Ora</h3>
                                    {editingState === 'current' ? (
                                        <div className="edit-form">
                                            {config.domande.map((domanda, i) => (
                                                <div key={i} className="field-row">
                                                    <label>{domanda}</label>
                                                    <input
                                                        type="text"
                                                        value={formData[domanda] || ''}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            [domanda]: e.target.value
                                                        })}
                                                    />
                                                </div>
                                            ))}
                                            <div className="form-actions">
                                                <button onClick={() => saveState('current')}>Salva</button>
                                                <button onClick={() => setEditingState(null)}>Annulla</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="comparison-fields">
                                                {config.domande.map((domanda, i) => (
                                                    <div key={i} className="field-row">
                                                        <span className="field-label">{domanda}</span>
                                                        <span className="field-value">
                                                            {lifeArea?.current_state?.[domanda] || '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                className="edit-btn"
                                                onClick={() => {
                                                    setFormData(lifeArea?.current_state || {})
                                                    setEditingState('current')
                                                }}
                                            >
                                                Aggiorna
                                            </button>
                                        </>
                                    )}
                                </section>

                                <div className="comparison-arrow">→</div>

                                {/* Obiettivo */}
                                <section className="comparison-card goal">
                                    <h3>🎯 Dove Vuoi Arrivare</h3>
                                    {editingState === 'goal' ? (
                                        <div className="edit-form">
                                            {config.domande.map((domanda, i) => (
                                                <div key={i} className="field-row">
                                                    <label>{domanda}</label>
                                                    <input
                                                        type="text"
                                                        value={formData[domanda] || ''}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            [domanda]: e.target.value
                                                        })}
                                                    />
                                                </div>
                                            ))}
                                            <div className="form-actions">
                                                <button onClick={() => saveState('goal')}>Salva</button>
                                                <button onClick={() => setEditingState(null)}>Annulla</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="comparison-fields">
                                                {config.domande.map((domanda, i) => (
                                                    <div key={i} className="field-row">
                                                        <span className="field-label">{domanda}</span>
                                                        <span className="field-value">
                                                            {lifeArea?.goal_state?.[domanda] || '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                className="edit-btn"
                                                onClick={() => {
                                                    setFormData(lifeArea?.goal_state || {})
                                                    setEditingState('goal')
                                                }}
                                            >
                                                Definisci
                                            </button>
                                        </>
                                    )}
                                </section>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* FAB Chat */}
            <Link href={`/chat?area=${areaId}`} className="chat-fab">
                <span className="fab-icon">💬</span>
            </Link>
        </div>
    )
}
