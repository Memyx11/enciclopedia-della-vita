# ✅ CHECKLIST INTEGRAZIONE LEGALE

## Enciclopedia della Vita — NUR

---

## 📁 FILE INCLUSI

```
legal/
├── PRIVACY-POLICY.md        → Converti in pagina /privacy-policy
├── TERMINI-E-CONDIZIONI.md  → Converti in pagina /termini-condizioni
├── COOKIE-POLICY.md         → Converti in pagina /cookie-policy
├── COMPONENTI-REACT.tsx     → Copia i componenti nel progetto
└── GUIDA-FISCALE.md         → La tua guida personale
```

---

## 🔧 INTEGRAZIONE STEP-BY-STEP

### 1. Crea le pagine legali

```bash
# Se usi App Router (Next.js 13+)
mkdir -p app/privacy-policy
mkdir -p app/termini-condizioni
mkdir -p app/cookie-policy
```

Copia il contenuto dei file .md in pagine React.

### 2. Aggiungi Cookie Banner al layout

```tsx
// app/layout.tsx
import { CookieBanner } from '@/components/legal/CookieBanner';

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
```

### 3. Footer con link legali

```tsx
<footer>
  <Link href="/privacy-policy">Privacy Policy</Link>
  <Link href="/termini-condizioni">Termini e Condizioni</Link>
  <Link href="/cookie-policy">Cookie Policy</Link>
  <CookieSettingsButton />
</footer>
```

### 4. Checkbox nel form registrazione

```tsx
import { TermsAcceptance } from '@/components/legal/TermsAcceptance';

<TermsAcceptance onAcceptChange={setTermsAccepted} />
<button disabled={!termsAccepted}>Registrati</button>
```

### 5. Disclaimer AI prima della chat

```tsx
import { AIDisclaimer, useAIDisclaimer } from '@/components/legal/AIDisclaimer';

const { showDisclaimer, acceptDisclaimer } = useAIDisclaimer();

{showDisclaimer && <AIDisclaimer onAccept={acceptDisclaimer} />}
```

---

## ⚠️ DA COMPILARE

Prima di andare live, sostituisci:

- `[INSERIRE EMAIL]` → la tua email di supporto
- `[INSERIRE URL]` → URL del sito
- `[INSERIRE QUANDO DISPONIBILE]` → P.IVA (quando l'avrai)

---

## ✅ VERIFICA FINALE

- [ ] Pagina /privacy-policy funziona
- [ ] Pagina /termini-condizioni funziona
- [ ] Pagina /cookie-policy funziona
- [ ] Cookie banner appare al primo accesso
- [ ] Link "Gestisci Cookie" nel footer
- [ ] Checkbox termini nel form registrazione
- [ ] Disclaimer AI prima della prima chat
- [ ] NUR dice di essere AI nel primo messaggio

---

## 🚀 SEI COMPLIANT CON

✅ GDPR (Reg. UE 2016/679)
✅ AI Act (Reg. UE 2024/1689) — dal 2 feb 2025
✅ Direttiva ePrivacy (Cookie)
✅ Codice del Consumo
✅ Legge 4/2013 (Professioni non regolamentate)
