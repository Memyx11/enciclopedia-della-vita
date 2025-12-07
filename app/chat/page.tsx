'use client'

import { useEffect, useLayoutEffect, useState, useRef, Suspense } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { AIDisclaimer, useAIDisclaimer } from '@/components/legal/AIDisclaimer'
import './chat.css'

interface Message {
    id?: string
    content: string
    role: 'user' | 'assistant'
    timestamp: string
    saved?: boolean
    isStreaming?: boolean
    metadata?: {
        sentiment?: string
        area_detected?: string
        contains_solution?: boolean
    }
}

// Funzione per renderizzare Markdown semplice
function renderMarkdown(text: string): JSX.Element {
    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let listItems: string[] = []
    let listType: 'ul' | 'ol' | null = null

    const processInlineFormatting = (line: string): JSX.Element => {
        // Processa **grassetto**, *corsivo*, `code`
        const parts: (string | JSX.Element)[] = []
        let remaining = line
        let key = 0

        while (remaining.length > 0) {
            // Grassetto **text**
            const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
            // Corsivo *text*
            const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
            // Code `text`
            const codeMatch = remaining.match(/`(.+?)`/)

            const matches = [
                boldMatch ? { match: boldMatch, type: 'bold', index: boldMatch.index! } : null,
                italicMatch ? { match: italicMatch, type: 'italic', index: italicMatch.index! } : null,
                codeMatch ? { match: codeMatch, type: 'code', index: codeMatch.index! } : null
            ].filter(Boolean).sort((a, b) => a!.index - b!.index)

            if (matches.length === 0) {
                parts.push(remaining)
                break
            }

            const first = matches[0]!
            if (first.index > 0) {
                parts.push(remaining.substring(0, first.index))
            }

            if (first.type === 'bold') {
                parts.push(<strong key={key++}>{first.match[1]}</strong>)
            } else if (first.type === 'italic') {
                parts.push(<em key={key++}>{first.match[1]}</em>)
            } else if (first.type === 'code') {
                parts.push(<code key={key++} className="inline-code">{first.match[1]}</code>)
            }

            remaining = remaining.substring(first.index + first.match[0].length)
        }

        return <>{parts}</>
    }

    const flushList = () => {
        if (listItems.length > 0 && listType) {
            const ListTag = listType
            elements.push(
                <ListTag key={elements.length} className={`md-${listType}`}>
                    {listItems.map((item, i) => (
                        <li key={i}>{processInlineFormatting(item)}</li>
                    ))}
                </ListTag>
            )
            listItems = []
            listType = null
        }
    }

    lines.forEach((line, i) => {
        const trimmed = line.trim()

        // Linea vuota
        if (!trimmed) {
            flushList()
            return
        }

        // Citazione > text
        if (trimmed.startsWith('> ')) {
            flushList()
            elements.push(
                <blockquote key={elements.length} className="md-quote">
                    {processInlineFormatting(trimmed.substring(2))}
                </blockquote>
            )
            return
        }

        // Lista numerata 1. 2. 3.
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
        if (numberedMatch) {
            if (listType !== 'ol') {
                flushList()
                listType = 'ol'
            }
            listItems.push(numberedMatch[2])
            return
        }

        // Lista puntata - o •
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            if (listType !== 'ul') {
                flushList()
                listType = 'ul'
            }
            listItems.push(trimmed.substring(2))
            return
        }

        // Heading ### ## #
        if (trimmed.startsWith('### ')) {
            flushList()
            elements.push(<h4 key={elements.length} className="md-h3">{trimmed.substring(4)}</h4>)
            return
        }
        if (trimmed.startsWith('## ')) {
            flushList()
            elements.push(<h3 key={elements.length} className="md-h2">{trimmed.substring(3)}</h3>)
            return
        }
        if (trimmed.startsWith('# ')) {
            flushList()
            elements.push(<h2 key={elements.length} className="md-h1">{trimmed.substring(2)}</h2>)
            return
        }

        // Testo normale
        flushList()
        elements.push(<p key={elements.length} className="md-p">{processInlineFormatting(trimmed)}</p>)
    })

    flushList()

    return <div className="markdown-content">{elements}</div>
}

function ChatContent() {
    const { user, isLoaded } = useUser()
    const searchParams = useSearchParams()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [status, setStatus] = useState<'ready' | 'thinking' | 'streaming' | 'error'>('ready')
    const [statusText, setStatusText] = useState('NUR è pronta')
    const [loading, setLoading] = useState(true)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [currentArea, setCurrentArea] = useState<string | null>(null)
    const [insightsCount, setInsightsCount] = useState(0)
    const chatRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // AI Disclaimer
    const { showDisclaimer, acceptDisclaimer } = useAIDisclaimer()

    // Carica dati utente e messaggi
    useEffect(() => {
        if (!isLoaded) return

        if (!user) {
            setLoading(false)
            return
        }

        const loadData = async () => {
            try {
                // 1. Inizializza utente se necessario
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('clerk_user_id', user.id)
                    .maybeSingle()

                if (!profile) {
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

                // 2. Carica l'ultima conversazione attiva
                const { data: conv, error: convError } = await supabase
                    .from('conversations')
                    .select('id, title, area_related')
                    .eq('clerk_user_id', user.id)
                    .eq('status', 'active')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (convError) {
                    console.error('Conv load error:', convError)
                }

                if (conv) {
                    setConversationId(conv.id)
                    setCurrentArea(conv.area_related || null)

                    // 3. Carica gli ULTIMI 100 messaggi della conversazione
                    // Ordiniamo DESC per prendere i più recenti, poi invertiamo per mostrarli cronologicamente
                    const { data: msgs, error: msgsError } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false })
                        .limit(100)

                    if (msgsError) {
                        console.error('Messages load error:', msgsError)
                    }

                    // Inverti per ordine cronologico (dal più vecchio al più recente)
                    const sortedMsgs = msgs ? [...msgs].reverse() : []

                    if (sortedMsgs.length > 0) {
                        const formattedMessages = sortedMsgs.map(msg => ({
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
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [isLoaded, user])

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

    // Ref per sapere se è il primo caricamento
    const hasScrolledInitially = useRef(false)

    // Scroll iniziale dopo caricamento - va all'ultimo messaggio
    // useLayoutEffect per eseguire PRIMA del paint del browser
    useLayoutEffect(() => {
        if (!loading && messages.length > 0 && !hasScrolledInitially.current) {
            hasScrolledInitially.current = true

            // Piccolo timeout per assicurarsi che il DOM sia pronto
            const timer = setTimeout(() => {
                if (chatRef.current) {
                    // Scrolla direttamente il container al fondo
                    chatRef.current.scrollTop = chatRef.current.scrollHeight
                }
            }, 50)

            return () => clearTimeout(timer)
        }
    }, [loading, messages.length])

    // Auto-scroll quando arrivano nuovi messaggi (dopo il primo caricamento)
    useEffect(() => {
        if (messages.length === 0 || !hasScrolledInitially.current) return

        // Scroll solo se siamo già vicini al fondo (per non interrompere la lettura)
        if (chatRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatRef.current
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200

            // Scrolla solo se siamo già vicini al fondo o durante streaming
            if (isNearBottom || status === 'streaming') {
                // Usa scrollTop per scroll più affidabile
                chatRef.current.scrollTo({
                    top: chatRef.current.scrollHeight,
                    behavior: 'smooth'
                })
            }
        }
    }, [messages, status])

    const getTimestamp = () => {
        return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    }

    const sendMessage = async () => {
        if (!input.trim() || !user || status !== 'ready') return

        const userContent = input.trim()
        const userMessage: Message = {
            content: userContent,
            role: 'user',
            timestamp: getTimestamp()
        }

        // Aggiungi messaggio utente alla UI
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

            // Chiama l'API di streaming
            const response = await fetch('/api/ai/stream', {
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

            if (!response.ok) {
                throw new Error('Stream request failed')
            }

            // Ora che abbiamo risposta, passa a streaming
            setStatus('streaming')
            setStatusText('NUR sta scrivendo...')

            // Crea placeholder per la risposta streaming
            const streamingMessage: Message = {
                content: '',
                role: 'assistant',
                timestamp: getTimestamp(),
                isStreaming: true
            }
            setMessages(prev => [...prev, streamingMessage])

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let fullContent = ''

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    const chunk = decoder.decode(value)
                    const lines = chunk.split('\n\n')

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6))

                                if (data.text) {
                                    fullContent += data.text
                                    // Aggiorna il messaggio in streaming
                                    setMessages(prev => {
                                        const newMessages = [...prev]
                                        const lastMsg = newMessages[newMessages.length - 1]
                                        if (lastMsg && lastMsg.isStreaming) {
                                            lastMsg.content = fullContent
                                        }
                                        return newMessages
                                    })
                                }

                                // Se ricevo un nuovo conversationId, salvalo
                                if (data.conversationId) {
                                    setConversationId(data.conversationId)
                                }

                                if (data.done) {
                                    // Fine streaming - rimuovi flag isStreaming
                                    setMessages(prev => {
                                        const newMessages = [...prev]
                                        const lastMsg = newMessages[newMessages.length - 1]
                                        if (lastMsg) {
                                            lastMsg.isStreaming = false
                                        }
                                        return newMessages
                                    })
                                }

                                if (data.error) {
                                    throw new Error(data.error)
                                }
                            } catch (e) {
                                // Ignora errori di parsing
                            }
                        }
                    }
                }
            }

            setStatus('ready')
            setStatusText('NUR è pronta')

        } catch (error) {
            console.error('Send error:', error)
            // Rimuovi messaggio streaming fallito e aggiungi errore
            setMessages(prev => {
                const newMessages = prev.filter(m => !m.isStreaming)
                newMessages.push({
                    content: 'Ops, qualcosa non va. Riprova tra un attimo.',
                    role: 'assistant',
                    timestamp: getTimestamp()
                })
                return newMessages
            })
            setStatus('error')
            setStatusText('Errore connessione')
            setTimeout(() => {
                setStatus('ready')
                setStatusText('NUR è pronta')
            }, 3000)
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

            {/* AI Disclaimer - mostra solo la prima volta per sessione */}
            {showDisclaimer && <AIDisclaimer onAccept={acceptDisclaimer} />}

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
                            sono qui per aiutarti davvero, con onestà e (a volte) un po&apos; di sana provocazione.
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
                                    <div className={`message-bubble ${msg.isStreaming ? 'streaming' : ''}`}>
                                        {msg.role === 'assistant' ? (
                                            renderMarkdown(msg.content)
                                        ) : (
                                            msg.content
                                        )}
                                        {msg.isStreaming && (
                                            <span className="streaming-cursor">▊</span>
                                        )}
                                    </div>
                                    {!msg.isStreaming && (
                                        <div className="message-meta">
                                            <span className="message-time">{msg.timestamp}</span>
                                            {msg.metadata?.area_detected && (
                                                <span className="message-area">
                                                    {msg.metadata.area_detected}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {msg.role === 'assistant' && !msg.isStreaming && (
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
                        {/* Elemento invisibile per scroll */}
                        <div ref={messagesEndRef} />
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
                    <textarea
                        ref={inputRef}
                        placeholder="Scrivi a NUR... (Shift+Enter per andare a capo)"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                            // Auto-resize textarea
                            e.target.style.height = 'auto'
                            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                sendMessage()
                            }
                        }}
                        disabled={status !== 'ready'}
                        rows={1}
                    />
                    <button
                        className="send-btn"
                        onClick={sendMessage}
                        disabled={status !== 'ready' || !input.trim()}
                    >
                        {status === 'thinking' ? (
                            <span className="thinking-indicator">💭</span>
                        ) : status === 'streaming' ? (
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
