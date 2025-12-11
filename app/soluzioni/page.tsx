'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase, Solution } from '@/lib/supabase'
import Link from 'next/link'
import './soluzioni.css'

export default function SoluzioniPage() {
    const { user, isLoaded } = useUser()
    const [solutions, setSolutions] = useState<Solution[]>([])
    const [filter, setFilter] = useState('tutte')
    const [loading, setLoading] = useState(true)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (isLoaded && user) {
            fetchSolutions()
        }
    }, [isLoaded, user])

    const fetchSolutions = async () => {
        if (!user) return
        const { data } = await supabase
            .from('solutions')
            .select('*')
            .eq('clerk_user_id', user.id)
            .order('created_at', { ascending: false })
        if (data) setSolutions(data)
        setLoading(false)
    }

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('solutions').update({ status }).eq('id', id)
        fetchSolutions()
    }

    const deleteSolution = async (id: string) => {
        if (!confirm('Eliminare definitivamente?')) return
        await supabase.from('solutions').delete().eq('id', id)
        fetchSolutions()
    }

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) newSet.delete(id)
            else newSet.add(id)
            return newSet
        })
    }

    const filteredSolutions = filter === 'tutte' 
        ? solutions 
        : solutions.filter(s => s.status === filter)

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('it-IT')
    }

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    }

    if (!isLoaded || loading) {
        return <div className="loading">Caricamento...</div>
    }

    return (
        <>
            <div className="bg-gradient"></div>
            
            <header>
                <div className="header-content">
                    <Link href="/" className="logo">📖 Enciclopedia della Vita</Link>
                    <Link href="/la-mia-vita" className="back-link">← Dashboard</Link>
                </div>
            </header>

            <div className="container">
                <div className="page-header">
                    <h1>💡 Le Mie Soluzioni</h1>
                    <p>Gestisci i piani proposti dal tuo Coach AI</p>
                </div>

                <div className="nav-buttons">
                    <Link href="/chat" className="nav-btn">🤖 Chatbot</Link>
                    <Link href="/la-mia-vita" className="nav-btn">📊 Dashboard</Link>
                    <Link href="/" className="nav-btn">📖 Enciclopedia</Link>
                </div>

                <div className="filter-tabs">
                    <button 
                        className={`filter-tab ${filter === 'tutte' ? 'active' : ''}`}
                        onClick={() => setFilter('tutte')}
                    >Tutte</button>
                    <button 
                        className={`filter-tab ${filter === 'proposta' ? 'active' : ''}`}
                        onClick={() => setFilter('proposta')}
                    >⏳ In attesa</button>
                    <button 
                        className={`filter-tab ${filter === 'accettata' ? 'active' : ''}`}
                        onClick={() => setFilter('accettata')}
                    >✅ Accettate</button>
                    <button 
                        className={`filter-tab ${filter === 'rifiutata' ? 'active' : ''}`}
                        onClick={() => setFilter('rifiutata')}
                    >❌ Rifiutate</button>
                </div>

                <div className="solutions-grid">
                    {filteredSolutions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">💡</div>
                            <h2>{filter === 'tutte' ? 'Nessuna soluzione ancora' : `Nessuna soluzione ${filter}`}</h2>
                            <p>Il Coach AI proporrà soluzioni durante le conversazioni.</p>
                            <Link href="/chat" className="nav-btn">🤖 Vai al Chatbot</Link>
                        </div>
                    ) : (
                        filteredSolutions.map(solution => (
                            <div key={solution.id} className="solution-card">
                                <div className="solution-header">
                                    <div className="solution-title-area">
                                        <div className="solution-title">{solution.title}</div>
                                        <div className="solution-meta">
                                            <span>📅 {formatDate(solution.created_at!)}</span>
                                            <span>🕐 {formatTime(solution.created_at!)}</span>
                                        </div>
                                    </div>
                                    <div className={`solution-status status-${solution.status}`}>
                                        {solution.status === 'proposta' ? '⏳ In attesa' : 
                                         solution.status === 'accettata' ? '✅ Accettata' : '❌ Rifiutata'}
                                    </div>
                                </div>

                                {solution.steps && solution.steps.length > 0 && (
                                    <>
                                        <div className="solution-progress">
                                            <div className="progress-header">
                                                <h4>📊 Progresso</h4>
                                                <span className="progress-percentage">{solution.progress || 0}%</span>
                                            </div>
                                            <div className="progress-bar-container">
                                                <div 
                                                    className={`progress-bar-fill ${solution.progress === 100 ? 'complete' : ''}`}
                                                    style={{ width: `${solution.progress || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="solution-steps">
                                            <div className="steps-header">
                                                <h4>📋 Piano ({solution.steps.length} step)</h4>
                                                <button 
                                                    className="expand-btn"
                                                    onClick={() => toggleExpand(solution.id!)}
                                                >
                                                    {expandedIds.has(solution.id!) ? '📋 Chiudi' : '📋 Espandi'}
                                                </button>
                                            </div>
                                            {expandedIds.has(solution.id!) && (
                                                <div className="steps-container expanded">
                                                    {(solution.steps as string[]).map((step, i) => (
                                                        <div key={i} className="step-item">
                                                            <div className="step-main">
                                                                <div className="step-checkbox"></div>
                                                                <div className="step-content">
                                                                    <span className="step-number">Step {i + 1}</span>
                                                                    <div className="step-text">{step}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <div className="solution-actions">
                                    {solution.status === 'proposta' && (
                                        <>
                                            <button className="btn btn-accept" onClick={() => updateStatus(solution.id!, 'accettata')}>
                                                ✅ Accetta
                                            </button>
                                            <button className="btn btn-reject" onClick={() => updateStatus(solution.id!, 'rifiutata')}>
                                                ❌ Rifiuta
                                            </button>
                                        </>
                                    )}
                                    {solution.status === 'accettata' && (
                                        <button className="btn btn-reject" onClick={() => deleteSolution(solution.id!)}>
                                            🗑️ Elimina
                                        </button>
                                    )}
                                    {solution.status === 'rifiutata' && (
                                        <>
                                            <button className="btn btn-accept" onClick={() => updateStatus(solution.id!, 'accettata')}>
                                                ♻️ Riaccetta
                                            </button>
                                            <button className="btn btn-reject" onClick={() => deleteSolution(solution.id!)}>
                                                🗑️ Elimina
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    )
}
