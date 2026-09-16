import { anthropicClient, enforceLimit, GENERATION_MODEL, preparePost, questionFrom, unavailable, verifySession } from './_shared.js'
import { generationInput, systemPrompt } from './_prompt.js'

export default async function chat(request, response) {
  try {
    if (!preparePost(request, response)) return
    const session = await verifySession(request)
    if (!session) { response.status(401).json({ error: 'Generated answers are limited to passphrase holders. Course search is open to everyone.' }); return }
    if (!questionFrom(request)) { response.status(400).json({ error: 'Enter a question under 2,000 characters.' }); return }
    if (!await enforceLimit('chat', session.jti, response)) return
    if (!await enforceLimit('daily', 'all', response)) return
    const language = ['zh', 'ja', 'ko', 'en'].includes(request.body.answerLanguage) ? request.body.answerLanguage : 'en'
    const stream = await anthropicClient().messages.create({ model: GENERATION_MODEL, max_tokens: 1024, stream: true,
      system: systemPrompt(language), messages: [{ role: 'user', content: generationInput(request.body) }] })
    response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    function disconnect() { stream.controller.abort() }
    response.on('close', disconnect)
    try {
      for await (const event of stream) if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') response.write(`${JSON.stringify({ text: event.delta.text })}\n`)
      response.write(`${JSON.stringify({ done: true })}\n`)
    } catch { response.write(`${JSON.stringify({ error: 'The answer was interrupted. Please try again.' })}\n`) }
    finally { response.off('close', disconnect); response.end() }
  } catch { unavailable(response) }
}
