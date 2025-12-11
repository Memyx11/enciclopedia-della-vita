# DASHBOARD NUR - Design Definitivo

## FILOSOFIA

La Dashboard NON è una lista di task. È una **mappa del viaggio** verso la versione migliore di te stesso.

NUR costruisce questa mappa **conversando con te**, non chiedendoti di compilare form.

---

## STRUTTURA GERARCHICA

```
MISSIONE (La Destinazione Finale)
└── CAPITOLO (Obiettivo Maggiore - sblocca uno alla volta)
    └── STEP (Sotto-obiettivo - sequenziali)
        └── TASK (Azione giornaliera - una alla volta)
```

### Esempio Concreto
```
MISSIONE: "Diventare finanziariamente libero"
├── CAPITOLO 1: "Eliminare i debiti" ✅
├── CAPITOLO 2: "Creare un business" ← ATTIVO
│   ├── STEP 1: "Validare l'idea" ✅
│   ├── STEP 2: "Imparare a vendere" ← ATTIVO
│   │   └── TASK: "Fare 5 chiamate oggi" ← DA FARE
│   └── STEP 3: "Primi 10 clienti" 🔒
├── CAPITOLO 3: "Fondo emergenza" 🔒
└── CAPITOLO 4: "Investire" 🔒
```

---

## LAYOUT DASHBOARD

```
┌─────────────────────────────────────────────────────────────┐
│  ← Home                    Dashboard               [Avatar]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Buongiorno, Elias                                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🔥 LA TUA TASK                                        │ │
│  │                                                        │ │
│  │  Fare 5 chiamate a freddo                              │ │
│  │  Usa lo script. Obiettivo: 1 appuntamento.            │ │
│  │                                                        │ │
│  │  📍 Step 2 di 3 · Imparare a vendere                  │ │
│  │                                                        │ │
│  │  ━━━━━━━━━━━━░░░░░░░░ 60%                             │ │
│  │                                                        │ │
│  │  [✅ FATTO!]              [💬 Aiuto]                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  📋 CAPITOLO 2: Creare un business          42%      │   │
│  │                                                      │   │
│  │   ✅ ─────── ◉ ─────── ○ ─────── ○                  │   │
│  │   Validare   Vendere   10 clienti  ...              │   │
│  │             ↑ SEI QUI                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🎯 MISSIONE                                         │   │
│  │  Diventare finanziariamente libero                   │   │
│  │                                                      │   │
│  │  ■ ■ □ □ □                                           │   │
│  │  Cap 1  Cap 2  Cap 3  Cap 4  ?                      │   │
│  │   ✅     ◉     🔒     🔒                            │   │
│  │                                                      │   │
│  │  ━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░ 25%                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [📚 Scrivania]                                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [🏠]      [💬 NUR]      [📊]      [👤]                     │
│  Home       Chat        Stats     Profilo                   │
└─────────────────────────────────────────────────────────────┘
```

---

## STATI DELLA DASHBOARD

### STATO 0: Nessuna Missione

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                          🎯                                │
│                                                            │
│              Qual è il tuo obiettivo?                      │
│                                                            │
│    NUR ti aiuterà a scoprirlo e raggiungerlo.             │
│                                                            │
│              [💬 Parla con NUR]                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### STATO 1: Missione senza Capitoli

```
┌────────────────────────────────────────────────────────────┐
│  🎯 LA TUA MISSIONE                                        │
│                                                            │
│  "Diventare finanziariamente libero"                       │
│                                                            │
│  ━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%                      │
│                                                            │
│  ⚠️ Serve un piano per iniziare                           │
│                                                            │
│  [💬 Crea il piano con NUR]                                │
└────────────────────────────────────────────────────────────┘
```

### STATO 2: Missione + Capitoli (no task)

```
┌────────────────────────────────────────────────────────────┐
│  🎯 MISSIONE: Diventare finanziariamente libero           │
│  ━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░ 25%                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📋 IL TUO PERCORSO                                        │
│                                                            │
│  ✅ Cap 1: Eliminare debiti                    [100%]     │
│  ◉  Cap 2: Creare un business                  [0%]  ← QUI│
│  🔒 Cap 3: Fondo emergenza                     [0%]       │
│  🔒 Cap 4: Investire                           [0%]       │
│                                                            │
│  ⚠️ Scomponi "Creare un business" in step                 │
│                                                            │
│  [💬 Definisci gli step con NUR]                          │
└────────────────────────────────────────────────────────────┘
```

### STATO 3: Completo (con task attiva)

Vedi layout principale sopra.

---

## FLUSSO CONVERSAZIONALE NUR

### Fase 1: DISCOVERY
NUR raccoglie informazioni senza proporre nulla.

**Trigger:** Utente non ha missione
**NUR chiede:**
- "Cosa vorresti cambiare nella tua vita?"
- "Qual è la cosa che ti pesa di più?"
- "Se potessi avere una cosa, quale sarebbe?"

**Salva:** `[INSIGHT:problem|...]`, `[INSIGHT:desire|...]`

---

### Fase 2: MISSION
Dopo 3+ insight, NUR propone una missione.

**NUR dice:**
> "Sento che il tuo vero obiettivo è **[X]**. È questo che vuoi raggiungere?"

**Se conferma:** `[MISSION:titolo|descrizione|perché]`

---

### Fase 3: CHAPTERS
NUR scompone la missione in capitoli.

**NUR dice:**
> "Per [MISSIONE] dobbiamo fare questi passi:
> 1. [Capitolo A]
> 2. [Capitolo B]
> 3. [Capitolo C]
> Li aggiungo al tuo percorso?"

**Se conferma:** `[CHAPTER:titolo|descrizione]` (multipli)

---

### Fase 4: STEPS
NUR scompone il capitolo attivo in step.

**NUR dice:**
> "Ok, per completare **[Capitolo X]** dobbiamo:
> 1. [Step 1]
> 2. [Step 2]
> 3. [Step 3]
> Ci stai?"

**Se conferma:** `[STEP:capitolo|titolo|descrizione]` (multipli)

---

### Fase 5: TASK
NUR propone la task giornaliera.

**NUR dice:**
> "Per oggi ti propongo: **[Task concreta]**
> È qualcosa che puoi fare oggi. Ci provi?"

**Se conferma:** `[TASK:step|titolo|descrizione]`

---

## CHAIN LOGIC

### Regola Fondamentale
```
Solo UN elemento attivo per livello:
- 1 Capitolo attivo (primo non completato)
- 1 Step attivo (primo non completato nel capitolo attivo)
- 1 Task attiva (prima non completata nello step attivo)
```

### Codice
```typescript
interface ChainState {
  activeChapter: string | null
  activeStep: string | null
  activeTask: string | null
}

function calculateChain(objectives: Objective[]): ChainState {
  // Capitoli = level 'major', ordinati per sort_order
  const chapters = objectives
    .filter(o => o.level === 'major')
    .sort((a, b) => a.sort_order - b.sort_order)

  const activeChapter = chapters.find(c => c.status !== 'completed')

  if (!activeChapter) return { activeChapter: null, activeStep: null, activeTask: null }

  // Step = level 'sub', figli del capitolo attivo
  const steps = objectives
    .filter(o => o.level === 'sub' && o.parent_id === activeChapter.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const activeStep = steps.find(s => s.status !== 'completed')

  if (!activeStep) return { activeChapter: activeChapter.id, activeStep: null, activeTask: null }

  // Task = level 'task', figlie dello step attivo
  const tasks = objectives
    .filter(o => o.level === 'task' && o.parent_id === activeStep.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const activeTask = tasks.find(t => t.status !== 'completed')

  return {
    activeChapter: activeChapter.id,
    activeStep: activeStep.id,
    activeTask: activeTask?.id || null
  }
}

function getDisplayState(obj: Objective, chain: ChainState): 'done' | 'current' | 'locked' {
  if (obj.status === 'completed') return 'done'

  const isActive =
    obj.id === chain.activeChapter ||
    obj.id === chain.activeStep ||
    obj.id === chain.activeTask

  return isActive ? 'current' : 'locked'
}
```

---

## COMANDI NUR

### Creazione Struttura
```
[MISSION:titolo|descrizione|motivazione]
[CHAPTER:titolo|descrizione]
[STEP:parent_chapter|titolo|descrizione]
[TASK:parent_step|titolo|descrizione]
```

### Insight
```
[INSIGHT:problem|contenuto]
[INSIGHT:desire|contenuto]
[INSIGHT:fear|contenuto]
[INSIGHT:strength|contenuto]
```

### Aggiornamento
```
[COMPLETE:titolo]  // Marca come completato
[PROGRESS:titolo|percentuale]  // Aggiorna progresso
```

---

## DATABASE MAPPING

Usiamo la tabella `objectives` esistente:

| Nostro Termine | Campo `level` |
|----------------|---------------|
| Capitolo       | `major`       |
| Step           | `sub`         |
| Task           | `task`        |

La tabella `user_mission` resta per la missione principale.

---

## FILE DA CREARE/MODIFICARE

### 1. `/app/dashboard/page.tsx` (RISCRIVI)
- Nuova UI con stati progressivi
- Chain logic implementata
- CTA dinamiche per ogni stato

### 2. `/lib/nur/mission.ts` (NUOVO)
- `getMissionPhase(userId)` - determina fase conversazionale
- `calculateChain(objectives)` - calcola cosa è attivo
- `getNextAction(userId)` - cosa deve fare NUR

### 3. `/app/api/ai/stream/route.ts` (MODIFICA)
- Nuovo prompt per fase conversazionale
- Nuovi comandi: CHAPTER, STEP, COMPLETE
- Contesto missione nel prompt

### 4. `/app/dashboard/dashboard.css` (NUOVO)
- Stili per tutti gli stati
- Componenti: TaskHero, ChapterProgress, MissionBar

---

## PRIORITÀ IMPLEMENTAZIONE

1. **Dashboard UI** - Riscrivere con stati e chain logic
2. **Mission Logic** - Helper per fasi e chain
3. **API NUR** - Nuovi comandi e prompt
4. **Test** - Flusso completo

---

## DESIGN SYSTEM

### Colori
- **Done:** `#51cf66` (verde)
- **Current:** `#667eea` (viola)
- **Locked:** `rgba(255,255,255,0.2)` (grigio)
- **Background:** `#050510` (quasi nero)
- **Card:** `rgba(255,255,255,0.03)` + border

### Componenti
- **TaskHero:** Card prominente per task attiva
- **ChapterProgress:** Timeline orizzontale con nodi
- **MissionBar:** Barra progresso con capitoli
- **EmptyState:** Per ogni stato mancante

### Animazioni
- Unlock: scale + glow
- Complete: check + confetti subtle
- Progress: smooth transition

---

*Piano definitivo - 11 Dicembre 2025*
