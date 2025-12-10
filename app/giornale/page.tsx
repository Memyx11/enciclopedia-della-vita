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
    is_pinned: boolean
    created_at: string
    metadata?: Record<string, any>
}

// Categorie di materiali
const MATERIAL_CATEGORIES = {
    books: { emoji: '📚', label: 'Libri', types: ['book', 'libro'] },
    articles: { emoji: '📰', label: 'Articoli', types: ['article', 'articolo'] },
    guides: { emoji: '📋', label: 'Guide', types: ['guide', 'guida'] },
    docs: { emoji: '📄', label: 'Documenti', types: ['doc', 'document', 'documento'] },
    videos: { emoji: '🎬', label: 'Video', types: ['video'] },
    exercises: { emoji: '💪', label: 'Esercizi', types: ['exercise', 'esercizio'] },
    resources: { emoji: '🔗', label: 'Risorse', types: ['resource', 'risorsa'] },
    notes: { emoji: '📝', label: 'Note NUR', types: ['nur_message', 'suggestion', 'reminder', 'insight'] }
}

const areaConfig: Record<string, { emoji: string; label: string; color: string }> = {
    'salute': { emoji: '💪', label: 'Salute', color: '#51cf66' },
    'soldi': { emoji: '💰', label: 'Soldi', color: '#ffd43b' },
    'relazioni': { emoji: '❤️', label: 'Relazioni', color: '#ff6b6b' },
    'lavoro': { emoji: '💼', label: 'Lavoro', color: '#339af0' },
    'hobby': { emoji: '🎨', label: 'Hobby', color: '#cc5de8' },
    'crescita': { emoji: '📚', label: 'Crescita', color: '#845ef7' },
    'casa': { emoji: '🏠', label: 'Casa', color: '#20c997' },
    'sociale': { emoji: '👥', label: 'Sociale', color: '#f783ac' },
    'spirituale': { emoji: '🧘', label: 'Spirituale', color: '#fab005' },
    'futuro': { emoji: '🎯', label: 'Futuro', color: '#fd7e14' }
}

export default function ScrivaniaPage() {
    const { user, isLoaded } = useUser()
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedArea, setSelectedArea] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

    const fetchEntries = useCallback(async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('clerk_user_id', user.id)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) {
                console.error('Error fetching journal:', error)
                return
            }

            setEntries(data || [])
        } catch (error) {
            console.error('Error fetching journal:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

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

        await supabase
            .from('journal_entries')
            .update({ is_pinned: !entry.is_pinned })
            .eq('id', entryId)

        setEntries(prev =>
            prev.map(e => e.id === entryId ? { ...e, is_pinned: !e.is_pinned } : e)
        )
    }

    const deleteEntry = async (entryId: string) => {
        if (!user || !confirm('Eliminare questo contenuto?')) return

        await supabase
            .from('journal_entries')
            .delete()
            .eq('id', entryId)

        setEntries(prev => prev.filter(e => e.id !== entryId))
    }

    // Raggruppa per area
    const entriesByArea = entries.reduce((acc, entry) => {
        const area = entry.area_related || 'generale'
        if (!acc[area]) acc[area] = []
        acc[area].push(entry)
        return acc
    }, {} as Record<string, JournalEntry[]>)

    // Trova la categoria di un entry
    const getEntryCategory = (entry: JournalEntry): string => {
        for (const [key, config] of Object.entries(MATERIAL_CATEGORIES)) {
            if (config.types.includes(entry.entry_type)) {
                return key
            }
        }
        return 'notes'
    }

    // Filtra entries
    const filteredEntries = entries.filter(entry => {
        if (selectedArea && entry.area_related !== selectedArea) return false
        if (selectedCategory) {
            const cat = getEntryCategory(entry)
            if (cat !== selectedCategory) return false
        }
        return true
    })

    // Conta per area
    const areaCounts = Object.entries(entriesByArea).map(([area, items]) => ({
        area,
        count: items.length,
        config: areaConfig[area] || { emoji: '📁', label: area, color: '#868e96' }
    })).sort((a, b) => b.count - a.count)

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="scrivania-page">
                <div className="bg-gradient"></div>
                <div className="auth-prompt">
                    <div className="auth-icon">📚</div>
                    <h1>La Tua Scrivania</h1>
                    <p>Accedi per vedere i materiali che NUR ha raccolto per te</p>
                    <Link href="/" className="btn-primary">Vai alla Home</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="scrivania-page">
            <div className="bg-gradient"></div>

            {/* Header */}
            <header className="scrivania-header">
                <Link href="/la-mia-vita" className="back-btn">←</Link>
                <h1>📚 Scrivania</h1>
                <Link href="/chat" className="chat-btn">💬</Link>
            </header>

            {/* Intro */}
            <div className="scrivania-intro">
                <p>Materiali che NUR ha selezionato per la tua crescita</p>
            </div>

            {/* Aree della vita - Filtri orizzontali */}
            <div className="areas-filter">
                <button
                    className={`area-chip ${!selectedArea ? 'active' : ''}`}
                    onClick={() => setSelectedArea(null)}
                >
                    Tutto ({entries.length})
                </button>
                {areaCounts.map(({ area, count, config }) => (
                    <button
                        key={area}
                        className={`area-chip ${selectedArea === area ? 'active' : ''}`}
                        onClick={() => setSelectedArea(selectedArea === area ? null : area)}
                        style={{ '--chip-color': config.color } as React.CSSProperties}
                    >
                        {config.emoji} {config.label} ({count})
                    </button>
                ))}
            </div>

            {/* Categorie materiali */}
            <div className="category-tabs">
                <button
                    className={`cat-tab ${!selectedCategory ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(null)}
                >
                    Tutti
                </button>
                {Object.entries(MATERIAL_CATEGORIES).map(([key, config]) => {
                    const count = entries.filter(e => getEntryCategory(e) === key).length
                    if (count === 0) return null
                    return (
                        <button
                            key={key}
                            className={`cat-tab ${selectedCategory === key ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                        >
                            {config.emoji} {config.label}
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            <main className="scrivania-main">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Carico i tuoi materiali...</p>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📚</div>
                        <h3>Nessun materiale ancora</h3>
                        <p>Parla con NUR e ti consiglierà libri, articoli e risorse personalizzate per te!</p>
                        <Link href="/chat" className="btn-primary">
                            💬 Parla con NUR
                        </Link>
                    </div>
                ) : (
                    <div className="materials-list">
                        {filteredEntries.map(entry => {
                            const category = getEntryCategory(entry)
                            const catConfig = MATERIAL_CATEGORIES[category as keyof typeof MATERIAL_CATEGORIES]
                            const areaConf = entry.area_related ? areaConfig[entry.area_related] : null
                            const isExpanded = expandedEntry === entry.id

                            return (
                                <article
                                    key={entry.id}
                                    className={`material-card ${entry.is_pinned ? 'pinned' : ''} ${isExpanded ? 'expanded' : ''}`}
                                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                                >
                                    {/* Header */}
                                    <div className="material-header">
                                        <div className="material-type">
                                            <span className="type-emoji">{catConfig?.emoji || '📝'}</span>
                                            <span className="type-label">{catConfig?.label || 'Nota'}</span>
                                        </div>
                                        {entry.is_pinned && <span className="pin-badge">📌</span>}
                                        {areaConf && (
                                            <span
                                                className="area-tag"
                                                style={{ background: areaConf.color + '20', color: areaConf.color }}
                                            >
                                                {areaConf.emoji} {areaConf.label}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title */}
                                    {entry.title && (
                                        <h3 className="material-title">{entry.title}</h3>
                                    )}

                                    {/* Content Preview / Full */}
                                    <div className={`material-content ${isExpanded ? 'full' : 'preview'}`}>
                                        {entry.content.split('\n').map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>

                                    {/* Expand hint */}
                                    {!isExpanded && entry.content.length > 150 && (
                                        <div className="expand-hint">Tocca per leggere tutto →</div>
                                    )}

                                    {/* Actions - solo quando espanso */}
                                    {isExpanded && (
                                        <div className="material-actions" onClick={e => e.stopPropagation()}>
                                            <button
                                                className={`action-btn ${entry.is_pinned ? 'active' : ''}`}
                                                onClick={() => togglePin(entry.id)}
                                            >
                                                {entry.is_pinned ? '📌 Salvato' : '📌 Salva'}
                                            </button>
                                            <Link
                                                href={`/chat?context=${encodeURIComponent(`Parliamo di: ${entry.title || entry.content.slice(0, 50)}`)}`}
                                                className="action-btn primary"
                                            >
                                                💬 Approfondisci
                                            </Link>
                                            <button
                                                className="action-btn delete"
                                                onClick={() => deleteEntry(entry.id)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Floating button per chiedere materiali */}
            <Link href="/chat?context=Suggeriscimi%20qualcosa%20da%20leggere" className="fab-suggest">
                <span>✨</span>
                <span className="fab-text">Suggeriscimi</span>
            </Link>

            {/* Bottom Nav */}
            <nav className="bottom-nav">
                <Link href="/la-mia-vita" className="nav-item">
                    <span className="nav-icon">🏠</span>
                    <span className="nav-label">Dashboard</span>
                </Link>
                <Link href="/chat" className="nav-item">
                    <span className="nav-icon">💬</span>
                    <span className="nav-label">Chat</span>
                </Link>
                <Link href="/giornale" className="nav-item active">
                    <span className="nav-icon">📚</span>
                    <span className="nav-label">Scrivania</span>
                </Link>
            </nav>
        </div>
    )
}
