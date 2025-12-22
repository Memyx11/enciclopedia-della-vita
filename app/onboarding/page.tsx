'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabaseClient } from '@/lib/supabase/client'
import styles from './onboarding.module.css'

interface Message {
    role: 'user' | 'assistant'
    content: string
    isStreaming?: boolean
}

// I 6 step dell'onboarding dal GDD
const STEPS = [
    { id: 1, title: "L'Incontro", description: 'NUR ti incontra' },
    { id: 2, title: 'Il Nome', description: 'Chi sei?' },
    { id: 3, title: 'La Prima Sfida', description: 'Cosa rimandi?' },
    { id: 4, title: 'Mappa Veloce', description: 'Le tue aree' },
    { id: 5, title: 'Primo Obiettivo', description: 'Da dove parti' },
    { id: 6, title: 'Il Patto', description: 'Le regole tra noi' }
]

export default function OnboardingPage() {
    const router = useRouter()
    const { user, isLoaded } = useUser()
    const [currentStep, setCurrentStep] = useState(1)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const [collectedData, setCollectedData] = useState({
        name: '',
        struggle: '',
        areas: {} as Record<string, string>,
        firstGoal: ''
    })
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Scroll automatico ai nuovi messaggi
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Check onboarding status e inizia conversazione
    useEffect(() => {
        if (!isLoaded || !user) return

        const init = async () => {
            // Verifica se onboarding già completato
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('onboarding_completed, onboarding_step')
                .eq('clerk_user_id', user.id)
                .single()

            if (profile?.onboarding_completed) {
                router.push('/la-mia-vita')
                return
            }

            if (profile?.onboarding_step && profile.onboarding_step > 1) {
                setCurrentStep(profile.onboarding_step)
            }

            // Inizia la conversazione
            if (!hasStarted) {
                setHasStarted(true)
                await startConversation()
            }
        }

        init()
    }, [isLoaded, user, router, hasStarted])

    const startConversation = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/nur/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: '__START__',
                    step: 1,
                    history: [],
                    collectedContext: ''
                })
            })

            if (!response.ok) throw new Error('Failed to start')

            await handleStreamResponse(response)
        } catch (error) {
            console.error('Start error:', error)
            setMessages([{
                role: 'assistant',
                content: 'Ops, qualcosa non va. Ricarica la pagina.',
                isStreaming: false
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleStreamResponse = async (response: Response) => {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''

        // Aggiungi messaggio vuoto che verrà riempito
        setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])

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
                                    const newMsgs = [...prev]
                                    if (newMsgs.length > 0) {
                                        newMsgs[newMsgs.length - 1] = {
                                            role: 'assistant',
                                            content: fullContent,
                                            isStreaming: true
                                        }
                                    }
                                    return newMsgs
                                })
                            }

                            if (data.done) {
                                setMessages(prev => {
                                    const newMsgs = [...prev]
                                    if (newMsgs.length > 0) {
                                        newMsgs[newMsgs.length - 1] = {
                                            role: 'assistant',
                                            content: fullContent,
                                            isStreaming: false
                                        }
                                    }
                                    return newMsgs
                                })

                                // Aggiorna dati raccolti
                                if (data.extractedData) {
                                    setCollectedData(prev => ({
                                        ...prev,
                                        ...data.extractedData
                                    }))
                                }

                                // Avanza step se necessario
                                if (data.nextStep && data.nextStep > currentStep) {
                                    setCurrentStep(data.nextStep)
                                }

                                // Onboarding completato
                                if (data.complete) {
                                    setTimeout(() => {
                                        router.push('/la-mia-vita')
                                    }, 2000)
                                }
                            }
                        } catch {
                            // Ignora errori di parsing
                        }
                    }
                }
            }
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        try {
            // Costruisci contesto dai dati raccolti
            const contextParts: string[] = []
            if (collectedData.name) contextParts.push(`Nome: ${collectedData.name}`)
            if (collectedData.struggle) contextParts.push(`Blocco identificato: ${collectedData.struggle}`)
            if (Object.keys(collectedData.areas).length > 0) {
                contextParts.push(`Aree mappate: ${JSON.stringify(collectedData.areas)}`)
            }
            if (collectedData.firstGoal) contextParts.push(`Primo obiettivo: ${collectedData.firstGoal}`)
            const collectedContext = contextParts.join('\n')

            const response = await fetch('/api/nur/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    step: currentStep,
                    history: messages.filter(m => !m.isStreaming).map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    collectedContext
                })
            })

            if (!response.ok) throw new Error('Request failed')

            await handleStreamResponse(response)
        } catch (error) {
            console.error('Send error:', error)
            setMessages(prev => {
                const filtered = prev.filter(m => !m.isStreaming)
                filtered.push({
                    role: 'assistant',
                    content: 'Problema di connessione. Riprova.',
                    isStreaming: false
                })
                return filtered
            })
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }

    if (!isLoaded) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Caricamento...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        router.push('/sign-in')
        return null
    }

    return (
        <div className={styles.container}>
            <div className="bg-gradient" />

            {/* Left Sidebar - Progress */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>💜</span>
                    <span className={styles.logoText}>NUR: LIFE</span>
                </div>

                <div className={styles.steps}>
                    {STEPS.map((step) => (
                        <div
                            key={step.id}
                            className={`${styles.step} ${
                                step.id === currentStep ? styles.stepActive :
                                step.id < currentStep ? styles.stepCompleted : ''
                            }`}
                        >
                            <div className={styles.stepDot}>
                                {step.id < currentStep ? '✓' : step.id}
                            </div>
                            <div className={styles.stepInfo}>
                                <div className={styles.stepTitle}>{step.title}</div>
                                <div className={styles.stepDesc}>{step.description}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.sidebarFooter}>
                    <div className={styles.progressLabel}>
                        Progresso: {Math.round((currentStep / 6) * 100)}%
                    </div>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${(currentStep / 6) * 100}%` }}
                        />
                    </div>
                </div>
            </aside>

            {/* Center - Chat */}
            <main className={styles.main}>
                <div className={styles.chatContainer}>
                    <div className={styles.chatHeader}>
                        <div className={styles.chatAvatar}>💜</div>
                        <div className={styles.chatInfo}>
                            <div className={styles.chatName}>NUR</div>
                            <div className={styles.chatStatus}>
                                {isLoading ? 'Sta scrivendo...' : 'Online'}
                            </div>
                        </div>
                    </div>

                    <div className={styles.chatMessages}>
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`${styles.message} ${styles[msg.role]}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className={styles.messageAvatar}>💜</div>
                                )}
                                <div className={`${styles.messageBubble} ${msg.isStreaming ? styles.streaming : ''}`}>
                                    {msg.content}
                                    {msg.isStreaming && <span className={styles.cursor}>▊</span>}
                                </div>
                            </div>
                        ))}
                        {isLoading && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
                            <div className={`${styles.message} ${styles.assistant}`}>
                                <div className={styles.messageAvatar}>💜</div>
                                <div className={styles.messageBubble}>
                                    <span className={styles.typing}>
                                        <span></span><span></span><span></span>
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.chatInput}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    sendMessage()
                                }
                            }}
                            placeholder="Scrivi a NUR..."
                            disabled={isLoading}
                            rows={1}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                        >
                            →
                        </button>
                    </div>
                </div>
            </main>

            {/* Right Sidebar - Preview */}
            <aside className={styles.preview}>
                <h3>Il Tuo Profilo</h3>
                <div className={styles.previewContent}>
                    {collectedData.name && (
                        <div className={styles.previewItem}>
                            <span className={styles.previewLabel}>👤 Nome</span>
                            <span className={styles.previewValue}>{collectedData.name}</span>
                        </div>
                    )}
                    {collectedData.struggle && (
                        <div className={styles.previewItem}>
                            <span className={styles.previewLabel}>🎯 Prima sfida</span>
                            <span className={styles.previewValue}>{collectedData.struggle}</span>
                        </div>
                    )}
                    {Object.keys(collectedData.areas).length > 0 && (
                        <div className={styles.previewItem}>
                            <span className={styles.previewLabel}>🗺️ Aree mappate</span>
                            <div className={styles.areasList}>
                                {Object.entries(collectedData.areas).map(([area, status]) => (
                                    <div key={area} className={styles.areaTag}>
                                        {area}: {status}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {collectedData.firstGoal && (
                        <div className={styles.previewItem}>
                            <span className={styles.previewLabel}>🚀 Primo obiettivo</span>
                            <span className={styles.previewValue}>{collectedData.firstGoal}</span>
                        </div>
                    )}

                    {!collectedData.name && !collectedData.struggle && (
                        <div className={styles.previewEmpty}>
                            <div className={styles.previewEmptyIcon}>💬</div>
                            <p>NUR sta raccogliendo informazioni su di te...</p>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    )
}
