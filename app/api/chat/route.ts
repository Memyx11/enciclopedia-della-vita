import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    let systemPrompt = 'Sei un assistente personale premuroso e intelligente.';
    let chatMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        chatMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatMessages,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    
    return NextResponse.json({ message: { content: reply } });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: { content: 'Errore. Riprova!' } }, { status: 500 });
  }
}
