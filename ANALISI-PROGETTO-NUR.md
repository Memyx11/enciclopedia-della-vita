# 🔍 ANALISI COMPLETA PROGETTO NUR

**Data:** 11 Dicembre 2025

---

## 🗑️ FILE DA ELIMINARE (MORTI)

| File | Motivo |
|------|--------|
| `/lib/nur/personality-new.ts` | Mai importato |
| `/lib/nur/web-search.ts` | Mai usato |
| `/lib/nur/embeddings.ts` | Solo return null |
| `/lib/nur/knowledge.ts` | Mai importato |
| `/app/api/chat/route.ts` | Legacy, frontend usa /api/ai/stream |
| `/BACKUP-29nov/` | Backup vecchio |
| `/OLD-FILES/` | File obsoleti |

---

## ⚠️ FILE PROBLEMATICI

### 1. `/lib/nur/tools.ts` (33KB)
- Definisce 12 tool MAI USATI
- /api/ai/stream usa [MISSION:...] parsing manuale
- **Decisione:** Eliminare o refactorare per usare Tool Anthropic

### 2. `/lib/nur/index.ts` - NurCore
- Classe quasi mai chiamata
- Frontend usa SOLO /api/ai/stream che NON usa NurCore
- **Decisione:** Semplificare, rimuovere classe

### 3. `/api/ai/route.ts`
- API non-streaming, frontend non la usa
- **Decisione:** Verificare se serve, altrimenti eliminare

---

## 🔴 PROBLEMI DA RISOLVERE

1. **DUE buildUserContext diverse** → Usare solo buildFullUserContext()
2. **SONNET_PROMPT senza personalità** → Aggiungere base da personality.ts
3. **Regole emoji ignorate** → Spostarle ALL'INIZIO del prompt
4. **Nessuna guida task** → Aggiungere sezione FLUSSO

---

## ✅ FILE CHE FUNZIONANO

- personality.ts, mission.ts, memory.ts, journal.ts, goals.ts
- la-mia-vita/page.tsx, chat/page.tsx
- Tutti i componenti /components/

---

## 📁 /nur-brain/ - Knowledge Base

Contiene contenuti per RAG (mai integrato):
- L0-Fondamento, L1-Saggezza, L2-Salute...
- Collegato a knowledge.ts (morto)
- **Decisione:** Mantenere per futuro, ma non prioritario

---

## 🧹 COMANDI CLEANUP

```bash
# Eliminare file morti
rm lib/nur/personality-new.ts
rm lib/nur/web-search.ts  
rm lib/nur/embeddings.ts
rm lib/nur/knowledge.ts
rm app/api/chat/route.ts
rm -rf BACKUP-29nov/
rm -rf OLD-FILES/
```

---

**Documento completo in /mnt/user-data/outputs/**
