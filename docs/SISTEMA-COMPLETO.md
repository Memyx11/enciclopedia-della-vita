# Enciclopedia della Vita - Sistema Completo

## 🎯 Overview

L'Enciclopedia della Vita è una piattaforma di life coaching gamificata con NUR (نور - Luce), un'AI coach che guida gli utenti verso i loro obiettivi attraverso:

1. **Quest System** - Progressione gamificata con quest lucchettate
2. **Profilo Strutturato** - NUR raccoglie dati sull'utente durante le conversazioni
3. **Routine System** - Gestione task giornaliere
4. **10 Aree della Vita** - Ogni aspetto della vita ha obiettivi dedicati

---

## 📊 Architettura Database

### Tabelle ATTIVE (da mantenere)

| Tabella | Scopo | Usata da |
|---------|-------|----------|
| `profiles` | Profilo utente + stats gioco | Clerk webhook, Game system |
| `user_profile_data` | Profilo strutturato (life_phase, mindset, skills) | NUR Discovery |
| `game_quests` | Definizione quest (seed data) | Quest System |
| `user_quest_progress` | Progressione quest per utente | Quest System |
| `life_areas_config` | 10 aree della vita (seed data) | Tutto il sistema |
| `area_objectives` | Obiettivi personali per area | NUR + Dashboard |
| `routine_tasks` | Task della routine | Routine System |
| `daily_task_log` | Log completamenti giornalieri | Routine System |
| `user_routine_template` | Template settimanale (orari, obblighi) | Routine System |
| `achievements` | Definizione achievement (seed data) | Achievement System |
| `user_achievements` | Achievement sbloccati | Achievement System |
| `user_insights` | Insight raccolti da NUR | Discovery Mode |
| `user_memory` | Memorie di NUR sull'utente | Contesto conversazioni |
| `conversations` | Storico conversazioni | Chat |
| `messages` | Messaggi nelle conversazioni | Chat |
| `user_mission` | Missione principale utente | Dashboard La Mia Vita |
| `objectives` | Capitoli/Step/Task della missione | Dashboard La Mia Vita |
| `task_materials` | Materiali per task (Scrivania) | Scrivania/Giornale |
| `journal_entries` | Voci del giornale | Scrivania/Giornale |
| `xp_history` | Storico XP guadagnati | Stats |

### Tabelle LEGACY (possono essere rimosse)

| Tabella | Motivo |
|---------|--------|
| `life_areas` | Sostituita da `life_areas_config` + `area_objectives` |
| `solutions` | Non più usata nel nuovo sistema |
| `ai_insights` | Sostituita da `user_insights` |
| `nur_memory` | Memoria globale NUR - non necessaria |
| `nur_growth` | Non implementata |
| `encyclopedia_content` | Non usata |

---

## 🎮 Quest System

### Flusso Completo

```
Utente nuovo → Quest Cap.0 "Incontra NUR" → Chat con NUR
                    ↓
    NUR raccoglie info con [PROFILE:...] e [INSIGHT:...]
                    ↓
    Quest completata → Sblocca Cap.1 → Continue...
```

### Capitoli Quest

| Cap | Nome | Descrizione |
|-----|------|-------------|
| 0 | Il Risveglio | Prima conversazione, raccolta info base |
| 1 | Le Fondamenta | Profilo completo, prima missione |
| 2 | La Routine | Setup routine settimanale |
| 3 | La Crescita | Obiettivi per aree della vita |
| 4 | La Maestria | Streak, achievement avanzati |
| 5+ | La Trascendenza | Quest infinite, sempre nuovi obiettivi |

### Tipi di Completamento Quest

```typescript
completion_type:
  - 'first_message'    // Basta inviare un messaggio
  - 'profile_fields'   // Completare campi profilo specifici
  - 'has_objective'    // Creare almeno un obiettivo
  - 'streak'           // Raggiungere uno streak
  - 'tasks_completed'  // Completare N task
  - 'manual'           // NUR decide quando completare
```

---

## 👤 Profilo Strutturato

### Campi Raccolti da NUR

```typescript
user_profile_data:
  life_phase: 'elementari' | 'medie' | 'superiori' | 'universitario' |
              'stagista' | 'lavoratore' | 'imprenditore' | 'pensionato' | 'disoccupato'

  situation: ['no_casa', 'no_soldi', 'no_famiglia', 'no_entrate',
              'stabile', 'in_transizione', 'emergenza']  // Array

  mindset: 'fragile' | 'soffocato' | 'in_crollo' |
           'neutro' | 'determinato' |
           'guerriero' | 'indistruttibile' | 'in_decollo'

  skills: ['creativo', 'analitico', 'pratico', 'comunicatore',
           'problem_solver', 'studioso', 'artigiano', 'tecnico', 'leader']  // Array
```

### Come NUR Raccoglie i Dati

Durante la conversazione, NUR usa comandi speciali:

```
[PROFILE:life_phase|lavoratore]
[PROFILE:situation|add:no_soldi]
[PROFILE:mindset|soffocato]
[PROFILE:skills|add:creativo]
[INSIGHT:fact|Ha 28 anni, lavora come cameriere]
[INSIGHT:desire|Vuole aprire un locale]
[INSIGHT:problem|Non ha soldi per iniziare]
```

---

## 📅 Routine System

### Struttura

```typescript
routine_tasks:
  - area_id: 'health' | 'finance' | 'relationships' | ...
  - title: "Meditazione mattutina"
  - scheduled_time: "07:00"
  - duration_minutes: 15
  - frequency: 'daily' | 'weekday' | 'weekend' | 'custom'
  - frequency_days: [1, 3, 5]  // Per custom (lun, mer, ven)
  - difficulty: 'facile' | 'media' | 'difficile'
  - xp_reward: 30-500 (basato su difficoltà)
```

### XP per Difficoltà

| Difficoltà | XP Base |
|------------|---------|
| facile | 30 |
| media | 60 |
| difficile | 120 |
| epica | 250 |
| leggendaria | 500 |

---

## 🏠 10 Aree della Vita

```typescript
life_areas_config:
  1. health        - 💪 Salute
  2. finance       - 💰 Finanze
  3. relationships - ❤️ Relazioni
  4. career        - 💼 Carriera
  5. growth        - 🧠 Crescita Personale
  6. home          - 🏠 Casa/Ambiente
  7. social        - 👥 Vita Sociale
  8. hobbies       - 🎨 Hobby/Passioni
  9. spirituality  - 🙏 Spiritualità
  10. future       - 🔮 Futuro/Progetti
```

---

## 💬 Comandi NUR

### Per Profilo/Discovery
```
[INSIGHT:tipo|contenuto]     - Salva insight (fact/problem/desire/fear/strength)
[PROFILE:campo|valore]       - Aggiorna profilo strutturato
```

### Per Obiettivi
```
[AREA_OBJECTIVE:area|titolo|descrizione|perché]  - Crea obiettivo per area
[MISSION:titolo|descrizione|perché]              - Crea missione principale
[CHAPTER:titolo|descrizione]                     - Crea capitolo
[STEP:capitolo|titolo|descrizione]               - Crea step
[TASK:step|titolo|descrizione|difficoltà]        - Crea task
```

### Per Routine
```
[ROUTINE_TASK:area|titolo|orario|durata|frequenza|difficoltà]
[ROUTINE_TEMPLATE:giorno|sveglia|sonno|obblighi]
```

### Per Completamento
```
[COMPLETE:titolo]            - Marca come completato
[PROGRESS:titolo|percentuale] - Aggiorna progresso
[XP:quantità|motivo]         - Assegna XP
[QUEST_CHECK:quest_id]       - Verifica/completa quest
```

### Per Materiali (Scrivania)
```
[MATERIAL:tipo|titolo|contenuto]
[MATERIAL:link|titolo|url|descrizione]
```

---

## 🎯 Flusso Utente Completo

### 1. Nuovo Utente

```
1. Registrazione (Clerk)
2. Redirect a /la-mia-vita
3. Vede schermata onboarding con "Parla con NUR"
4. Quest attiva: "Incontra NUR" (Cap.0)
```

### 2. Prima Conversazione (Discovery Mode)

```
1. NUR si presenta
2. Chiede nome, età, lavoro
3. Salva con [INSIGHT:fact|...] e [PROFILE:life_phase|...]
4. Esplora situazione (problemi, desideri)
5. Salva con [PROFILE:situation|...], [INSIGHT:problem|...]
6. Capisce mindset e skills
7. Quando profilo completo → propone prima missione
```

### 3. Post-Onboarding

```
1. Quest Cap.0 completata → Sblocca Cap.1
2. Utente ha missione + capitoli + step + task
3. Completa task → guadagna XP → level up
4. Streak giornaliero → moltiplicatore XP
5. Nuove quest si sbloccano progressivamente
```

### 4. Routine Quotidiana

```
1. /routine mostra task del giorno
2. Utente completa task → XP
3. Fine giornata: check streak
4. Se streak mantenuto → bonus XP
5. Se streak perso → perde vita
```

---

## 📱 Pagine App

| Route | Descrizione |
|-------|-------------|
| `/` | Landing page |
| `/la-mia-vita` | Dashboard principale (missione, task attiva, XP) |
| `/chat` | Chat con NUR |
| `/quest` | Sistema quest con capitoli |
| `/routine` | Routine giornaliera |
| `/giornale` | Scrivania (materiali per area) |
| `/profilo` | Profilo utente |

---

## 🔌 API Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/ai/stream` | POST | Chat streaming con NUR |
| `/api/quests` | GET/POST | Gestione quest |
| `/api/routine` | GET/POST | Gestione routine |
| `/api/user` | GET/POST | Dati utente |
| `/api/webhooks/clerk` | POST | Sync Clerk → Supabase |

---

## 🚀 Deploy

### Variabili Ambiente Necessarie

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
```

### Ordine Migrazioni SQL

```
1. schema.sql (o schema-completo.sql)
2. 002_mission_system.sql
3. 004_game_system.sql
4. 007_quest_system.sql
5. 008_reset_user_data.sql (opzionale, per test)
```

---

## 🧹 Reset per Test

Per pulire tutti i dati utente mantenendo la struttura:

```sql
-- Esegui supabase/migrations/008_reset_user_data.sql
```

Questo resetterà:
- Tutte le conversazioni e messaggi
- Tutti gli insight e memorie NUR
- Tutti i progressi quest
- Tutti i dati routine
- Riporterà gli utenti a onboarding_completed = false
