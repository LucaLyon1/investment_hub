import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { aiIdeas } from '@/lib/db/schema'
import type { NewAiIdea } from '@/lib/db/schema'
import {
  buildIdeasSystemPrompt,
  buildRecapSystemPrompt,
  buildAnalyzeSystemPrompt,
} from './prompts'
import { TOOL_DEFINITIONS, executeTool } from './tools'

const client = new Anthropic()

export type AgentMode = 'ideas' | 'morning_recap' | 'analyze'

export interface AgentResult {
  text: string
  ideas?: ParsedIdea[]
  recapData?: RecapData
}

interface ParsedIdea {
  ticker: string | null
  assetClass: string
  signalType: string
  riskLevel: string
  title: string
  reasoning: string
  sources: string[]
}

export interface RecapData {
  overnightSummary: string
  topMovers: { ticker: string; changePct: number; note: string }[]
  actionItems: { signalType: string; title: string; reasoning: string }[]
  headlines: { title: string; source: string }[]
}

function buildSystemPrompt(mode: AgentMode): string {
  const date = new Date().toISOString().split('T')[0]
  if (mode === 'ideas') return buildIdeasSystemPrompt(date)
  if (mode === 'morning_recap') return buildRecapSystemPrompt(date)
  return buildAnalyzeSystemPrompt(date)
}

function extractJsonBlock(text: string, key = 'ideas'): unknown | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    return key === 'ideas' ? parsed.ideas : parsed
  } catch {
    return null
  }
}

export async function runAgent(
  mode: AgentMode,
  userMessage: string,
  onChunk?: (text: string) => void
): Promise<AgentResult> {
  const messages: MessageParam[] = [{ role: 'user', content: userMessage }]
  const systemPrompt = buildSystemPrompt(mode)

  let finalText = ''

  // Agentic loop
  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages,
    })

    // Collect text from this response turn
    for (const block of response.content) {
      if (block.type === 'text') {
        finalText += block.text
        onChunk?.(block.text)
      }
    }

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      // Add assistant message with tool calls
      messages.push({ role: 'assistant', content: response.content })

      // Execute all tool calls and collect results
      const toolResults: MessageParam['content'] = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>
        )
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result as string,
        })
      }

      messages.push({ role: 'user', content: toolResults })
      continue
    }

    break
  }

  const result: AgentResult = { text: finalText }

  if (mode === 'ideas') {
    const ideas = extractJsonBlock(finalText, 'ideas') as ParsedIdea[] | null
    if (ideas?.length) {
      result.ideas = ideas
      await persistIdeas(ideas)
    }
  }

  if (mode === 'morning_recap') {
    const recapData = extractJsonBlock(finalText, 'recap') as RecapData | null
    if (recapData) result.recapData = recapData
  }

  return result
}

async function persistIdeas(ideas: ParsedIdea[]): Promise<void> {
  const now = new Date()
  const rows: NewAiIdea[] = ideas.map((idea) => ({
    id: nanoid(),
    ticker: idea.ticker ?? null,
    assetClass: (idea.assetClass ?? 'portfolio') as NewAiIdea['assetClass'],
    signalType: idea.signalType as NewAiIdea['signalType'],
    riskLevel: idea.riskLevel as NewAiIdea['riskLevel'],
    title: idea.title,
    reasoning: idea.reasoning,
    sources: idea.sources?.length ? JSON.stringify(idea.sources) : null,
    status: 'pending',
    generatedAt: now,
    actedAt: null,
  }))

  if (rows.length) {
    await db.insert(aiIdeas).values(rows)
  }
}
