import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: NextRequest) {
    try {
        const { message, userId, areas } = await request.json()

        // Build context from user areas
        let userContext = 'ANALISI UTENTE:\n'
        
        const areeNomi: Record<string, string> = {
            salute: 'Salute Fisica',
            soldi: 'Finanze', 
            relazioni: 'Relazioni',
            lavoro: 'Carriera',
            hobby: 'Hobby e Svago',
            crescita: 'Crescita Personale',
            casa: 'Casa e Ambiente',
            sociale: 'Vita Sociale',
            spirituale: 'Benessere Interiore',
            futuro: 'Progetti Futuri'
        }

        const areeCritiche: string[] = []
        const areeOk: string[] = []
        const areeForti: string[] = []

        if (areas && areas.length > 0) {
            areas.forEach((area: any) => {
                const nome = areeNomi[area.area_type] || area.area_type
                if (area.progress < 30) {
                    areeCritiche.push(nome + ' (' + area.progress + '%)')
                } else if (area.progress < 70) {
                    areeOk.push(nome + ' (' + area.progress + '%)')
                } else {
                    areeForti.push(nome + ' (' + area.progress + '%)')
                }
            })
        }

        if (areeCritiche.length > 0) {
            userContext += '🚨 AREE CRITICHE: ' + areeCritiche.join(', ') + '\n'
        }
        if (areeOk.length > 0) {
            userContext += '⚠️ DA MIGLIORARE: ' + areeOk.join(', ') + '\n'
        }
        if (areeForti.length > 0) {
            userContext += '✅ AREE FORTI: ' + areeForti.join(', ') + '\n'
        }

        const systemPrompt = `SEI: Coach personale dell'Enciclopedia della Vita.
RUOLO: Aiuti le persone a migliorare ogni aspetto della loro vita con consigli pratici e specifici.

${userContext}

REGOLE RISPOSTA:
- Max 200 parole
- Usa numeri specifici quando possibile
- Dai consigli AZIONABILI (cose da fare oggi/questa settimana)
- Formato: emoji + testo strutturato
- Se proponi un piano usa questo formato:
  🎯 OBIETTIVO: [titolo]
  📋 STEP:
  1. [primo passo concreto]
  2. [secondo passo]
  3. [terzo passo]
  ⚡ AZIONE IMMEDIATA: [cosa fare ORA]

PRIORITA: Focus sulle aree critiche dell'utente. Se non ci sono dati, chiedi informazioni per personalizzare i consigli.

TONO: Diretto, motivante, pratico. Come un coach che vuole risultati.`

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
                { role: 'user', content: message }
            ],
            system: systemPrompt
        })

        const textContent = response.content.find(block => block.type === 'text')
        const aiResponse = textContent ? (textContent as any).text : 'Mi dispiace, non ho capito.'

        return NextResponse.json({ response: aiResponse })

    } catch (error) {
        console.error('AI Error:', error)
        return NextResponse.json(
            { error: 'Errore nella risposta AI' },
            { status: 500 }
        )
    }
}
