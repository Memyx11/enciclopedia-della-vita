'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import './chat.css'

interface Message {
    id?: string
    content: string
    role: 'user' | 'assistant'
    timestamp: string
    saved?: boolean
    metadata?: {
        sentiment?: string
        area_detected?: string
        contains_solution?: boolean
    }
}

interface Conversation {
    id: string
    title?: string
    area_related?: string
}

function ChatContent() {
    const { user, isLoaded } = useUser()
    const searchParams = useSearchParams()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [status, setStatus] = useState<'ready' | 'thinking' | 'error'>('ready')
    const [statusText, setStatusText] = useState('NUR è pronta')
    const [loading, setLoading] = useState(true)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [currentArea, setCurrentArea] = useState<string | null>(null)
    const [insightsCount, setInsightsCount] = useState(0)
    const chatRef = useRef<HTMLDivElement>(null)
    const initRef = useRef(false)

    // Inizializza utente se necessario
    const initializeUserIfNeeded = useCallback(async () => {
        if (!user || initRef.current) return
        initRef.current = true

        try {
            // Controlla se l'utente esiste già
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('clerk_user_id', user.id)
                .maybeSingle()

            if (!profile) {
                // Inizializza l'utente
                await fetch('/api/user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        action: 'init',
                        data: {
                            email: user.emailAddresses[0]?.emailAddress,
                            fullName: user.fullName || user.firstName
                        }
                    })
                })
            }
        } catch (error) {
            console.error('Init error:', error)
        }
    }, [user])

    // Carica messaggi esistenti
    const loadMessages = useCallback(async () => {
        if (!user) return

        try {
            // Prendi l'ultima conversazione attiva
            const { data: conv } = await supabase
                .from('conversations')
                .select('id, title, area_related')
                .eq('clerk_user_id', user.id)
                .eq('status', 'active')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (conv) {
                setConversationId(conv.id)
                setCurrentArea(conv.area_related || null)

                // Carica i messaggi
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: true })
                    .limit(100)

                if (msgs && msgs.length > 0) {
                    const formattedMessages = msgs.map(msg => ({
                        id: msg.id,
                        content: msg.content,
                        role: msg.role as 'user' | 'assistant',
                        timestamp: new Date(msg.created_at).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        metadata: {
                            sentiment: msg.sentiment,
                            area_detected: msg.area_type
                        }
                    }))
                    setMessages(formattedMessages)
                }
            }
        } catch (err) {
            console.error('Load error:', err)
        }

        setLoading(false)
    }, [user])

    useEffect(() => {
        if (isLoaded && user) {
            initializeUserIfNeeded()
            loadMessages()
        } else if (isLoaded && !user) {
            setLoading(false)
        }
    }, [isLoaded, user, initializeUserIfNeeded, loadMessages])

    // Gestisci parametri URL (context da altre pagine)
    useEffect(() => {
        const context = searchParams.get('context')
        const area = searchParams.get('area')

        if (context) {
            setInput(context)
        }
        if (area) {
            setCurrentArea(area)
        }
    }, [searchParams])

    // Auto-scroll
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight
        }
    }, [messages])

    const getTimestamp = () => {
        return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    }

    const sendMessage = async () => {
        if (!input.trim() || !user) return

        const userContent = input.trim()
        const userMessage: Message = {
            content: userContent,
            role: 'user',
            timestamp: getTimestamp()
        }

        // Aggiungi subito alla UI
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setStatus('thinking')
        setStatusText('NUR sta pensando...')

        try {
            // Prepara la storia recente
            const recentHistory = messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }))

            // Chiama la nuova API NUR
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userContent,
                    userId: user.id,
                    history: recentHistory,
                    conversationId,
                    area: currentArea
                })
            })

            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Errore API')
            }

            const nurContent = data.response
            const nurMessage: Message = {
                content: nurContent,
                role: 'assistant',
                timestamp: getTimestamp(),
                metadata: data.metadata
            }

            // Aggiorna conversationId se è nuova
            if (data.conversation_id && !conversationId) {
                setConversationId(data.conversation_id)
            }

            // Aggiorna area se rilevata
            if (data.metadata?.area_detected) {
                setCurrentArea(data.metadata.area_detected)
            }

            // Aggiorna conteggio insights
            if (data.insights_extracted > 0) {
                setInsightsCount(prev => prev + data.insights_extracted)
            }

            // Aggiungi alla UI
            setMessages(prev => [...prev, nurMessage])

            setStatus('ready')
            setStatusText('NUR è pronta')
        } catch (error) {
            console.error('Send error:', error)
            const errorMessage: Message = {
                content: 'Ops, qualcosa non va. Riprova tra un attimo.',
                role: 'assistant',
                timestamp: getTimestamp()
            }
            setMessages(prev => [...prev, errorMessage])
            setStatus('error')
            setStatusText('Errore connessione')
        }
    }

    const saveSolution = async (content: string, index: number) => {
        if (!user) return

        const lines = content.split('\n').filter(r => r.trim())
        const title = lines[0] ? lines[0].substring(0, 80).replace(/[^a-zA-Z0-9àèéìòù\s]/gi, '').trim() : 'Piano'
        const steps = lines.filter(r => /^[\d\-\•]/.test(r.trim())).map(r => r.replace(/^[\d\-\•]+\.?\s*/, '').trim())

        const solution = {
            clerk_user_id: user.id,
            conversation_id: conversationId,
            title: title || 'Piano suggerito da NUR',
            description: content.substring(0, 200),
            steps: steps.length > 0 ? steps : [content],
            status: 'proposta',
            area_type: currentArea || 'generale',
            progress: 0
        }

        const { error } = await supabase.from('solutions').insert([solution])

        if (!error) {
            setMessages(prev => prev.map((msg, i) =>
                i === index ? { ...msg, saved: true } : msg
            ))
        }
    }

    const startNewConversation = async () => {
        if (!user) return

        // Archivia la conversazione corrente
        if (conversationId) {
            await supabase
                .from('conversations')
                .update({ status: 'archived' })
                .eq('id', conversationId)
        }

        // Reset
        setConversationId(null)
        setMessages([])
        setCurrentArea(null)
    }

    if (!isLoaded) return null

    if (!user) {
        return (
            <div className="chat-page">
                <div className="bg-gradient"></div>
                <div className="auth-prompt">
                    <div className="nur-avatar large">💜</div>
                    <h1>Ciao! Sono NUR</h1>
                    <p>Accedi per iniziare a parlare con me</p>
                    <Link href="/" className="btn btn-primary">
                        Vai alla Home
                    </Link>
                </div>
            </div>
        )
    }

    const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Amico'

    return (
        <div className="chat-page">
            <div className="bg-gradient"></div>

            <header className="chat-header">
                <div className="header-left">
                    <Link href="/" className="back-link">←</Link>
                    <div className="nur-info">
                        <div className="nur-avatar">💜</div>
                        <div className="nur-details">
                            <span className="nur-name">NUR</span>
                            <span className="nur-status">
                                <span className={`status-dot ${status}`}></span>
                                {statusText}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="header-right">
                    <button
                        className="header-btn"
                        onClick={startNewConversation}
                        title="Nuova conversazione"
                    >
                        ✨
                    </button>
                    <Link href="/giornale" className="header-btn" title="Giornale">
                        📰
                    </Link>
                    <Link href="/la-mia-vita" className="header-btn" title="La Mia Vita">
                        🌌
                    </Link>
                </div>
            </header>

            {currentArea && (
                <div className="area-context-bar">
                    <span className="area-label">Parlando di:</span>
                    <span className="area-tag">{currentArea}</span>
                    <button
                        className="clear-area"
                        onClick={() => setCurrentArea(null)}
                    >
                        ✕
                    </button>
                </div>
            )}

            <main className="chat-main" ref={chatRef}>
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Carico la nostra storia...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="welcome-screen">
                        <div className="nur-avatar large">💜</div>
                        <h2>Ciao {userName}!</h2>
                        <p className="welcome-text">
                            Sono NUR, la tua guida personale. Non sono un bot qualunque -
                            sono qui per aiutarti davvero, con onestà e (a volte) un po' di sana provocazione.
                        </p>
                        <p className="welcome-sub">Di cosa vuoi parlare?</p>
                        <div className="starter-prompts">
                            <button onClick={() => setInput('Come stai oggi?')}>
                                👋 Salutami
                            </button>
                            <button onClick={() => setInput('Ho bisogno di un consiglio')}>
                                💡 Consiglio
                            </button>
                            <button onClick={() => setInput('Mi sento bloccato in questo periodo')}>
                                🤔 Mi sento bloccato
                            </button>
                            <button onClick={() => setInput('Aiutami a fare un piano')}>
                                📋 Fare un piano
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="messages-container">
                        {messages.map((msg, i) => (
                            <div key={i} className={`message ${msg.role}`}>
                                {msg.role === 'assistant' && (
                                    <div className="message-avatar">💜</div>
                                )}
                                <div className="message-content">
                                    <div className="message-bubble">
                                        {msg.content}
                                    </div>
                                    <div className="message-meta">
                                        <span className="message-time">{msg.timestamp}</span>
                                        {msg.metadata?.area_detected && (
                                            <span className="message-area">
                                                {msg.metadata.area_detected}
                                            </span>
                                        )}
                                    </div>
                                    {msg.role === 'assistant' && (
                                        <div className="message-actions">
                                            {!msg.saved ? (
                                                <button
                                                    className="action-btn"
                                                    onClick={() => saveSolution(msg.content, i)}
                                                >
                                                    💾 Salva piano
                                                </button>
                                            ) : (
                                                <Link href="/soluzioni" className="action-btn saved">
                                                    ✅ Salvato
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="message-avatar user">
                                        {userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}

                        {status === 'thinking' && (
                            <div className="message assistant">
                                <div className="message-avatar">💜</div>
                                <div className="message-content">
                                    <div className="message-bubble typing">
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="chat-footer">
                {insightsCount > 0 && (
                    <div className="insights-indicator">
                        💡 {insightsCount} cose imparate su di te
                    </div>
                )}
                <div className="input-container">
                    <input
                        type="text"
                        placeholder="Scrivi a NUR..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                sendMessage()
                            }
                        }}
                        disabled={status === 'thinking'}
                    />
                    <button
                        className="send-btn"
                        onClick={sendMessage}
                        disabled={status === 'thinking' || !input.trim()}
                    >
                        {status === 'thinking' ? (
                            <span className="sending">...</span>
                        ) : (
                            <span>→</span>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    )
}

function ChatLoading() {
    return (
        <div className="chat-page">
            <div className="bg-gradient"></div>
            <div className="loading-state" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loading-spinner"></div>
                <p>Caricamento...</p>
            </div>
        </div>
    )
}

export default function ChatPage() {
    return (
        <Suspense fallback={<ChatLoading />}>
            <ChatContent />
        </Suspense>
    )
}
