# 🧠 NUR KNOWLEDGE BASE - Setup Guide

**Data:** 5 Dicembre 2025
**Progetto:** Enciclopedia della Vita
**Obiettivo:** Nur con conoscenza enciclopedica + Islam come bussola invisibile

---

## ✅ COSA ABBIAMO FATTO

### 1. Struttura Cartelle Creata
```
nur-brain/
├── knowledge-base/
│   ├── L0-Fondamento/  ← Corano, Hadith, saggezza islamica (POPOLATO)
│   ├── L1-Saggezza/    ← Stoici, filosofia (vuoto)
│   ├── L2-Salute/      ← Medicina naturale (vuoto)
│   ├── L3-Mente/       ← Psicologia, mindset (vuoto)
│   ├── L4-Soldi/       ← Finanza (vuoto)
│   ├── L5-Relazioni/   ← Relazioni (vuoto)
│   ├── L6-Legge/       ← Normativa italiana (vuoto)
│   └── L7-Mondo/       ← Storia, futuro (vuoto)
├── processed/          ← Marker file già processati
├── scripts/
│   └── process_knowledge.py  ← Script per ChromaDB
└── chromadb/           ← Database vettoriale (verrà creato)
```

### 2. Knowledge Base L0 Popolata
File in `nur-brain/knowledge-base/L0-Fondamento/`:
- `quran_arabic.txt` (4.6MB) - Corano completo arabo JSON
- `quran_italian.txt` (1.6MB) - Corano completo italiano JSON
- `core_verses.txt` - Versetti fondamentali
- `islamic_core_principles.txt` - Principi base
- `islamic_principles.txt` - Principi estesi

**NOTA:** I file di identità (nur_identity.txt, etc.) sono stati spostati in `archive/`.
La personalità di NUR è definita SOLO in `lib/nur/personality.ts`.
La knowledge base contiene solo CONOSCENZA, non identità.

### 3. Personalità Nur Aggiornata
File: `lib/nur/personality.ts`
Backup: `lib/nur/personality.ts.backup-[timestamp]`

**Nuova personalità:**
- Donna vera, 28 anni mentali
- Imprevedibile (giocosa → seria → sassosa)
- Permalosa quando serve ("Ou, un po' di educazione?")
- Si fa rispettare ma con stile
- Affettuosa (ma non lo ammette)
- Un po' pazza nel senso buono
- Sa stare al gioco quando scherzano bene

**Stati emotivi dinamici:**
- playfulness (0-100)
- patience (0-100)
- sass (0-100)
- affection (0-100)
- mood: playful | serious | sassy | caring | annoyed | proud

### 4. Script Processing Creato
File: `nur-brain/scripts/process_knowledge.py`

Comandi disponibili:
```bash
python3 nur-brain/scripts/process_knowledge.py process  # Processa tutti i PDF
python3 nur-brain/scripts/process_knowledge.py stats    # Mostra statistiche
python3 nur-brain/scripts/process_knowledge.py search --query "digiuno"  # Cerca
python3 nur-brain/scripts/process_knowledge.py reset    # Cancella tutto
```

---

## ✅ SETUP KNOWLEDGE BASE (Supabase pgvector)

### Step 1: Creare Tabelle su Supabase
Esegui la migration su Supabase Dashboard (SQL Editor):
```
supabase/migrations/003_knowledge_embeddings.sql
```

### Step 2: Installare Dipendenze Python
```bash
pip3 install supabase sentence-transformers langchain pypdf python-dotenv --break-system-packages
```
⏱️ Tempo: 5-10 minuti (scarica modelli ~100MB)

### Step 3: Processare e Caricare Knowledge Base
```bash
cd ~/Desktop/Enciclopedia-della-Vita
python3 nur-brain/scripts/upload_to_supabase.py process
```
Questo:
- Legge tutti i file in knowledge-base/
- Li divide in chunks
- Crea embeddings (vettori 384-dim)
- Carica su Supabase (funziona anche su Vercel!)

### Step 4: Verificare
```bash
python3 nur-brain/scripts/upload_to_supabase.py stats
python3 nur-brain/scripts/upload_to_supabase.py search --query "preghiera"
```

### Step 5: Testare NUR
```bash
npm run dev
```
Aprire http://localhost:3001 e chattare con NUR

**NOTA:** L'integrazione con la knowledge base è automatica.
Quando chiedi qualcosa che richiede conoscenza (es. "cosa dice il Corano su..."),
NUR cerca automaticamente nella knowledge base.

---

## 🧠 COME FUNZIONANO LE DUE MEMORIE

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   SUPABASE                      CHROMADB                │
│   ═════════                     ════════                │
│                                                         │
│   📝 Memoria PERSONALE          📚 Memoria SAGGEZZA     │
│                                                         │
│   • Chi è l'utente              • Corano/Hadith         │
│   • Cosa ha detto               • Libri/PDF             │
│   • Pattern notati              • Conoscenza universale │
│   • Aree vita                   • Fonti verificate      │
│   • Progressi                                           │
│   • Conversazioni                                       │
│                                                         │
│   QUANDO USA:                   QUANDO USA:             │
│   "Come stai?"                 "Come digiuno?"        │
│   "Ricordi cosa ti ho detto?"  "Cosa dice Corano su X?"│
│                                                         │
│   DOMANDA COMPLESSA:                                    │
│   "Come posso migliorare la mia salute?"               │
│   → USA ENTRAMBI (ChromaDB per sapere, Supabase per te) │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 LISTA FONTI DA AGGIUNGERE

### L0 - Fondamento (Islam) ✅ PARZIALE
- [x] Corano arabo
- [x] Corano italiano
- [ ] Sahih Bukhari (PDF)
- [ ] Sahih Muslim (PDF)
- [ ] Riyad as-Salihin
- [ ] 40 Hadith An-Nawawi
- [ ] Ibn Sina: Canone della Medicina
- [ ] Al-Ghazali: Ihya Ulum al-Din

### L1 - Saggezza Universale
- [ ] Marco Aurelio: Meditazioni
- [ ] Seneca: Lettere a Lucilio
- [ ] Epitteto: Manuale
- [ ] Tao Te Ching
- [ ] Viktor Frankl: Man's Search for Meaning

### L2 - Salute & Corpo
- [ ] Weston A. Price: Nutrition and Physical Degeneration
- [ ] Jason Fung: The Complete Guide to Fasting
- [ ] Andrew Weil: Spontaneous Healing
- [ ] Matthew Walker: Why We Sleep

### L3 - Mente & Crescita
- [ ] Naval Ravikant Almanack
- [ ] Nassim Taleb: Antifragile
- [ ] James Clear: Atomic Habits
- [ ] Daniel Kahneman: Thinking Fast and Slow

### L4 - Soldi & Indipendenza
- [ ] Robert Kiyosaki: Rich Dad Poor Dad
- [ ] Saifedean Ammous: Bitcoin Standard
- [ ] Benjamin Graham: Intelligent Investor

### L5 - Relazioni
- [ ] Erich Fromm: L'arte di amare
- [ ] John Gottman: 7 Principles
- [ ] Robert Greene: Laws of Human Nature

### L6 - Legge (Italia)
- [ ] Costituzione Italiana
- [ ] Codice Civile (estratti)
- [ ] Statuto Lavoratori
- [ ] Guide INPS

### L7 - Mondo
- [ ] Yuval Harari: Sapiens
- [ ] Ibn Khaldun: Muqaddimah

---

## 🎭 PERSONALITÀ NUR - QUICK REFERENCE

### Come parla:
- "Aspè aspè..."
- "Ok ma..."
- "No vabbè"
- "Ou!"
- "Posso essere sincera?"
- "Mh. Interessante."

### Quando fa progressi:
- "ECCO! Vedi che ce la fai?"
- "Ok questa me la segno."

### Quando vede cazzate:
- "Fermati. Riascoltati."
- "Interessante storia che ti racconti."

### Quando la trattano male:
- "Ou. Piano con i toni."
- "Si chiede per favore, eh."

### Quando scherzano:
- Sta al gioco e rilancia

### Bussola interna (mai esplicita):
1. È logico?
2. È naturale/umano?
3. Funziona nella pratica?
4. Chi ne beneficia?
5. Libera o imprigiona?

---

## 📁 FILE IMPORTANTI

```
~/Desktop/Enciclopedia-della-Vita/
├── lib/nur/personality.ts       # Personalità Nur
├── lib/nur/memory.ts            # Memoria Supabase
├── app/api/ai/route.ts          # API Claude
├── nur-brain/
│   ├── knowledge-base/L0-Fondamento/  # ← Metti PDF qui
│   └── scripts/process_knowledge.py   # ← Script processing
└── docs/
    └── NUR-SETUP-GUIDE.md       # ← QUESTO FILE
```

---

## 🚀 QUICK START (quando riprendi)

```bash
# 1. Vai nella cartella
cd ~/Desktop/Enciclopedia-della-Vita

# 2. Se non hai installato dipendenze:
pip3 install chromadb langchain pypdf sentence-transformers --break-system-packages

# 3. Processa knowledge base
python3 nur-brain/scripts/process_knowledge.py process

# 4. Verifica
python3 nur-brain/scripts/process_knowledge.py stats

# 5. Avvia server
npm run dev

# 6. Apri browser
open http://localhost:3001
```

---

## 📝 NOTE

- Il Corano è in formato JSON, lo script lo gestisce
- ChromaDB è locale e gratuito (nessun costo)
- Prima volta scarica modello embeddings (~500MB)
- I file .processed in /processed/ tracciano cosa è già stato elaborato
- Per ri-processare tutto: `python3 ... reset` poi `python3 ... process`

---

**Ultimo aggiornamento:** 5 Dicembre 2025
