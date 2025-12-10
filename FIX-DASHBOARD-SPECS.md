# 🚨 FIX URGENTE: Dashboard NUR Gaming

**Progetto:** `/Users/eliasrizzo/Desktop/enciclopedia-della-vita/`
**File da modificare:** `/app/dashboard/page.tsx`
**Data:** 11 Dicembre 2025

---

## ❌ PROBLEMI ATTUALI

### 1. GERARCHIA CONFUSA
Il Capitolo e la Task hanno lo stesso nome "Completare sviluppo NUR" - non ha senso!

### 2. CHAIN LOGIC NON FUNZIONA
Tutte le task sono 🔒 LOCKED! Una dovrebbe essere ● ATTIVA (la prima non completata).

### 3. TABS FUORI POSIZIONE
I tabs (Scrivania/Dashboard/Note) sono SEPARATI dalla task-section invece che DENTRO.

### 4. BOTTOM NAV INCOMPLETA
Solo 3 items. Manca: 📅 Calendario

### 5. DESTINAZIONE FINALE CONFUSA
- Mostra "0/?" invece di conteggio reale
- Non chiaro se locked/unlocked

---

## 🔄 CHAIN LOGIC (Cruciale!)

```typescript
// Pseudo-codice per determinare task attiva
function getActiveTask(tasks: Task[]): Task | null {
    const sorted = tasks.sort((a, b) => a.order_index - b.order_index);
    const activeTask = sorted.find(t => t.status !== 'completed');
    return activeTask || null;
}

function getTaskState(task: Task, activeTask: Task | null): 'done' | 'current' | 'locked' {
    if (task.status === 'completed') return 'done';
    if (task.id === activeTask?.id) return 'current';
    return 'locked';
}
```

**REGOLA:** Solo UNA task può essere attiva alla volta!

---

## ✅ CHECKLIST

- [ ] Chain Logic: Solo 1 task attiva
- [ ] Tabs dentro task-section (non separati!)
- [ ] Objectives list: 3 stati (done/current/locked)
- [ ] Journey nodes orizzontali
- [ ] Mission card locked/unlocked
- [ ] Bottom nav: 4 items

---

**Vedi documento completo in /mnt/user-data/outputs/**
