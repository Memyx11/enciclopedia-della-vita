'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase, LifeArea, Solution } from '@/lib/supabase'
import Link from 'next/link'
import './chat.css'

interface Message {
    text: string
    type: 'user' | 'bot'
    timestamp: string
}

export default function ChatPage() {
    const { user, isLoaded } = useUser()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [status, setStatus] = useState<'ready' | 'thinking' | 'error'>('ready')
    const [statusText, setStatusText] = useState('Pronto')
    const [areas, setAreas] = useState<LifeArea[]>([])
    const chatRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isLoaded && user) {
            fetchAreas()
        }
    }, [isLoaded, user])

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight
        }
    }, [messages])

    const fetchAreas = async () => {
        if (!user) return
        const { data } = await supabase
            .from('life_areas')
            .select('*')
            .eq('clerk_user_id', user.id)
        if (data) setAreas(data)
    }

    const getTimestamp = () => {
        return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    }

    const sendMessage = async () => {
        if (!input.trim() || !user) return

        const userMessage: Message = {
            text: input,
            type: 'user',
            timestamp: getTimestamp()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setStatus('thinking')
        setStatusText('Analizzo...')

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    userId: user.id,
                    areas: areas
                })
            })

            const data = await response.json()
            
            const botMessage: Message = {
                text: data.response || 'Mi dispiace, non ho capito.',
                type: 'bot',
                timestamp: getTimestamp()
            }

            setMessages(prev => [...prev, botMessage])
            setStatus('ready')
            setStatusText('Pronto')

        } catch (error) {
            const errorMessage: Message = {
                text: 'Errore di connessione. Riprova.',
                type: 'bot',
                timestamp: getTimestamp()
            }
            setMessages(prev => [...prev, errorMessage])
            setStatus('error')
            setStatusText('Errore')
        }
    }

    const saveSolution = async (text: string, index: number) => {
        if (!user) return

        const lines = text.split('\n').filter(r => r.trim())
        const title = lines[0] ? lines[0].substring(0, 80).replace(/[^a-zA-Z0-9\s]/g, '').trim() : 'Soluzione'
        const steps = lines.filter(r => /^[\d\-]/.test(r.trim())).map(r => r.replace(/^[\d\-]+\s*/, '').trim())

        const solution = {
            clerk_user_id: user.id,
            title: title || 'Piano suggerito',
            content: text,
            steps: steps,
            status: 'proposta',
            area_type: 'generale',
            progress: 0
        }

        await supabase.from('solutions').insert([solution])

        // Update button to link
        setMessages(prev => prev.map((msg, i) => 
            i === index ? { ...msg, saved: true } as any : msg
        ))
    }

    const resetChat = () => {
        if (confirm('Cancellare la conversazione?')) {
            setMessages([])
        }
    }

    const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Utente'

    return (
        <>
            <div className="bg-gradient"></div>
            
            <header>
                <div className="header-content">
                    <Link href="/" className="logo">
                        <span>🤖</span>
                        <span>Coach AI</span>
                        <span className="version-badge">v2.0</span>
                    </Link>
                    <nav className="nav-links">
                        <button className="reset-btn" onClick={resetChat}>🔄 Reset</button>
                        <Link href="/soluzioni">💡 Soluzioni</Link>
                        <Link href="/dashboard">📊 Dashboard</Link>
                        <Link href="/">📖 Enciclopedia</Link>
                    </nav>
                </div>
            </header>

            <div className="status-bar">
                <div className="status-indicator">
                    <div className={`status-dot ${status}`}></div>
                    <span>{statusText}</span>
                </div>
                <div className="user-badge">
                    <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <span>{userName}</span>
                </div>
            </div>

            <div className="container">
                <div id="chatContainer" ref={chatRef}>
                    {messages.length === 0 ? (
                        <div className="welcome">
                            <h2>👋 Ciao {userName}!</h2>
                            <p>Sono il tuo Coach AI personale.</p>
                            <p className="highlight">Analizzo i tuoi dati per darti consigli specifici!</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`message ${msg.type}`}>
                                <div className="message-bubble">
                                    {msg.text}
                                    <div className="message-meta">
                                        <span>{msg.type === 'user' ? '👤' : '🤖'}</span>
                                        <span>{msg.timestamp}</span>
                                    </div>
                                    {msg.type === 'bot' && !(msg as any).saved && (
                                        <button 
                                            className="save-solution-btn"
                                            onClick={() => saveSolution(msg.text, i)}
                                        >
                                            💾 Salva
                                        </button>
                                    )}
                                    {msg.type === 'bot' && (msg as any).saved && (
                                        <Link href="/soluzioni" className="saved-link">
                                            ✅ Salvata - Visualizza
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="input-area">
                    <input
                        type="text"
                        id="messageInput"
                        placeholder="Scrivi un messaggio..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') sendMessage()
                        }}
                        disabled={status === 'thinking'}
                    />
                    <button 
                        id="sendButton" 
                        onClick={sendMessage}
                        disabled={status === 'thinking'}
                    >
                        Invia
                    </button>
                </div>
            </div>
        </>
    )
}
