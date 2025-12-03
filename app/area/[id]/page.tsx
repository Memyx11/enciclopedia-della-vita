'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import './area.css'

// Configurazione aree
const areeConfig: Record<string, {
    nome: string
    emoji: string
    color: string
    vibe: string
    domande: string[]
}> = {
    salute: {
        nome: 'Salute Fisica',
        emoji: '💪',
        color: '#51cf66',
        vibe: 'coach',
        domande: ['Peso attuale', 'Ore di sonno', 'Allenamenti/settimana', 'Alimentazione', 'Energia (1-10)']
    },
    soldi: {
        nome: 'Finanze',
        emoji: '💰',
        color: '#ffd43b',
        vibe: 'consulente',
        domande: ['Entrate mensili', 'Spese fisse', 'Risparmi', 'Debiti', 'Obiettivo finanziario']
    },
    relazioni: {
        nome: 'Relazioni',
        emoji: '❤️',
        color: '#ff6b6b',
        vibe: 'amico',
        domande: ['Stato relazione', 'Qualità rapporti familiari', 'Amicizie strette', 'Conflitti aperti', 'Bisogno principale']
    },
    lavoro: {
        nome: 'Carriera',
        emoji: '💼',
        color: '#ff922b',
        vibe: 'mentor',
        domande: ['Ruolo attuale', 'Soddisfazione (1-10)', 'Prossimo step', 'Skills da sviluppare', 'Timeline obiettivo']
    },
    hobby: {
        nome: 'Hobby & Passioni',
        emoji: '🎨',
        color: '#22b8cf',
        vibe: 'creativo',
        domande: ['Hobby attivi', 'Tempo dedicato/settimana', 'Nuovo hobby desiderato', 'Blocchi creativi', 'Progetti in corso']
    },
    crescita: {
        nome: 'Crescita Personale',
        emoji: '📚',
        color: '#cc5de8',
        vibe: 'filosofo',
        domande: ['Ultimo libro letto', 'Cosa stai imparando', 'Abitudini in sviluppo', 'Area di miglioramento', 'Mentore/ispirazione']
    },
    casa: {
        nome: 'Casa & Spazio',
        emoji: '🏠',
        color: '#868e96',
        vibe: 'organizzatore',
        domande: ['Soddisfazione casa (1-10)', 'Cosa sistemare', 'Prossimo acquisto', 'Ordine generale', 'Comfort']
    },
    sociale: {
        nome: 'Vita Sociale',
        emoji: '👥',
        color: '#5c7cfa',
        vibe: 'connector',
        domande: ['Frequenza uscite', 'Qualità interazioni', 'Network professionale', 'Community', 'Eventi in programma']
    },
    spirituale: {
        nome: 'Benessere Interiore',
        emoji: '🧘',
        color: '#845ef7',
        vibe: 'guida',
        domande: ['Pratica meditativa', 'Livello stress (1-10)', 'Gratitudine per', 'Paure principali', 'Senso di scopo']
    },
    futuro: {
        nome: 'Visione Futura',
        emoji: '🎯',
        color: '#f783ac',
        vibe: 'visionario',
        domande: ['Dove tra 1 anno', 'Dove tra 5 anni', 'Sogno più grande', 'Prossimo passo concreto', 'Ostacolo principale']
    }
}

// Giorni della settimana
const giorni = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']

interface Task {
    id: string
    testo: string
    completato: boolean
    tipo: 'giornaliero' | 'settimanale' | 'mensile'
    giorno?: number // 0-6 per settimanali
}

interface AreaData {
    situazioneAttuale: Record<string, string>
    obiettivo: Record<string, string>
    tasks: Task[]
    insights: string[]
    storico: { data: string, nota: string }[]
}

export default function AreaPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useUser()
    const areaId = params?.id as string
    
    const [areaData, setAreaData] = useState<AreaData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'journey'>('overview')
    const [showChat, setShowChat] = useState(false)
    const [chatMessage, setChatMessage] = useState('')
    
    const config = areeConfig[areaId]
    
    useEffect(() => {
        if (!config) {
            router.push('/')
            return
        }
        
        // Carica dati area (mock per ora, poi da Supabase)
        loadAreaData()
    }, [areaId])
    
    const loadAreaData = async () => {
        setLoading(false)
        // TODO: Fetch da Supabase
        // Per ora mock data
        setAreaData({
            situazioneAttuale: {},
            obiettivo: {},
            tasks: [
                { id: '1', testo: 'Allenamento mattutino', completato: true, tipo: 'giornaliero' },
                { id: '2', testo: 'Bere 2L acqua', completato: false, tipo: 'giornaliero' },
                { id: '3', testo: '8 ore di sonno', completato: false, tipo: 'giornaliero' },
            ],
            insights: [],
            storico: []
        })
    }
    
    const toggleTask = (taskId: string) => {
        if (!areaData) return
        setAreaData({
            ...areaData,
            tasks: areaData.tasks.map(t => 
                t.id === taskId ? { ...t, completato: !t.completato } : t
            )
        })
        // TODO: Salva su Supabase
    }
    
    const getCompletedToday = () => {
        if (!areaData) return 0
        return areaData.tasks.filter(t => t.tipo === 'giornaliero' && t.completato).length
    }
    
    const getTotalToday = () => {
        if (!areaData) return 0
        return areaData.tasks.filter(t => t.tipo === 'giornaliero').length
    }
    
    if (!config) return null
    
    const userName = user?.firstName || 'Amico'
    
    return (
        <div className="area-container" style={{ '--area-color': config.color } as React.CSSProperties}>
            <div className="bg-gradient"></div>
            <div className="stars"></div>
            
            {/* Header */}
            <header className="area-header">
                <Link href="/" className="back-button">
                    <span>←</span>
                    <span>Universo</span>
                </Link>
                <div className="area-title-section">
                    <span className="area-emoji">{config.emoji}</span>
                    <h1 className="area-title">{config.nome}</h1>
                </div>
                <button 
                    className="quick-chat-btn"
                    onClick={() => setShowChat(!showChat)}
                >
                    💬
                </button>
            </header>
            
            {/* Tab Navigation */}
            <nav className="area-tabs">
                <button 
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Panoramica
                </button>
                <button 
                    className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tasks')}
                >
                    ✅ Azioni
                </button>
                <button 
                    className={`tab ${activeTab === 'journey' ? 'active' : ''}`}
                    onClick={() => setActiveTab('journey')}
                >
                    🛤️ Viaggio
                </button>
            </nav>
            
            <main className="area-main">
                {/* === OVERVIEW TAB === */}
                {activeTab === 'overview' && (
                    <div className="overview-content">
                        {/* Journey Preview */}
                        <section className="journey-preview">
                            <div className="journey-point past">
                                <div className="point-label">3 MESI FA</div>
                                <div className="point-avatar">😔</div>
                                <div className="point-status">Punto di partenza</div>
                            </div>
                            <div className="journey-line">
                                <div className="line-progress" style={{ width: '45%' }}></div>
                            </div>
                            <div className="journey-point present">
                                <div className="point-label">OGGI</div>
                                <div className="point-avatar">😊</div>
                                <div className="point-status">In cammino</div>
                            </div>
                            <div className="journey-line future-line">
                                <div className="line-dots"></div>
                            </div>
                            <div className="journey-point future">
                                <div className="point-label">OBIETTIVO</div>
                                <div className="point-avatar">🔥</div>
                                <div className="point-status">La tua visione</div>
                            </div>
                        </section>
                        
                        {/* Quick Stats */}
                        <section className="quick-stats">
                            <div className="stat-card">
                                <div className="stat-value">{getCompletedToday()}/{getTotalToday()}</div>
                                <div className="stat-label">Task oggi</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">3</div>
                                <div className="stat-label">Giorni streak</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">45%</div>
                                <div className="stat-label">Verso obiettivo</div>
                            </div>
                        </section>
                        
                        {/* AI Insight */}
                        <section className="ai-insight-card">
                            <div className="insight-header">
                                <span className="insight-icon">🔮</span>
                                <span className="insight-title">Insight</span>
                            </div>
                            <p className="insight-message">
                                Ehi {userName}, stai andando bene! Ho notato che completi più task quando 
                                inizi la giornata presto. Domani sveglia alle 7?
                            </p>
                            <div className="insight-actions">
                                <button className="insight-btn accept">Sì, svegliami</button>
                                <button className="insight-btn decline">Non ora</button>
                            </div>
                        </section>
                    </div>
                )}
                
                {/* === TASKS TAB === */}
                {activeTab === 'tasks' && (
                    <div className="tasks-content">
                        {/* Settimana visiva */}
                        <section className="week-view">
                            <h3 className="section-title">Questa Settimana</h3>
                            <div className="week-grid">
                                {giorni.map((giorno, i) => {
                                    const isToday = i === new Date().getDay() - 1 || (i === 6 && new Date().getDay() === 0)
                                    const isPast = i < (new Date().getDay() - 1)
                                    return (
                                        <div 
                                            key={giorno} 
                                            className={`day-cell ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                                        >
                                            <span className="day-name">{giorno}</span>
                                            <div className="day-indicator">
                                                {isPast ? '✓' : isToday ? '●' : '○'}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                        
                        {/* Task List */}
                        <section className="task-section">
                            <h3 className="section-title">📍 Oggi</h3>
                            <div className="task-list">
                                {areaData?.tasks.filter(t => t.tipo === 'giornaliero').map(task => (
                                    <div 
                                        key={task.id} 
                                        className={`task-item ${task.completato ? 'completed' : ''}`}
                                        onClick={() => toggleTask(task.id)}
                                    >
                                        <div className="task-checkbox">
                                            {task.completato ? '✓' : ''}
                                        </div>
                                        <span className="task-text">{task.testo}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                        
                        {/* Add Task */}
                        <button className="add-task-btn">
                            <span>+</span>
                            <span>Aggiungi azione</span>
                        </button>
                    </div>
                )}
                
                {/* === JOURNEY TAB === */}
                {activeTab === 'journey' && (
                    <div className="journey-content">
                        {/* Situazione Attuale vs Obiettivo */}
                        <section className="comparison-section">
                            <div className="comparison-card current">
                                <h3>📍 Dove Sei Ora</h3>
                                <div className="comparison-fields">
                                    {config.domande.slice(0, 3).map((domanda, i) => (
                                        <div key={i} className="field-row">
                                            <span className="field-label">{domanda}</span>
                                            <span className="field-value">
                                                {areaData?.situazioneAttuale[domanda] || '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <button className="edit-btn">Aggiorna</button>
                            </div>
                            
                            <div className="comparison-arrow">→</div>
                            
                            <div className="comparison-card goal">
                                <h3>🎯 Dove Vuoi Arrivare</h3>
                                <div className="comparison-fields">
                                    {config.domande.slice(0, 3).map((domanda, i) => (
                                        <div key={i} className="field-row">
                                            <span className="field-label">{domanda}</span>
                                            <span className="field-value">
                                                {areaData?.obiettivo[domanda] || '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <button className="edit-btn">Definisci</button>
                            </div>
                        </section>
                        
                        {/* Timeline storica */}
                        <section className="history-section">
                            <h3 className="section-title">📜 Il Tuo Percorso</h3>
                            <div className="timeline">
                                <div className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <span className="timeline-date">Oggi</span>
                                        <p>Hai iniziato il tuo viaggio in quest&apos;area</p>
                                    </div>
                                </div>
                            </div>
                            <p className="empty-state">
                                Il tuo percorso si costruirà con ogni azione e conversazione. 
                                Inizia a parlare con l&apos;AI per popolare questa timeline.
                            </p>
                        </section>
                    </div>
                )}
            </main>
            
            {/* Quick Chat Overlay */}
            {showChat && (
                <div className="quick-chat-overlay">
                    <div className="quick-chat-panel">
                        <div className="chat-panel-header">
                            <span>💬 Parla di {config.nome}</span>
                            <button onClick={() => setShowChat(false)}>✕</button>
                        </div>
                        <div className="chat-panel-body">
                            <div className="chat-message bot">
                                <p>
                                    Ciao {userName}! Sono qui per aiutarti con {config.nome.toLowerCase()}. 
                                    Raccontami: come sta andando? Cosa vorresti migliorare?
                                </p>
                            </div>
                        </div>
                        <div className="chat-panel-input">
                            <input 
                                type="text"
                                placeholder="Scrivi qualcosa..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                            />
                            <button className="send-btn">→</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* FAB Chat */}
            <Link href={`/chat?area=${areaId}`} className="chat-fab">
                <span className="fab-icon">💬</span>
            </Link>
        </div>
    )
}
