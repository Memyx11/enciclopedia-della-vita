// ============================================
// COMPONENTI LEGALI PER NEXT.JS
// Copia questi componenti in: components/legal/
// ============================================

// ============================================
// 1. COOKIE BANNER
// File: components/legal/CookieBanner.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';

type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
};

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie_consent', JSON.stringify(prefs));
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setPreferences(prefs);
    setShowBanner(false);
  };

  const acceptAll = () => savePreferences({ necessary: true, analytics: true });
  const rejectOptional = () => savePreferences({ necessary: true, analytics: false });

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-4xl mx-auto">
        {!showDetails ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-700">
              Utilizziamo cookie tecnici necessari per il funzionamento del sito.{' '}
              <button onClick={() => setShowDetails(true)} className="text-blue-600 underline">
                Maggiori informazioni
              </button>
            </p>
            <div className="flex gap-2">
              <button onClick={rejectOptional} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">
                Solo necessari
              </button>
              <button onClick={acceptAll} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800">
                Accetta tutti
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Gestione Cookie</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Cookie Tecnici (Necessari)</p>
                  <p className="text-sm text-gray-600">Essenziali per login e funzionamento</p>
                </div>
                <span className="text-sm text-gray-500">Sempre attivi</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Cookie Analitici</p>
                  <p className="text-sm text-gray-600">Ci aiutano a capire come usi il sito</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <a href="/cookie-policy" className="text-sm text-blue-600 underline">Cookie Policy completa</a>
              <div className="flex gap-2">
                <button onClick={() => setShowDetails(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Indietro</button>
                <button onClick={() => savePreferences(preferences)} className="px-4 py-2 text-sm bg-black text-white rounded-lg">Salva</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Bottone per footer
export function CookieSettingsButton() {
  const reopenBanner = () => {
    localStorage.removeItem('cookie_consent');
    window.location.reload();
  };
  return (
    <button onClick={reopenBanner} className="text-sm text-gray-500 hover:text-gray-700 underline">
      Gestisci Cookie
    </button>
  );
}


// ============================================
// 2. TERMS ACCEPTANCE (per form registrazione)
// File: components/legal/TermsAcceptance.tsx
// ============================================

'use client';

import { useState } from 'react';
import Link from 'next/link';

type TermsAcceptanceProps = {
  onAcceptChange: (accepted: boolean) => void;
  required?: boolean;
};

export function TermsAcceptance({ onAcceptChange, required = true }: TermsAcceptanceProps) {
  const [accepted, setAccepted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccepted(e.target.checked);
    onAcceptChange(e.target.checked);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={handleChange}
          required={required}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
        />
        <span className="text-sm text-gray-700">
          Ho letto e accetto i{' '}
          <Link href="/termini-condizioni" className="text-blue-600 underline">Termini e Condizioni</Link>{' '}
          e la{' '}
          <Link href="/privacy-policy" className="text-blue-600 underline">Privacy Policy</Link>
          <span className="text-red-500">*</span>
        </span>
      </label>
      <div className="text-xs text-gray-500 pl-7 space-y-1">
        <p>✓ Comprendo che NUR è un'intelligenza artificiale</p>
        <p>✓ Comprendo che NUR non sostituisce consulenza professionale</p>
        <p>✓ Ho almeno 14 anni</p>
      </div>
    </div>
  );
}


// ============================================
// 3. AI DISCLAIMER (prima della chat)
// File: components/legal/AIDisclaimer.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';

// Primo messaggio di NUR (da usare nel system prompt o come messaggio iniziale)
export const NUR_FIRST_MESSAGE = `Ciao! 👋

Sono **NUR**, l'assistente virtuale di Enciclopedia della Vita.

🤖 Sono un sistema di **intelligenza artificiale** — non un essere umano.

⚠️ **Non sono** una psicologa, un medico, un avvocato o un consulente finanziario.

🆘 Se stai vivendo un momento di crisi: **Telefono Amico**: 02 2327 2327 • **Emergenze**: 112

Come posso aiutarti oggi?`;

// Componente disclaimer visivo
export function AIDisclaimer({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="font-bold text-lg">Ciao, sono NUR!</h2>
            <p className="text-sm text-gray-500">Assistente AI di Enciclopedia della Vita</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Sono un <strong>sistema di intelligenza artificiale</strong>, non un essere umano.
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Non sostituisco professionisti.</strong> Non sono psicologa, medico, avvocato o consulente.
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>In caso di crisi:</strong> Telefono Amico 02 2327 2327 • Emergenze 112
            </p>
          </div>
        </div>

        <button
          onClick={onAccept}
          className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
        >
          Ho capito, iniziamo!
        </button>
      </div>
    </div>
  );
}

// Hook per gestire visualizzazione
export function useAIDisclaimer() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  useEffect(() => {
    const accepted = sessionStorage.getItem('nur_ai_disclaimer_accepted');
    if (!accepted) {
      setShowDisclaimer(true);
    } else {
      setHasAccepted(true);
    }
  }, []);

  const acceptDisclaimer = () => {
    sessionStorage.setItem('nur_ai_disclaimer_accepted', 'true');
    setShowDisclaimer(false);
    setHasAccepted(true);
  };

  return { showDisclaimer, hasAccepted, acceptDisclaimer };
}


// ============================================
// COME USARE QUESTI COMPONENTI
// ============================================

/*
1. LAYOUT (app/layout.tsx):
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

2. FOOTER:
   import { CookieSettingsButton } from '@/components/legal/CookieBanner';
   
   <footer>
     <Link href="/privacy-policy">Privacy</Link>
     <Link href="/termini-condizioni">Termini</Link>
     <CookieSettingsButton />
   </footer>

3. FORM REGISTRAZIONE:
   import { TermsAcceptance } from '@/components/legal/TermsAcceptance';
   
   const [termsAccepted, setTermsAccepted] = useState(false);
   
   <form>
     <TermsAcceptance onAcceptChange={setTermsAccepted} />
     <button disabled={!termsAccepted}>Registrati</button>
   </form>

4. PAGINA CHAT:
   import { AIDisclaimer, useAIDisclaimer } from '@/components/legal/AIDisclaimer';
   
   export default function ChatPage() {
     const { showDisclaimer, acceptDisclaimer } = useAIDisclaimer();
     
     return (
       <>
         {showDisclaimer && <AIDisclaimer onAccept={acceptDisclaimer} />}
         <ChatInterface />
       </>
     );
   }
*/
