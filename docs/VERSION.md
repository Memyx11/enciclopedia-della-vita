# NUR: LIFE RPG - Version Master

## Versione Corrente: 1.0.0-alpha

**Data Inizio Rebuild:** 2025-12-19
**Stato:** In Sviluppo

---

## Changelog

### v1.0.0-alpha (2025-12-19)
- [x] Phase 1: Setup & Database
  - [x] Schema completo v1 (001_nur_life_v1.sql)
  - [x] Seed 10 aree vita (002_seed_life_areas.sql)
  - [x] RLS policies sicure
- [x] Phase 2: Folder Structure
  - [x] Nuova organizzazione cartelle (lib/supabase, lib/gamification)
  - [ ] Rimozione vecchi file (da fare durante cleanup)
- [x] Phase 3: Core Infrastructure
  - [x] Supabase client (lib/supabase/client.ts)
  - [x] TypeScript types (lib/supabase/types.ts)
- [x] Phase 4: NUR AI System
  - [x] System prompt GDD-based (lib/nur/prompt.ts)
  - [x] Tools 14 implementati (lib/nur/tools.ts)
  - [x] Narrative memory (updateNarrativeMemory in tools.ts)
  - [ ] ChromaDB "NUR Brain" integration (placeholder)
  - [x] Sistema Prove (create_test, verify_test tools)
- [x] Phase 5: Gamification
  - [x] XP system (lib/gamification/xp.ts)
  - [x] Levels + titles (lib/supabase/types.ts)
  - [x] Streak + lives (lib/gamification/streak.ts)
  - [x] Achievements (lib/gamification/achievements.ts)
- [ ] Phase 6: UI Pages
  - [ ] Home dashboard
  - [ ] Chat (update)
  - [ ] Aree grid
  - [ ] Area detail
  - [ ] Routine
  - [ ] Profilo
  - [ ] Skills
  - [ ] Materiali
- [ ] Phase 7: Goals & Tasks
  - [ ] CRUD goals
  - [ ] Mission 10/10
  - [ ] Chain system
  - [ ] CRUD tasks
  - [ ] Boss task
- [ ] Phase 8: Polish
  - [ ] Animations
  - [ ] PWA
  - [ ] Notifications

---

## Architettura

### Stack Tecnologico
- **Frontend:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Clerk
- **AI:** Claude API (Anthropic) + ChromaDB (NUR Brain L0-L7)
- **Styling:** Tailwind CSS

### Struttura Cartelle Target
```
app/
├── (auth)/           # Pagine protette
│   ├── home/         # Dashboard RPG
│   ├── chat/         # Chat con NUR
│   ├── aree/         # Lista 10 aree
│   │   └── [slug]/   # Dettaglio area + goals
│   ├── routine/      # Routine giornaliera
│   ├── profilo/      # Profilo utente
│   ├── skills/       # Skill tree
│   └── materiali/    # Inventario materiali
├── (public)/         # Pagine pubbliche
│   ├── login/
│   └── signup/
├── api/
│   ├── nur/          # NUR AI endpoints
│   │   ├── chat/     # Streaming chat
│   │   └── tools/    # Tool execution
│   └── webhooks/     # Clerk webhooks
└── onboarding/       # Flusso onboarding

lib/
├── nur/
│   ├── prompt.ts     # System prompt
│   ├── tools.ts      # Tool definitions
│   ├── memory.ts     # Narrative memory
│   └── brain.ts      # ChromaDB integration
├── supabase/
│   ├── client.ts     # Supabase client
│   └── types.ts      # Generated types
├── gamification/
│   ├── xp.ts         # XP calculations
│   ├── levels.ts     # Level progression
│   └── streak.ts     # Streak management
└── utils/

components/
├── nur/             # NUR-related components
├── ui/              # Shared UI components
├── gamification/    # XP bars, badges, etc.
└── areas/           # Area-related components
```

---

## Database Schema Overview

### Tabelle Principali
| Tabella | Descrizione | Stato |
|---------|-------------|-------|
| profiles | Dati utente + gamification | ✅ Ready |
| life_areas | 10 aree vita | ✅ Ready |
| goals | Obiettivi (3 tipi) | ✅ Ready |
| goal_dependencies | Chain system | ✅ Ready |
| tasks | Task giornalieri | ✅ Ready |
| routine_items | Routine ricorrenti | ✅ Ready |
| skills | Skill con 5 livelli | ✅ Ready |
| materials | Materiali con 5 rarità | ✅ Ready |
| goal_skills | Link goals→skills | ✅ Ready |
| goal_materials | Link goals→materials | ✅ Ready |
| nur_memory | Memoria narrativa NUR | ✅ Ready |
| chat_messages | Storico chat | ✅ Ready |
| activity_log | Log attività | ✅ Ready |
| achievements | Achievement sbloccati | ✅ Ready |
| current_activities | Timer attività | ✅ Ready |
| user_tests | Sistema Prove | ✅ Ready |
| achievement_definitions | Template achievement | ✅ Ready |

---

## NUR AI System

### Personalità
- **Nome:** NUR (نور = Luce in arabo)
- **Ruolo:** Compagna AI provocatoria ma supportiva
- **Tono:** Diretto, sfacciato, ironico, mai robotico

### Tools Pianificati
1. `save_memory` - Salva nella memoria narrativa
2. `update_profile` - Aggiorna profilo utente
3. `create_goal` - Crea obiettivo
4. `complete_goal` - Completa obiettivo
5. `create_task` - Crea task
6. `complete_task` - Completa task
7. `award_xp` - Assegna XP
8. `add_skill` - Aggiunge skill
9. `add_material` - Aggiunge materiale
10. `create_test` - Crea prova (Sistema Prove)
11. `verify_test` - Verifica prova
12. `web_search` - Ricerca web (esistente)
13. `query_brain` - Query ChromaDB (NUR Brain)

### Sistema Prove
Test che NUR assegna per:
- Verificare qualità dichiarate dall'utente
- Costruire fiducia mentale per task/obiettivi
- **Mentali:** NUR può verificare direttamente
- **Fisici:** L'utente risponde onestamente

---

## Gamification

### Livelli
- Livello 1-10: Principiante
- Livello 11-20: Apprendista
- Livello 21-30: Guerriero
- Livello 31-40: Maestro
- Livello 40+: Leggenda

### XP Sources
- Task completato: 10-50 XP
- Goal completato: 50-200 XP
- Boss task: 100 XP
- Streak bonus: +10% per giorno
- Achievement: Variabile

### Formula XP → Level
```
XP_required = 100 * level^1.5
```

---

## Note di Sviluppo

### Priorità Pagine
1. Home (dashboard RPG)
2. Chat (NUR)
3. Aree (grid)
4. Area detail (+ goals)

### ChromaDB "NUR Brain"
Livelli memoria:
- L0: Contesto immediato
- L1-L7: Memoria a lungo termine stratificata

### Onboarding
Due fasi:
1. Test interazione NUR-UI-User
2. Raccolta dati utente come da GDD
