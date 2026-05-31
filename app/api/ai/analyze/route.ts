import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { buildAnalyzeSystemPrompt } from '@/lib/ai/prompts'
import { TOOL_DEFINITIONS, executeTool } from '@/lib/ai/tools'

const client = new Anthropic()

export async function POST() {
  const systemPrompt = buildAnalyzeSystemPrompt(new Date().toISOString().split('T')[0])
  const messages: MessageParam[] = [
    {
      role: 'user',
      content:
        'Please analyze my current portfolio. Identify concentration risks, opportunities, and any rebalancing suggestions.',
    },
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let continueLoop = true
        while (continueLoop) {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: systemPrompt,
            tools: TOOL_DEFINITIONS,
            messages,
          })

          for (const block of response.content) {
            if (block.type === 'text') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: block.text })}\n\n`))
            }
          }

          if (response.stop_reason === 'end_turn') {
            continueLoop = false
            break
          }

          if (response.stop_reason === 'tool_use') {
            messages.push({ role: 'assistant', content: response.content })
            const toolResults: MessageParam['content'] = []
            for (const block of response.content) {
              if (block.type !== 'tool_use') continue
              const result = await executeTool(block.name, block.input as Record<string, unknown>)
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result as string,
              })
            }
            messages.push({ role: 'user', content: toolResults })
          } else {
            continueLoop = false
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        )
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
