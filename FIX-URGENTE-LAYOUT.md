# 🚨 FIX URGENTE - LAYOUT ROTTO

## IL PROBLEMA

I componenti `MissionHero` e `CurrentTask` sono stati inseriti dentro un layout che usa posizionamento assoluto per i pianeti, causando sovrapposizioni.

---

## SOLUZIONE: RISTRUTTURARE IL LAYOUT

### FILE 1: `app/la-mia-vita/page.tsx`

Sostituisci TUTTO il return statement con questo:

```tsx
return (
    <div className="universe-container">
        <div className="bg-gradient"></div>
        <div className="stars"></div>
        
        <header className="universe-header">
            <div className="logo-section">
                <Link href="/" className="back-link">← Home</Link>
            </div>
            <div className="title-section">
                <span className="logo-icon">🌌</span>
                <span className="logo-text">La Mia Vita</span>
            </div>
            <div className="user-section">
                <UserButton afterSignOutUrl="/" />
            </div>
        </header>

        <main className="universe-main">
            {/* Saluto */}
            <div className="greeting-section">
                <h1 className="greeting">{greeting}, <span className="user-name">{userName}</span></h1>
                <p className="greeting-sub">Come stai oggi?</p>
            </div>

            {/* === SEZIONE MISSIONE (sopra i pianeti) === */}
            <section className="mission-section">
                <MissionHero />
                <CurrentTask />
            </section>

            {/* === SEZIONE PIANETI === */}
            <section className="planets-section">
                {/* Progresso globale */}
                <div className="global-progress">
                    <div className="progress-circle" style={{ '--progress': totalProgress } as React.CSSProperties}>
                        <span className="progress-value">{totalProgress}%</span>
                    </div>
                    <p className="progress-label">Completamento Vita</p>
                </div>

                {/* Orbita pianeti */}
                <div className="planet-container">
                    <div className="planet-center">
                        <div className="center-avatar">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="center-pulse"></div>
                    </div>
                    <div className="orbit-ring"></div>
                    
                    {areeVita.map((area) => {
                        const pos = getPositionOnCircle(area.angle, 140)
                        const isHovered = hoveredArea === area.id
                        const progress = areasProgress[area.id] || 0
                        
                        return (
                            <Link
                                key={area.id}
                                href={`/area/${area.id}`}
                                className={`area-node ${isHovered ? 'hovered' : ''}`}
                                style={{
                                    transform: `translate(${pos.x}px, ${pos.y}px) scale(${isHovered ? 1.2 : 1})`,
                                    '--area-color': area.color,
                                    opacity: getAreaOpacity(area.id)
                                } as React.CSSProperties}
                                onMouseEnter={() => setHoveredArea(area.id)}
                                onMouseLeave={() => setHoveredArea(null)}
                            >
                                <div className="node-glow"></div>
                                <div className="node-content">
                                    <span className="node-emoji">{area.emoji}</span>
                                    {progress > 0 && (
                                        <div className="node-progress-ring">
                                            <svg viewBox="0 0 36 36">
                                                <path
                                                    d="M18 2.0845
                                                    a 15.9155 15.9155 0 0 1 0 31.831
                                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke={area.color}
                                                    strokeWidth="2"
                                                    strokeDasharray={`${progress}, 100`}
                                                />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="node-label">
                                    {area.nome}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </section>

            {/* Quick actions */}
            <div className="quick-actions">
                <Link href="/chat" className="action-btn primary">
                    💬 Parla con NUR
                </Link>
                <Link href="/obiettivi" className="action-btn">
                    🎯 Obiettivi
                </Link>
                <Link href="/giornale" className="action-btn">
                    📋 Scrivania
                </Link>
            </div>
        </main>

        <Link href="/chat" className="chat-fab">
            <span className="fab-icon">💬</span>
            <span className="fab-pulse"></span>
        </Link>
    </div>
)
```

---

### FILE 2: `app/la-mia-vita/la-mia-vita.css`

AGGIUNGI queste regole CSS (in cima o in fondo, non importa):

```css
/* === MISSION SECTION - sopra i pianeti === */
.mission-section {
    width: 100%;
    max-width: 500px;
    padding: 0 20px;
    margin-bottom: 20px;
    position: relative;
    z-index: 5;
}

/* === PLANETS SECTION - contiene orbita === */
.planets-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    position: relative;
    z-index: 1;
}

/* Fix planet container per non sovrapporsi */
.planet-container {
    position: relative;
    width: 350px;
    height: 350px;
    margin: 0 auto;
}

/* Ridimensiona orbita per stare nel container */
.orbit-ring {
    width: 280px;
    height: 280px;
}

/* Nodi più piccoli */
.area-node {
    width: 50px;
    height: 50px;
    margin: -25px 0 0 -25px;
}

.node-content {
    width: 50px;
    height: 50px;
}

.node-emoji {
    font-size: 1.3em;
}

/* Global progress sopra i pianeti */
.global-progress {
    margin-bottom: 20px;
    position: relative;
    z-index: 5;
}

/* Responsive */
@media (max-width: 500px) {
    .mission-section {
        padding: 0 15px;
    }
    
    .planet-container {
        width: 300px;
        height: 300px;
    }
    
    .orbit-ring {
        width: 240px;
        height: 240px;
    }
    
    .area-node {
        width: 45px;
        height: 45px;
        margin: -22.5px 0 0 -22.5px;
    }
    
    .node-content {
        width: 45px;
        height: 45px;
    }
}
```

---

### FILE 3: `app/obiettivi/page.tsx`

Il problema qui è che i componenti si sovrappongono. Sostituisci il return statement:

```tsx
return (
    <div className="obiettivi-container">
        <div className="bg-gradient"></div>
        
        <header className="obiettivi-header">
            <Link href="/la-mia-vita" className="back-link">← Vita</Link>
            <h1>🎯 Obiettivi</h1>
            <Link href="/chat" className="chat-link">💬</Link>
        </header>

        <main className="obiettivi-content">
            {/* Missione */}
            <section className="section-box">
                <MissionHero />
            </section>

            {/* Task attuale */}
            <section className="section-box">
                <CurrentTask />
            </section>

            {/* Albero obiettivi */}
            <section className="section-box">
                <h2 className="section-title">📋 I Tuoi Obiettivi</h2>
                <ObjectiveTree missionId={mission?.id} />
            </section>

            {/* CTA */}
            <div className="nur-cta">
                <p>Vuoi aggiungere o modificare obiettivi?</p>
                <Link href="/chat" className="btn btn-primary">
                    💬 Parla con NUR
                </Link>
            </div>
        </main>

        {/* Bottom Nav */}
        <nav className="bottom-nav">
            <Link href="/" className="nav-item">🏠 Home</Link>
            <Link href="/chat" className="nav-item">💬 Chat</Link>
            <Link href="/obiettivi" className="nav-item active">🎯 Obiettivi</Link>
            <Link href="/la-mia-vita" className="nav-item">🌌 Vita</Link>
            <Link href="/profilo" className="nav-item">👤 Profilo</Link>
        </nav>

        <style jsx>{`
            .obiettivi-container {
                min-height: 100vh;
                background: #0a0a1a;
                color: #fff;
                padding-bottom: 80px;
            }
            
            .bg-gradient {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 300px;
                background: linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, transparent 100%);
                pointer-events: none;
                z-index: 0;
            }
            
            .obiettivi-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                position: sticky;
                top: 0;
                background: rgba(10, 10, 26, 0.95);
                backdrop-filter: blur(10px);
                z-index: 100;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            
            .obiettivi-header h1 {
                font-size: 18px;
                font-weight: 600;
                margin: 0;
            }
            
            .back-link {
                color: rgba(255,255,255,0.6);
                text-decoration: none;
                font-size: 14px;
            }
            
            .chat-link {
                font-size: 20px;
                text-decoration: none;
            }
            
            .obiettivi-content {
                padding: 20px;
                max-width: 600px;
                margin: 0 auto;
                position: relative;
                z-index: 1;
            }
            
            .section-box {
                margin-bottom: 20px;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
                color: rgba(255,255,255,0.9);
            }
            
            .nur-cta {
                text-align: center;
                padding: 24px;
                background: rgba(255,255,255,0.03);
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.08);
            }
            
            .nur-cta p {
                color: rgba(255,255,255,0.6);
                margin-bottom: 16px;
            }
            
            .btn {
                display: inline-block;
                padding: 12px 24px;
                border-radius: 12px;
                font-weight: 600;
                text-decoration: none;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: #fff;
            }
            
            .bottom-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-around;
                padding: 12px 0;
                background: rgba(10, 10, 26, 0.98);
                border-top: 1px solid rgba(255,255,255,0.1);
                z-index: 1000;
            }
            
            .nav-item {
                color: rgba(255,255,255,0.5);
                text-decoration: none;
                font-size: 12px;
                text-align: center;
            }
            
            .nav-item.active {
                color: #667eea;
            }
        `}</style>
    </div>
)
```

---

## ORDINE ESECUZIONE

1. **File 1** (la-mia-vita/page.tsx) - Sostituisci return
2. **File 2** (la-mia-vita.css) - Aggiungi CSS
3. **File 3** (obiettivi/page.tsx) - Sostituisci tutto il return + styles
4. **Commit & Deploy**

```bash
git add -A && git commit -m "fix: Layout sovrapposizione componenti" && git push origin main && vercel --prod
```

---

## TEST DOPO DEPLOY

1. Vai su `/la-mia-vita` - Verifica che Missione e Task siano SOPRA i pianeti, non sovrapposti
2. Vai su `/obiettivi` - Verifica che ogni sezione sia separata
3. Verifica mobile (ridimensiona finestra)

---

**Tempo stimato:** 15-20 minuti
