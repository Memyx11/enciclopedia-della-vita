'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import './giornale.css'

interface JournalEntry {
    id: string
    entry_type: string
    title?: string
    content: string
    area_related?: string
    feed_priority: number
    is_seen: boolean
    user_interacted: boolean
    is_pinned: boolean
    created_at: string
    metadata?: Record<string, any>
}

// Tipi di contenuto che NUR può creare
const entryTypeConfig: Record<string, { emoji: string; label: string; color: string }> = {
    'nur_message': { emoji: '💬', label: 'Messaggio', color: '#845ef7' },
    'resource': { emoji: '📚', label: 'Risorsa', color: '#339af0' },
    'reminder': { emoji: '🔔', label: 'Promemoria', color: '#ff922b' },
    'reflection_prompt': { emoji: '🤔', label: 'Riflessione', color: '#cc5de8' },
    'challenge': { emoji: '🎯', label: 'Sfida', color: '#f783ac' },
    'celebration': { emoji: '🎉', label: 'Celebrazione', color: '#51cf66' },
    'quote': { emoji: '💭', label: 'Citazione', color: '#adb5bd' },
    'weekly_summary': { emoji: '📊', label: 'Riepilogo', color: '#20c997' },
    'suggestion': { emoji: '✨', label: 'Suggerimento', color: '#339af0' },
    'achievement': { emoji: '🏆', label: 'Traguardo', color: '#51cf66' },
    'article': { emoji: '📖', label: 'Articolo', color: '#868e96' },
    'progress_update': { emoji: '📈', label: 'Progressi', color: '#22b8cf' },
    'insight': { emoji: '💡', label: 'Insight', color: '#fab005' },
    // Nuovi tipi per materiale completo
    'guide': { emoji: '📋', label: 'Guida', color: '#12b886' },
    'exercise': { emoji: '💪', label: 'Esercizio', color: '#fa5252' },
    'plan': { emoji: '🗺️', label: 'Piano', color: '#7950f2' }
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

export default function ScrivaniaNURPage() {
    const { user, isLoaded } = useUser()
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'resources' | 'messages' | 'material' | 'pinned'>('all')

    const fetchEntries = useCallback(async () => {
        if (!user) return

        try {
            // Escludiamo gli insight automatici - mostriamo solo contenuti creati da NUR intenzionalmente
            const { data, error } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('clerk_user_id', user.id)
                .not('entry_type', 'eq', 'insight') // Escludi insight automatici
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) {
                console.error('Error fetching journal:', error)
                return
            }

            console.log('[GIORNALE DEBUG] Raw data from DB:', data?.length, 'entries')
            console.log('[GIORNALE DEBUG] Entry types:', JSON.stringify(data?.map(e => ({ type: e.entry_type, title: e.title }))))
            console.log('[GIORNALE DEBUG] Current filter:', filter)

            let filtered = data || []

            // Applica filtri
            if (filter === 'resources') {
                filtered = filtered.filter(e =>
                    ['resource', 'article', 'quote'].includes(e.entry_type)
                )
            } else if (filter === 'messages') {
                filtered = filtered.filter(e =>
                    ['nur_message', 'reminder', 'reflection_prompt', 'challenge', 'suggestion'].includes(e.entry_type)
                )
            } else if (filter === 'material') {
                filtered = filtered.filter(e =>
                    ['guide', 'exercise', 'plan', 'suggestion'].includes(e.entry_type) || e.metadata?.is_material
                )
            } else if (filter === 'pinned') {
                filtered = filtered.filter(e => e.is_pinned)
            }

            setEntries(filtered)
        } catch (error) {
            console.error('Error fetching journal:', error)
        } finally {
            setLoading(false)
        }
    }, [user, filter])

    useEffect(() => {
        if (isLoaded && user) {
            fetchEntries()
        } else if (isLoaded && !user) {
            setLoading(false)
        }
    }, [isLoaded, user, fetchEntries])

    const togglePin = async (entryId: string) => {
        if (!user) return

        const entry = entries.find(e => e.id === entryId)
        if (!entry) return

        try {
            await supabase
                .from('journal_entries')
                .update({ is_pinned: !entry.is_pinned })
                .eq('id', entryId)

            setEntries(prev =>
                prev.map(e => e.id === entryId ? { ...e, is_pinned: !e.is_pinned } : e)
            )
        } catch (error) {
            console.error('Error toggling pin:', error)
        }
    }

    const deleteEntry = async (entryId: string) => {
        if (!user || !confirm('Vuoi eliminare questo contenuto?')) return

        try {
            await supabase
                .from('journal_entries')
                .delete()
                .eq('id', entryId)

            setEntries(prev => prev.filter(e => e.id !== entryId))
        } catch (error) {
            console.error('Error deleting entry:', error)
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (diffHours < 1) {
            const mins = Math.floor(diffMs / (1000 * 60))
            return mins <= 1 ? 'Adesso' : `${mins} min fa`
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)} ore fa`
        } else if (diffDays < 7) {
            return `${Math.floor(diffDays)} giorni fa`
        } else {
            return date.toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'short'
            })
        }
    }

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="scrivania-container">
                <div className="bg-gradient"></div>
                <div className="auth-prompt">
                    <h1>📋 Scrivania NUR</h1>
                    <p>Accedi per vedere i contenuti che NUR ha preparato per te</p>
                    <Link href="/" className="btn btn-primary">
                        Vai alla Home
                    </Link>
                </div>
            </div>
        )
    }

    const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Amico'
    const pinnedCount = entries.filter(e => e.is_pinned).length
    const resourcesCount = entries.filter(e => ['resource', 'article', 'quote'].includes(e.entry_type)).length

    return (
        <div className="scrivania-container">
            <div className="bg-gradient"></div>

            <header className="scrivania-header">
                <div className="header-left">
                    <Link href="/la-mia-vita" className="back-link">← Vita</Link>
                </div>
                <div className="header-center">
                    <span className="header-icon">📋</span>
                    <h1>Scrivania NUR</h1>
                </div>
                <div className="header-right">
                    <Link href="/chat" className="chat-link">💬</Link>
                </div>
            </header>

            <div className="scrivania-intro">
                <p>Ciao {userName}! Qui trovi tutto ciò che ho preparato per te.</p>
            </div>

            {/* Stats rapide */}
            <div className="quick-stats">
                <div className="stat-item">
                    <span className="stat-value">{entries.length}</span>
                    <span className="stat-label">Contenuti</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{resourcesCount}</span>
                    <span className="stat-label">Risorse</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{pinnedCount}</span>
                    <span className="stat-label">Salvati</span>
                </div>
            </div>

            {/* Filtri */}
            <div className="filter-section">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Tutto
                    </button>
                    <button
                        className={`filter-tab ${filter === 'material' ? 'active' : ''}`}
                        onClick={() => setFilter('material')}
                    >
                        📋 Guide
                    </button>
                    <button
                        className={`filter-tab ${filter === 'messages' ? 'active' : ''}`}
                        onClick={() => setFilter('messages')}
                    >
                        💬 Msg
                    </button>
                    <button
                        className={`filter-tab ${filter === 'pinned' ? 'active' : ''}`}
                        onClick={() => setFilter('pinned')}
                    >
                        📌 Salvati
                    </button>
                </div>
            </div>

            <main className="scrivania-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Carico la tua scrivania...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>
                            {filter === 'pinned'
                                ? 'Nessun contenuto salvato'
                                : filter === 'resources'
                                ? 'Nessuna risorsa ancora'
                                : filter === 'messages'
                                ? 'Nessun messaggio ancora'
                                : 'La tua scrivania è vuota'}
                        </h3>
                        <p>
                            Parla con me in chat e ti preparerò contenuti personalizzati!
                        </p>
                        <Link href="/chat" className="btn btn-primary">
                            💬 Parla con NUR
                        </Link>
                    </div>
                ) : (
                    <div className="entries-grid">
                        {entries.map(entry => {
                            const config = entryTypeConfig[entry.entry_type] || {
                                emoji: '📝',
                                label: 'Nota',
                                color: '#868e96'
                            }

                            return (
                                <article
                                    key={entry.id}
                                    className={`entry-card ${entry.is_pinned ? 'pinned' : ''}`}
                                    style={{ '--entry-color': config.color } as React.CSSProperties}
                                >
                                    {entry.is_pinned && <div className="pinned-badge">📌</div>}

                                    <div className="entry-header">
                                        <div className="entry-type">
                                            <span className="type-emoji">{config.emoji}</span>
                                            <span className="type-label">{config.label}</span>
                                        </div>
                                        <span className="entry-time">{formatDate(entry.created_at)}</span>
                                    </div>

                                    {entry.title && (
                                        <h3 className="entry-title">{entry.title}</h3>
                                    )}

                                    <div className={`entry-content ${entry.content.length > 200 ? 'expandable' : ''}`}>
                                        {entry.content.split('\n').map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>

                                    {entry.area_related && (
                                        <div className="entry-area">
                                            {areaEmojis[entry.area_related]} {entry.area_related}
                                        </div>
                                    )}

                                    <div className="entry-actions">
                                        <button
                                            className={`action-btn ${entry.is_pinned ? 'active' : ''}`}
                                            onClick={() => togglePin(entry.id)}
                                        >
                                            {entry.is_pinned ? '📌 Salvato' : '📌 Salva'}
                                        </button>

                                        {(entry.entry_type === 'challenge' || entry.entry_type === 'reflection_prompt' || entry.entry_type === 'suggestion') && (
                                            <Link
                                                href={`/chat?context=${encodeURIComponent(`Parliamo di: ${entry.content}`)}`}
                                                className="action-btn primary"
                                            >
                                                💬 Parliamone
                                            </Link>
                                        )}

                                        <button
                                            className="action-btn delete"
                                            onClick={() => deleteEntry(entry.id)}
                                            title="Elimina"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <Link href="/" className="nav-item">
                    <span className="nav-icon">🏠</span>
                    <span className="nav-label">Home</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">Chat</span>
                </Link>
                <Link href="/obiettivi" className="nav-item">
                    <span className="nav-icon">🎯</span>
                    <span className="nav-label">Obiettivi</span>
                </Link>
                <Link href="/giornale" className="nav-item active">
                    <span className="nav-icon">📋</span>
                    <span className="nav-label">Scrivania</span>
                </Link>
                <Link href="/la-mia-vita" className="nav-item">
                    <span className="nav-icon">🌌</span>
                    <span className="nav-label">Vita</span>
                </Link>
            </nav>
        </div>
    )
}
