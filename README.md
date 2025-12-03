# 📚 Enciclopedia della Vita v2.0

Coach AI personale per ogni aspetto della vita.

## 🚀 Stack Tecnologico

- **Frontend:** Next.js 14 + React 18 + TypeScript
- **AI:** Anthropic Claude (claude-sonnet-4-20250514)
- **Database:** Supabase (PostgreSQL + Auth)
- **Styling:** CSS Modules + Glassmorphism Design

## 📋 Setup Rapido

### 1. Configura Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un progetto
2. Vai su **SQL Editor** ed esegui tutto il contenuto di `supabase/schema.sql`
3. Vai su **Settings > API** e copia:
   - Project URL
   - anon/public key

### 2. Configura Environment

Modifica `.env.local`:

```bash
# Già configurato
ANTHROPIC_API_KEY=sk-ant-...

# DA CONFIGURARE - copia da Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
```

### 3. Avvia il progetto

```bash
cd ~/Desktop/enciclopedia-vita-new
npm run dev
```

Apri: http://localhost:3000

## 📁 Struttura Progetto

```
enciclopedia-vita-new/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Layout + Auth Provider
│   ├── auth/page.tsx         # Login/Signup
│   ├── dashboard/page.tsx    # La Mia Vita
│   ├── chat/page.tsx         # Coach AI
│   ├── soluzioni/page.tsx    # Le Mie Soluzioni
│   └── api/ai/route.ts       # Claude API
├── components/ui/
│   └── Header.tsx            # Header navigazione
├── contexts/
│   └── AuthContext.tsx       # Autenticazione
├── lib/
│   └── supabase.ts           # Client + Types
├── styles/
│   └── globals.css           # Stili globali
└── supabase/
    └── schema.sql            # Schema database
```

## 🎨 Pagine

| Pagina | Route | Descrizione |
|--------|-------|-------------|
| Home | `/` | Landing page con categorie |
| Auth | `/auth` | Login/Registrazione |
| Dashboard | `/dashboard` | Le 10 aree della vita |
| Chat | `/chat` | Coach AI con Claude |
| Soluzioni | `/soluzioni` | Gestione piani proposti |

## 🔐 Database Schema

- **profiles** - Profili utente (auto-creati)
- **life_areas** - 10 aree vita per utente
- **solutions** - Piani proposti dal Coach AI
- **conversations** - Storico chat
- **ai_insights** - Insight generati dall'AI
- **encyclopedia_content** - Contenuti enciclopedia

Tutte le tabelle hanno Row Level Security (RLS) attivato.

## 🤖 AI Features

Il Coach AI:
- Analizza i dati delle aree vita dell'utente
- Identifica aree critiche (< 30%)
- Propone piani strutturati con step
- Personalizza consigli in base al profilo

## 🚀 Deploy su Vercel

1. Push su GitHub
2. Importa su Vercel
3. Configura Environment Variables
4. Deploy!

---

**Owner:** Memyx11 (Elias Rizzo)
**Data:** Novembre 2025
