/**
 * Agent service — connects to the local OpenCode server.
 *
 * OpenCode exposes an HTTP API at localhost:4096 (configurable).
 * We use sessions to manage conversations and SSE for streaming.
 */

import type { Clip } from '@/lib/types'
import { TEMPLATES, EFFECTS } from '@/lib/graphics'
import type { ImportedMedia } from '@/lib/media-store'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OpenCodeConfig {
  /** Base URL of the OpenCode server (default: http://127.0.0.1:4096) */
  serverUrl: string
  /** Selected model in provider/model format */
  model: string
}

export interface Session {
  id: string
  title?: string
  createdAt: string
}

export interface Message {
  info: { id: string; role: string; createdAt: string }
  parts: Part[]
}

export type Part =
  | { type: 'text'; text: string }
  | { type: 'tool-invocation'; toolInvocation: ToolInvocation }

export interface ToolInvocation {
  toolName: string
  state: 'call' | 'result'
  args: Record<string, unknown>
  result?: unknown
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>
}

/* ------------------------------------------------------------------ */
/*  Config persistence                                                 */
/* ------------------------------------------------------------------ */

const CONFIG_KEY = 'vibecut_opencode_config'

export function getStoredConfig(): OpenCodeConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { serverUrl: 'http://127.0.0.1:4096', model: '' }
}

export function storeConfig(config: OpenCodeConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

/* ------------------------------------------------------------------ */
/*  OpenCode HTTP Client                                               */
/* ------------------------------------------------------------------ */

async function api<T>(
  config: OpenCodeConfig,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${config.serverUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenCode API ${res.status}: ${text}`)
  }
  return res.json()
}

/** Check if OpenCode server is reachable */
export async function checkServer(config: OpenCodeConfig): Promise<{ healthy: boolean; version?: string }> {
  try {
    const data = await api<{ healthy: boolean; version: string }>(config, '/global/health')
    return data
  } catch {
    return { healthy: false }
  }
}

/** List available providers and models */
export async function listProviders(
  config: OpenCodeConfig,
): Promise<Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }>> {
  try {
    const data = await api<{ providers: Array<{ id: string; name: string }>; default: Record<string, string> }>(
      config, '/config/providers',
    )
    // Fetch available models
    const models = await api<Record<string, Array<{ id: string; name: string }>>>(config, '/models').catch(() => ({}) as Record<string, Array<{ id: string; name: string }>>)
    
    return data.providers.map(p => ({
      id: p.id,
      name: p.name,
      models: Array.isArray(models[p.id]) ? models[p.id] : [],
    }))
  } catch {
    return []
  }
}

/** Create a new session */
export async function createSession(
  config: OpenCodeConfig,
  title?: string,
): Promise<Session> {
  return api<Session>(config, '/session', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

/** List existing sessions */
export async function listSessions(config: OpenCodeConfig): Promise<Session[]> {
  return api<Session[]>(config, '/session')
}

/** Delete a session */
export async function deleteSession(config: OpenCodeConfig, sessionId: string): Promise<boolean> {
  return api<boolean>(config, `/session/${sessionId}`, { method: 'DELETE' })
}

/** Get messages in a session */
export async function getMessages(config: OpenCodeConfig, sessionId: string): Promise<Message[]> {
  return api<Message[]>(config, `/session/${sessionId}/message`)
}

/* ------------------------------------------------------------------ */
/*  Build timeline context for the agent                               */
/* ------------------------------------------------------------------ */

function buildTimelineContext(clips: Clip[], importedFiles: ImportedMedia[]): string {
  const lines: string[] = []
  
  lines.push('=== CURRENT TIMELINE STATE ===')
  lines.push(`Clips: ${clips.length}`)
  lines.push(`Timeline length: ${clips.reduce((max, c) => Math.max(max, c.startTime + c.durationSec), 0).toFixed(1)}s`)
  lines.push('')
  
  if (clips.length === 0) {
    lines.push('Timeline is empty.')
  } else {
    lines.push('Tracks:')
    for (const clip of clips) {
      const track = clip.tone === 'audio' ? `A${Math.floor(clip.lane) - 3}` : `V${clip.lane + 1}`
      lines.push(
        `  [${track}] "${clip.label}" ${clip.startTime.toFixed(1)}s - ${(clip.startTime + clip.durationSec).toFixed(1)}s (${clip.durationSec.toFixed(1)}s) type=${clip.tone}${clip.fileId ? ' [real file]' : ''}`,
      )
    }
  }
  
  lines.push('')
  lines.push('=== AVAILABLE MEDIA ===')
  if (importedFiles.length === 0) {
    lines.push('No media imported.')
  } else {
    for (const f of importedFiles) {
      lines.push(`  ${f.id}: "${f.name}" (${f.kind}) ${f.duration ? f.duration.toFixed(1) + 's' : 'unknown duration'}`)
    }
  }
  
  lines.push('')
  lines.push('=== MOTION GRAPHICS (Remotion) ===')
  for (const t of TEMPLATES) {
    lines.push(`  ${t.id}: ${t.name} (${t.duration}s) - ${t.description}`)
  }
  lines.push('Effects:')
  for (const e of EFFECTS) {
    lines.push(`  ${e.id}: ${e.name} (${e.duration}s)`)
  }
  lines.push('')
  lines.push('=== AGENT CAPABILITIES ===')
  lines.push('You are editing a Remotion composition. When the user asks to change the edit, emit commands on their own lines:')
  lines.push('  /add-clip <media_id_or_graphic_id> [track] [start_time] [duration]')
  lines.push('  /add-graphic <graphic_id> [track] [start_time] [duration]')
  lines.push('  /remove-clip <clip_index>')
  lines.push('  /move-clip <clip_index> <new_start_time> [new_track]')
  lines.push('  /trim-clip <clip_index> <new_duration>')
  lines.push('  /list-clips')
  lines.push('  /get-timeline')
  lines.push('Prefer building a 30-60s launch sequence: hook graphic, product clips, feature tease, end card.')
  
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/*  Streaming via SSE                                                  */
/* ------------------------------------------------------------------ */

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done'
  data: string | { name: string; args: Record<string, unknown>; result?: unknown }
}

/**
 * Send a prompt to OpenCode and stream the response via SSE.
 * Falls back to non-streaming POST if SSE is unavailable.
 */
export async function* streamPrompt(
  config: OpenCodeConfig,
  sessionId: string,
  userMessage: string,
  clips: Clip[],
  importedFiles: ImportedMedia[],
): AsyncGenerator<StreamEvent> {
  const context = buildTimelineContext(clips, importedFiles)
  const fullPrompt = `${context}\n\n=== USER REQUEST ===\n${userMessage}`

  // Queue-based SSE streaming (yield can't be used inside callbacks)
  const queue: StreamEvent[] = []
  let resolveNext: (() => void) | null = null

  function pushEvent(evt: StreamEvent) {
    queue.push(evt)
    if (resolveNext) {
      resolveNext()
      resolveNext = null
    }
  }

  // Try SSE-based streaming
  let usedSSE = false
  try {
    await api(config, `/session/${sessionId}/prompt_async`, {
      method: 'POST',
      body: JSON.stringify({
        parts: [{ type: 'text', text: fullPrompt }],
        ...(config.model ? { model: parseModelId(config.model) } : {}),
      }),
    })
    usedSSE = true

    const eventSource = new EventSource(`${config.serverUrl}/event`)
    let done = false
    const timeout = setTimeout(() => {
      if (!done) { done = true; eventSource.close(); pushEvent({ type: 'done', data: '' }) }
    }, 300_000)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'message.updated' || data.type === 'message.created') {
          const msg = data.properties?.info
          if (msg?.role === 'assistant' && data.properties?.parts) {
            for (const part of data.properties.parts) {
              if (part.type === 'text' && part.text) {
                pushEvent({ type: 'text', data: part.text })
              } else if (part.type === 'tool-invocation') {
                const ti = part.toolInvocation
                if (ti.state === 'result') {
                  pushEvent({ type: 'tool_result', data: { name: ti.toolName, args: ti.args || {}, result: ti.result } })
                }
              }
            }
          }
        }
        if (data.type === 'message.completed') {
          done = true
          clearTimeout(timeout)
          eventSource.close()
          pushEvent({ type: 'done', data: '' })
        }
      } catch { /* skip */ }
    }
    eventSource.onerror = () => {
      if (!done) {
        done = true
        clearTimeout(timeout)
        eventSource.close()
        pushEvent({ type: 'done', data: '' })
      }
    }
  } catch {
    usedSSE = false
  }

  // Fallback: non-streaming POST
  if (!usedSSE) {
    try {
      const result = await api<{ info: { role: string }; parts: Array<{ type: string; text?: string }> }>(
        config,
        `/session/${sessionId}/message`,
        {
          method: 'POST',
          body: JSON.stringify({
            parts: [{ type: 'text', text: fullPrompt }],
            ...(config.model ? { model: parseModelId(config.model) } : {}),
          }),
        },
      )
      if (result.parts) {
        for (const part of result.parts) {
          if (part.type === 'text' && part.text) {
            pushEvent({ type: 'text', data: part.text })
          }
        }
      }
      pushEvent({ type: 'done', data: '' })
    } catch (err) {
      pushEvent({ type: 'error', data: err instanceof Error ? err.message : 'Unknown error' })
      pushEvent({ type: 'done', data: '' })
    }
  }

  // Drain queue
  let idx = 0
  while (true) {
    while (idx < queue.length) {
      yield queue[idx]
      idx++
    }
    // Check if we're done
    if (queue.length > 0 && queue[queue.length - 1].type === 'done') return
    // Wait for more events
    await new Promise<void>(r => { resolveNext = r })
  }
}

/** Parse "provider/model" into OpenCode model format */
function parseModelId(model: string): { providerID: string; modelID: string } | undefined {
  const parts = model.split('/')
  if (parts.length >= 2) {
    return { providerID: parts[0], modelID: parts.slice(1).join('/') }
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/*  Timeline command parser                                            */
/* ------------------------------------------------------------------ */

export interface TimelineCommand {
  type: 'add' | 'remove' | 'move' | 'trim' | 'list' | 'get'
  clipIndex?: number
  mediaId?: string
  track?: number
  startTime?: number
  duration?: number
}

export function parseTimelineCommand(text: string): TimelineCommand | null {
  const match = text.match(/\/(add-clip|add-graphic|remove-clip|move-clip|trim-clip|list-clips|get-timeline)\s*(.*)/)
  if (!match) return null
  
  const [, cmd, args] = match
  const parts = args.trim().split(/\s+/)

  switch (cmd) {
    case 'add-clip':
    case 'add-graphic':
      return {
        type: 'add',
        mediaId: parts[0],
        track: parts[1] ? parseInt(parts[1]) : undefined,
        startTime: parts[2] ? parseFloat(parts[2]) : undefined,
        duration: parts[3] ? parseFloat(parts[3]) : undefined,
      }
    case 'remove-clip':
      return { type: 'remove', clipIndex: parts[0] ? parseInt(parts[0]) : undefined }
    case 'move-clip':
      return {
        type: 'move',
        clipIndex: parts[0] ? parseInt(parts[0]) : undefined,
        startTime: parts[1] ? parseFloat(parts[1]) : undefined,
        track: parts[2] ? parseInt(parts[2]) : undefined,
      }
    case 'trim-clip':
      return {
        type: 'trim',
        clipIndex: parts[0] ? parseInt(parts[0]) : undefined,
        duration: parts[1] ? parseFloat(parts[1]) : undefined,
      }
    case 'list-clips':
      return { type: 'list' }
    case 'get-timeline':
      return { type: 'get' }
    default:
      return null
  }
}
