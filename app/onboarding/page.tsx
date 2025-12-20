'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import styles from './onboarding.module.css'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface OnboardingStep {
    id: number
    title: string
    icon: string
    description: string
}

const STEPS: OnboardingStep[] = [
    { id: 1, title: 'Identità', icon: '👤', description: 'Chi sei?' },
    { id: 2, title: 'Routine', icon: '⏰', description: 'Le tue abitudini' },
    { id: 3, title: 'Priorità', icon: '🎯', description: 'Cosa conta' },
    { id: 4, title: 'Primo Goal', icon: '🚀', description: 'Iniziamo!' }
]

export default function OnboardingPage() {
    const router = useRouter()
    const { user } = useUser()
    const [currentStep, setCurrentStep] = useState(1)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [previewData, setPreviewData] = useState({
        name: '',
        bio: '',
        wakeTime: '',
        sleepTime: '',
        focusArea: '',
        firstGoal: ''
    })
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Initial message from NUR
        if (messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: 'Ehi! Sono NUR. Finalmente ci conosciamo. Chi sei?'
            }])
        }
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        inputRef.current?.focus()
    }, [isLoading])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        try {
            const response = await fetch('/api/nur/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    step: currentStep,
                    history: messages
                })
            })

            if (!response.ok) throw new Error('Failed to send message')

            const data = await response.json()

            setMessages(prev => [...prev, { role: 'assistant', content: data.message }])

            // Update preview data if provided
            if (data.extractedData) {
                setPreviewData(prev => ({ ...prev, ...data.extractedData }))
            }

            // Progress step if NUR indicates
            if (data.progressStep && currentStep < 4) {
                setCurrentStep(prev => prev + 1)
            }

            // Complete onboarding
            if (data.complete) {
                setTimeout(() => router.push('/la-mia-vita'), 1500)
            }
        } catch (error) {
            console.error('Error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Ops, qualcosa è andato storto. Riprova!'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className="bg-gradient" />

            {/* Left Panel - Progress */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>✦</span>
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
                            <div className={styles.stepIcon}>
                                {step.id < currentStep ? '✓' : step.icon}
                            </div>
                            <div className={styles.stepInfo}>
                                <div className={styles.stepTitle}>{step.title}</div>
                                <div className={styles.stepDesc}>{step.description}</div>
                            </div>
                            {step.id < 4 && <div className={styles.stepLine} />}
                        </div>
                    ))}
                </div>

                <div className={styles.sidebarFooter}>
                    <div className={styles.progressLabel}>
                        Progresso: {Math.round((currentStep / 4) * 100)}%
                    </div>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${(currentStep / 4) * 100}%` }}
                        />
                    </div>
                </div>
            </aside>

            {/* Center - Preview */}
            <main className={styles.main}>
                <div className={styles.previewCard}>
                    <div className={styles.previewHeader}>
                        <div className={styles.previewAvatar}>
                            {previewData.name ? previewData.name[0].toUpperCase() : '?'}
                        </div>
                        <div className={styles.previewInfo}>
                            <div className={styles.previewName}>
                                {previewData.name || 'Il tuo nome'}
                            </div>
                            <div className={styles.previewBio}>
                                {previewData.bio || 'La tua bio apparirà qui...'}
                            </div>
                        </div>
                    </div>

                    {(previewData.wakeTime || previewData.sleepTime) && (
                        <div className={styles.previewSection}>
                            <div className={styles.previewSectionTitle}>Routine</div>
                            <div className={styles.previewRoutine}>
                                {previewData.wakeTime && (
                                    <div className={styles.routineItem}>
                                        <span>🌅</span> Sveglia: {previewData.wakeTime}
                                    </div>
                                )}
                                {previewData.sleepTime && (
                                    <div className={styles.routineItem}>
                                        <span>🌙</span> Nanna: {previewData.sleepTime}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {previewData.focusArea && (
                        <div className={styles.previewSection}>
                            <div className={styles.previewSectionTitle}>Area Focus</div>
                            <div className={styles.previewFocus}>
                                <span className={styles.focusBadge}>{previewData.focusArea}</span>
                            </div>
                        </div>
                    )}

                    {previewData.firstGoal && (
                        <div className={styles.previewSection}>
                            <div className={styles.previewSectionTitle}>Primo Obiettivo</div>
                            <div className={styles.previewGoal}>
                                <span className={styles.goalIcon}>🎯</span>
                                {previewData.firstGoal}
                            </div>
                        </div>
                    )}

                    {!previewData.name && !previewData.bio && (
                        <div className={styles.previewEmpty}>
                            <div className={styles.previewEmptyIcon}>💬</div>
                            <div className={styles.previewEmptyText}>
                                Parla con NUR per creare il tuo profilo
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Right Panel - Chat */}
            <aside className={styles.chatPanel}>
                <div className={styles.chatHeader}>
                    <div className={styles.chatAvatar}>✦</div>
                    <div className={styles.chatInfo}>
                        <div className={styles.chatName}>NUR</div>
                        <div className={styles.chatStatus}>Online</div>
                    </div>
                </div>

                <div className={styles.chatMessages}>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`${styles.message} ${styles[`message-${msg.role}`]}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className={styles.messageAvatar}>✦</div>
                            )}
                            <div className={styles.messageContent}>{msg.content}</div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className={`${styles.message} ${styles['message-assistant']}`}>
                            <div className={styles.messageAvatar}>✦</div>
                            <div className={styles.messageContent}>
                                <span className={styles.typing}>
                                    <span>.</span><span>.</span><span>.</span>
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className={styles.chatInput} onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Scrivi un messaggio..."
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()}>
                        <span>↑</span>
                    </button>
                </form>
            </aside>
        </div>
    )
}
