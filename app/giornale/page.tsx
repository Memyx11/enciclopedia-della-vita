'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
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

const entryTypeConfig: Record<string, { emoji: string; label: string; color: string }> = {
    'nur_message': { emoji: '💬', label: 'Da NUR', color: '#845ef7' },
    'insight': { emoji: '💡', label: 'Insight', color: '#fab005' },
    'achievement': { emoji: '🏆', label: 'Traguardo', color: '#51cf66' },
    'suggestion': { emoji: '✨', label: 'Suggerimento', color: '#339af0' },
    'reminder': { emoji: '🔔', label: 'Promemoria', color: '#ff922b' },
    'article': { emoji: '📖', label: 'Articolo', color: '#868e96' },
    'reflection_prompt': { emoji: '🤔', label: 'Riflessione', color: '#cc5de8' },
    'weekly_summary': { emoji: '📊', label: 'Riepilogo', color: '#20c997' },
    'progress_update': { emoji: '📈', label: 'Progressi', color: '#22b8cf' },
    'challenge': { emoji: '🎯', label: 'Sfida', color: '#f783ac' },
    'quote': { emoji: '💭', label: 'Citazione', color: '#adb5bd' }
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

export default function GiornalePage() {
    const { user, isLoaded } = useUser()
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [unreadCount, setUnreadCount] = useState(0)
    const [filter, setFilter] = useState<'all' | 'unread' | 'pinned'>('all')
    const [generating, setGenerating] = useState(false)

    const fetchEntries = useCallback(async () => {
        if (!user) return

        try {
            const includeRead = filter !== 'unread'
            const response = await fetch(
                `/api/journal?userId=${user.id}&includeRead=${includeRead}&limit=50`
            )
            const data = await response.json()

            if (data.success) {
                let filtered = data.entries || []
                if (filter === 'pinned') {
                    filtered = filtered.filter((e: JournalEntry) => e.is_pinned)
                }
                setEntries(filtered)
            }
        } catch (error) {
            console.error('Error fetching journal:', error)
        } finally {
            setLoading(false)
        }
    }, [user, filter])

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return

        try {
            const response = await fetch(
                `/api/journal?userId=${user.id}&action=unread_count`
            )
            const data = await response.json()
            if (data.success) {
                setUnreadCount(data.count)
            }
        } catch (error) {
            console.error('Error fetching unread count:', error)
        }
    }, [user])

    useEffect(() => {
        if (isLoaded && user) {
            fetchEntries()
            fetchUnreadCount()
        }
    }, [isLoaded, user, fetchEntries, fetchUnreadCount])

    const markAsSeen = async (entryId: string) => {
        if (!user) return

        try {
            await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    action: 'mark_seen',
                    entryId
                })
            })

            setEntries(prev =>
                prev.map(e => e.id === entryId ? { ...e, is_seen: true } : e)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Error marking as seen:', error)
        }
    }

    const markAllSeen = async () => {
        if (!user) return

        try {
            await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    action: 'mark_all_seen'
                })
            })

            setEntries(prev => prev.map(e => ({ ...e, is_seen: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Error marking all as seen:', error)
        }
    }

    const togglePin = async (entryId: string) => {
        if (!user) return

        try {
            await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    action: 'toggle_pin',
                    entryId
                })
            })

            setEntries(prev =>
                prev.map(e => e.id === entryId ? { ...e, is_pinned: !e.is_pinned } : e)
            )
        } catch (error) {
            console.error('Error toggling pin:', error)
        }
    }

    const generateDaily = async () => {
        if (!user || generating) return

        setGenerating(true)
        try {
            const response = await fetch(
                `/api/journal?userId=${user.id}&action=generate_daily`
            )
            const data = await response.json()

            if (data.success && data.entry) {
                setEntries(prev => [data.entry, ...prev])
            }
        } catch (error) {
            console.error('Error generating daily:', error)
        } finally {
            setGenerating(false)
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
            return `${mins} min fa`
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
            <div className="journal-container">
                <div className="bg-gradient"></div>
                <div className="auth-prompt">
                    <h1>📰 Il Tuo Giornale</h1>
                    <p>Accedi per vedere i tuoi messaggi personalizzati da NUR</p>
                    <Link href="/" className="btn btn-primary">
                        Vai alla Home
                    </Link>
                </div>
            </div>
        )
    }

    const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Amico'

    return (
        <div className="journal-container">
            <div className="bg-gradient"></div>

            <header className="journal-header">
                <div className="header-left">
                    <Link href="/" className="back-link">← Home</Link>
                </div>
                <div className="header-center">
                    <span className="header-icon">📰</span>
                    <h1>Il Tuo Giornale</h1>
                </div>
                <div className="header-right">
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                    )}
                </div>
            </header>

            <div className="journal-greeting">
                <h2>Ciao {userName}!</h2>
                <p>Ecco cosa NUR ha da dirti oggi</p>
            </div>

            <div className="journal-actions">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Tutti
                    </button>
                    <button
                        className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        Non letti {unreadCount > 0 && `(${unreadCount})`}
                    </button>
                    <button
                        className={`filter-tab ${filter === 'pinned' ? 'active' : ''}`}
                        onClick={() => setFilter('pinned')}
                    >
                        📌 Salvati
                    </button>
                </div>

                <div className="action-buttons">
                    {unreadCount > 0 && (
                        <button className="action-btn" onClick={markAllSeen}>
                            ✓ Segna tutti letti
                        </button>
                    )}
                    <button
                        className="action-btn primary"
                        onClick={generateDaily}
                        disabled={generating}
                    >
                        {generating ? '⏳ Generando...' : '✨ Messaggio da NUR'}
                    </button>
                </div>
            </div>

            <main className="journal-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Carico il tuo giornale...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📰</div>
                        <h3>
                            {filter === 'unread'
                                ? 'Tutto letto!'
                                : filter === 'pinned'
                                ? 'Nessun messaggio salvato'
                                : 'Il tuo giornale è vuoto'}
                        </h3>
                        <p>
                            {filter === 'all'
                                ? 'Inizia a parlare con NUR per ricevere messaggi personalizzati'
                                : 'Torna alla vista "Tutti" per vedere i messaggi'}
                        </p>
                        <Link href="/chat" className="btn btn-primary">
                            💬 Parla con NUR
                        </Link>
                    </div>
                ) : (
                    <div className="entries-list">
                        {entries.map(entry => {
                            const config = entryTypeConfig[entry.entry_type] || {
                                emoji: '📝',
                                label: 'Nota',
                                color: '#868e96'
                            }

                            return (
                                <article
                                    key={entry.id}
                                    className={`journal-entry ${!entry.is_seen ? 'unread' : ''} ${entry.is_pinned ? 'pinned' : ''}`}
                                    onClick={() => !entry.is_seen && markAsSeen(entry.id)}
                                    style={{ '--entry-color': config.color } as React.CSSProperties}
                                >
                                    <div className="entry-header">
                                        <div className="entry-type">
                                            <span className="type-emoji">{config.emoji}</span>
                                            <span className="type-label">{config.label}</span>
                                        </div>
                                        <div className="entry-meta">
                                            {entry.area_related && (
                                                <span className="entry-area">
                                                    {areaEmojis[entry.area_related]} {entry.area_related}
                                                </span>
                                            )}
                                            <span className="entry-time">{formatDate(entry.created_at)}</span>
                                        </div>
                                    </div>

                                    {entry.title && (
                                        <h3 className="entry-title">{entry.title}</h3>
                                    )}

                                    <p className="entry-content">{entry.content}</p>

                                    <div className="entry-actions">
                                        <button
                                            className={`pin-btn ${entry.is_pinned ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                togglePin(entry.id)
                                            }}
                                        >
                                            📌 {entry.is_pinned ? 'Salvato' : 'Salva'}
                                        </button>
                                        {entry.entry_type === 'suggestion' || entry.entry_type === 'challenge' ? (
                                            <Link
                                                href={`/chat?context=${encodeURIComponent(entry.content)}`}
                                                className="action-link"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                💬 Parlane con NUR
                                            </Link>
                                        ) : null}
                                    </div>

                                    {!entry.is_seen && <div className="unread-indicator"></div>}
                                    {entry.is_pinned && <div className="pinned-indicator">📌</div>}
                                </article>
                            )
                        })}
                    </div>
                )}
            </main>

            <nav className="journal-nav">
                <Link href="/" className="nav-item">
                    <span className="nav-icon">🏠</span>
                    <span className="nav-label">Home</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">Chat</span>
                </Link>
                <Link href="/giornale" className="nav-item active">
                    <span className="nav-icon">📰</span>
                    <span className="nav-label">Giornale</span>
                </Link>
                <Link href="/la-mia-vita" className="nav-item">
                    <span className="nav-icon">🌌</span>
                    <span className="nav-label">Vita</span>
                </Link>
            </nav>
        </div>
    )
}
