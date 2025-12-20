'use client'

import { useEffect, useLayoutEffect, useState, useRef, Suspense } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import './chat.css'

interface Message {
    id?: string
    content: string
    role: 'user' | 'assistant'
    timestamp: string
    saved?: boolean
    isStreaming?: boolean
}

// Funzione per renderizzare Markdown semplice
function renderMarkdown(text: string): JSX.Element {
    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let listItems: string[] = []
    let listType: 'ul' | 'ol' | null = null

    const processInlineFormatting = (line: string): JSX.Element => {
        const parts: (string | JSX.Element)[] = []
        let remaining = line
        let key = 0

        while (remaining.length > 0) {
            const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
            const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
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

    lines.forEach((line) => {
        const trimmed = line.trim()

        if (!trimmed) {
            flushList()
            return
        }

        if (trimmed.startsWith('> ')) {
            flushList()
            elements.push(
                <blockquote key={elements.length} className="md-quote">
                    {processInlineFormatting(trimmed.substring(2))}
                </blockquote>
            )
            return
        }

        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
        if (numberedMatch) {
            if (listType !== 'ol') {
                flushList()
                listType = 'ol'
            }
            listItems.push(numberedMatch[2])
            return
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            if (listType !== 'ul') {
                flushList()
                listType = 'ul'
            }
            listItems.push(trimmed.substring(2))
            return
        }

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
    const chatRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const hasTriggeredInitialMessage = useRef(false)

    // Message limit counter
    const [messageCount, setMessageCount] = useState({ count: 0, limit: 20, remaining: 20 })
    const [limitReached, setLimitReached] = useState(false)

    // Carica dati utente e messaggi
    useEffect(() => {
        if (!isLoaded) return

        if (!user) {
            setLoading(false)
            return
        }

        const loadData = async () => {
            try {
                // Carica ultimi messaggi dalla nuova tabella chat_messages
                const { data: msgs, error } = await supabaseClient
                    .from('chat_messages')
                    .select('*')
                    .eq('clerk_user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50)

                if (!error && msgs && msgs.length > 0) {
                    const sortedMsgs = [...msgs].reverse()
                    const formattedMessages = sortedMsgs.map(msg => ({
                        id: msg.id,
                        content: msg.content,
                        role: msg.role as 'user' | 'assistant',
                        timestamp: new Date(msg.created_at).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    }))
                    setMessages(formattedMessages)
                }
            } catch (err) {
                console.error('Load error:', err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [isLoaded, user])

    // Gestisci parametri URL
    useEffect(() => {
        const context = searchParams.get('context')
        if (context) {
            setInput(context)
        }
    }, [searchParams])

    const hasScrolledInitially = useRef(false)

    useLayoutEffect(() => {
        if (!loading && messages.length > 0 && !hasScrolledInitially.current) {
            hasScrolledInitially.current = true
            const timer = setTimeout(() => {
                if (chatRef.current) {
                    chatRef.current.scrollTop = chatRef.current.scrollHeight
                }
            }, 50)
            return () => clearTimeout(timer)
        }
    }, [loading, messages.length])

    useEffect(() => {
        if (messages.length === 0 || !hasScrolledInitially.current) return

        if (chatRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatRef.current
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200

            if (isNearBottom || status === 'streaming') {
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

    // Trigger messaggio iniziale
    useEffect(() => {
        const triggerInitialMessage = async () => {
            if (!user || status !== 'ready') return

            setStatus('thinking')
            setStatusText('NUR sta pensando...')

            try {
                const response = await fetch('/api/nur/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: '__NUR_START_CONVERSATION__',
                        history: [],
                        isInitialMessage: true
                    })
                })

                if (!response.ok) throw new Error('Request failed')

                setStatus('streaming')
                setStatusText('NUR sta scrivendo...')

                const streamingMessage: Message = {
                    content: '',
                    role: 'assistant',
                    timestamp: getTimestamp(),
                    isStreaming: true
                }
                setMessages([streamingMessage])

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
                                        setMessages(prev => {
                                            const newMessages = [...prev]
                                            const lastMsg = newMessages[newMessages.length - 1]
                                            if (lastMsg && lastMsg.isStreaming) {
                                                lastMsg.content = fullContent
                                            }
                                            return newMessages
                                        })
                                    }

                                    if (data.done) {
                                        setMessages(prev => {
                                            const newMessages = [...prev]
                                            const lastMsg = newMessages[newMessages.length - 1]
                                            if (lastMsg) {
                                                lastMsg.isStreaming = false
                                            }
                                            return newMessages
                                        })
                                    }
                                } catch {
                                    // Ignora errori di parsing
                                }
                            }
                        }
                    }
                }

                setStatus('ready')
                setStatusText('NUR è pronta')

            } catch (error) {
                console.error('Initial message error:', error)
                setStatus('ready')
                setStatusText('NUR è pronta')
            }
        }

        if (!loading && messages.length === 0 && user && !hasTriggeredInitialMessage.current && status === 'ready') {
            hasTriggeredInitialMessage.current = true
            const timer = setTimeout(() => {
                triggerInitialMessage()
            }, 800)
            return () => clearTimeout(timer)
        }
    }, [loading, messages.length, user, status])

    const sendMessage = async () => {
        if (!input.trim() || !user || status !== 'ready') return

        const userContent = input.trim()
        const userMessage: Message = {
            content: userContent,
            role: 'user',
            timestamp: getTimestamp()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setStatus('thinking')
        setStatusText('NUR sta pensando...')

        try {
            const recentHistory = messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }))

            const response = await fetch('/api/nur/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userContent,
                    history: recentHistory
                })
            })

            if (response.status === 429) {
                const data = await response.json()
                setLimitReached(true)
                setMessageCount({ count: data.count, limit: data.limit, remaining: 0 })
                setMessages(prev => [...prev, {
                    content: '🛑 ' + data.message,
                    role: 'assistant',
                    timestamp: getTimestamp()
                }])
                setStatus('ready')
                setStatusText('Limite raggiunto')
                return
            }

            if (!response.ok) throw new Error('Request failed')

            setMessageCount(prev => ({
                ...prev,
                count: prev.count + 1,
                remaining: Math.max(0, prev.remaining - 1)
            }))

            setStatus('streaming')
            setStatusText('NUR sta scrivendo...')

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
                                    setMessages(prev => {
                                        const newMessages = [...prev]
                                        const lastMsg = newMessages[newMessages.length - 1]
                                        if (lastMsg && lastMsg.isStreaming) {
                                            lastMsg.content = fullContent
                                        }
                                        return newMessages
                                    })
                                }

                                if (data.done) {
                                    setMessages(prev => {
                                        const newMessages = [...prev]
                                        const lastMsg = newMessages[newMessages.length - 1]
                                        if (lastMsg) {
                                            lastMsg.isStreaming = false
                                        }
                                        return newMessages
                                    })
                                }
                            } catch {
                                // Ignora errori parsing
                            }
                        }
                    }
                }
            }

            setStatus('ready')
            setStatusText('NUR è pronta')

        } catch (error) {
            console.error('Send error:', error)
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

    if (!isLoaded) return null

    if (!user) {
        if (typeof window !== 'undefined') {
            window.location.href = '/sign-in?redirect_url=/chat'
        }
        return (
            <div className="chat-page">
                <div className="bg-gradient"></div>
                <div className="auth-prompt">
                    <div className="nur-avatar large">💜</div>
                    <h1>Ciao! Sono NUR</h1>
                    <p>Accedi per iniziare a parlare con me</p>
                    <Link href="/sign-in?redirect_url=/chat" className="btn btn-primary">
                        Accedi
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
                    <Link href="/la-mia-vita" className="header-btn" title="La Mia Vita">
                        🌌
                    </Link>
                </div>
            </header>

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
                            NUR sta arrivando...
                        </p>
                        <div className="nur-loading">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
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
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </main>

            <footer className="chat-footer">
                <div className="message-counter">
                    <span className={messageCount.remaining <= 5 ? 'warning' : ''}>
                        {messageCount.remaining}/{messageCount.limit} messaggi oggi
                    </span>
                    {messageCount.remaining <= 5 && messageCount.remaining > 0 && (
                        <span className="counter-warning">⚠️</span>
                    )}
                </div>

                {limitReached && (
                    <div className="limit-banner">
                        <p>🛑 Hai usato tutti i 20 messaggi di oggi!</p>
                        <p>Torna domani per continuare.</p>
                    </div>
                )}

                <div className="input-container">
                    <textarea
                        ref={inputRef}
                        placeholder="Scrivi a NUR... (Shift+Enter per andare a capo)"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
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

            <nav className="bottom-nav">
                <Link href="/la-mia-vita" className="nav-item">
                    <span>🏠</span>
                    <span>Dashboard</span>
                </Link>
                <Link href="/chat" className="nav-item active">
                    <span>💬</span>
                    <span>Chat</span>
                </Link>
                <Link href="/goals" className="nav-item">
                    <span>🎯</span>
                    <span>Goals</span>
                </Link>
            </nav>
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
