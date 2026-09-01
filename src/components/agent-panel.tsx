import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  ChevronDown,
  Mic,
  Paperclip,
  Plus,
  Sparkles,
  X,
  Settings,
  Wrench,
  CheckCircle2,
  Loader2,
  Circle,
  MessageSquare,
  Zap,
  Play,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  checkServer,
  createSession,
  streamPrompt,
  parseTimelineCommand,
  getStoredConfig,
  storeConfig,
  type OpenCodeConfig,
  type ChatMessage,
} from '@/lib/agent'
import type { Clip } from '@/lib/types'
import { findGraphic } from '@/lib/graphics'
import type { ImportedMedia } from '@/lib/media-store'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentPanelProps {
  clips: Clip[]
  importedFiles: ImportedMedia[]
  onAddClip: (clip: Clip) => void
  onRemoveClip: (clipId: string) => void
  onMoveClip: (clipId: string, startTime: number, lane: number) => void
  onTrimClip: (clipId: string, duration: number) => void
}

const MODES = ['Agent', 'Ask', 'Plan'] as const
type Mode = (typeof MODES)[number]

/* ------------------------------------------------------------------ */
/*  Settings Popover                                                   */
/* ------------------------------------------------------------------ */

function SettingsPopover({
  config,
  onSave,
  onClose,
}: {
  config: OpenCodeConfig
  onSave: (config: OpenCodeConfig) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState(config)

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="fixed right-4 top-10 z-50 w-[320px] rounded-xl border border-[#2a2a35] bg-[#1a1a22] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2a2a35] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Settings size={13} className="text-[#666]" />
            <span className="text-[12px] font-medium text-[#ccc]">Settings</span>
          </div>
          <button onClick={onClose} className="grid size-5 place-items-center rounded text-[#666] hover:bg-[#2a2a35] hover:text-[#aaa]">
            <X size={12} />
          </button>
        </div>

        <div className="border-b border-[#2a2a35] px-4 py-3">
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#666]">Server URL</span>
          <input
            value={local.serverUrl}
            onChange={(e) => setLocal({ ...local, serverUrl: e.target.value })}
            className="w-full rounded-lg border border-[#2a2a35] bg-[#111116] px-3 py-1.5 text-[11.5px] text-[#ccc] outline-none focus:border-[#555] font-mono"
            placeholder="http://127.0.0.1:4096"
          />
        </div>

        <div className="px-4 py-3">
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#666]">Model</span>
          <input
            value={local.model}
            onChange={(e) => setLocal({ ...local, model: e.target.value })}
            className="w-full rounded-lg border border-[#2a2a35] bg-[#111116] px-3 py-1.5 text-[11.5px] text-[#ccc] outline-none focus:border-[#555] font-mono"
            placeholder="anthropic/claude-sonnet-4-20250514"
          />
        </div>

        <div className="flex justify-end border-t border-[#2a2a35] px-4 py-2.5">
          <button
            onClick={() => { onSave(local); onClose() }}
            className="rounded-lg bg-[#3b82f6] px-4 py-1.5 text-[11.5px] font-medium text-white hover:bg-[#2563eb]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Model Selector Dropdown                                            */
/* ------------------------------------------------------------------ */

function ModelSelector({
  config,
  onConfigChange,
  serverRunning,
  serverStarting,
  onStartServer,
  onStopServer,
  onOpenSettings,
}: {
  config: OpenCodeConfig
  onConfigChange: (config: OpenCodeConfig) => void
  serverRunning: boolean
  serverStarting: boolean
  onStartServer: () => void
  onStopServer: () => void
  onOpenSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleSelectOpenCode = () => {
    setOpen(false)
    if (!serverRunning && !serverStarting) {
      onStartServer()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 max-w-[200px] items-center gap-1.5 rounded-full bg-[#1e1e28] px-2.5 text-[#888] transition-colors hover:bg-[#2a2a35] hover:text-[#ccc]"
      >
        <Circle
          size={7}
          className={
            serverRunning
              ? 'fill-[#60a5fa] text-[#60a5fa]'
              : serverStarting
                ? 'fill-[#f59e0b] text-[#f59e0b] animate-pulse'
                : 'fill-[#555] text-[#555]'
          }
        />
        <span className="truncate text-[10.5px]">
          {serverRunning ? 'OpenCode' : serverStarting ? 'Starting...' : config.model || 'Select model'}
        </span>
        <ChevronDown size={10} className="shrink-0 text-[#555]" />
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 min-w-[220px] overflow-hidden rounded-lg border border-[#2a2a35] bg-[#1a1a22] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {/* OpenCode option */}
          <button
            type="button"
            onClick={handleSelectOpenCode}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] ${
              serverRunning ? 'bg-[#1e3a5f]/30 text-[#60a5fa]' : 'text-[#888] hover:bg-[#222]'
            }`}
          >
            <Circle
              size={7}
              className={
                serverRunning
                  ? 'fill-[#60a5fa] text-[#60a5fa]'
                  : serverStarting
                    ? 'fill-[#f59e0b] text-[#f59e0b] animate-pulse'
                    : 'fill-[#555] text-[#555]'
              }
            />
            <span className="font-medium">OpenCode</span>
            {serverRunning && <span className="ml-auto text-[10px] text-[#60a5fa]/60">active</span>}
          </button>

          {serverRunning && (
            <button
              type="button"
              onClick={() => { onStopServer(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#f59e0b] hover:bg-[#2a2a1a]"
            >
              <Circle size={7} className="fill-[#f59e0b] text-[#f59e0b]" />
              <span>Stop server</span>
            </button>
          )}

          <div className="my-1 border-t border-[#2a2a35]" />

          {/* Custom model input */}
          <div className="px-3 py-2">
            <input
              value={config.model}
              onChange={(e) => {
                const newConfig = { ...config, model: e.target.value }
                onConfigChange(newConfig)
                storeConfig(newConfig)
              }}
              className="w-full rounded border border-[#2a2a35] bg-[#111116] px-2 py-1 text-[11px] text-[#ccc] outline-none focus:border-[#555] font-mono"
              placeholder="provider/model-name"
            />
          </div>

          <div className="border-t border-[#2a2a35]" />

          <button
            type="button"
            onClick={() => { onOpenSettings(); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#888] hover:bg-[#222]"
          >
            <Settings size={12} />
            <span>All settings</span>
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tool Call Display                                                  */
/* ------------------------------------------------------------------ */

function ToolCallBadge({ name, result }: { name: string; args: Record<string, unknown>; result?: unknown }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-1.5 ml-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 rounded-md bg-[#1e1e28] px-2 py-1 text-[10.5px] text-[#888] hover:bg-[#252530]"
      >
        {result != null ? (
          <CheckCircle2 size={9} className="text-[#60a5fa]" />
        ) : (
          <Loader2 size={9} className="animate-spin text-[#60a5fa]" />
        )}
        <Wrench size={8} />
        <span>{name.replace(/_/g, ' ')}</span>
      </button>
      {expanded && result != null && (
        <pre className="mt-1 ml-5 max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-[#111116] p-2 text-[10px] text-[#666]">
          {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Markdown Message Display                                           */
/* ------------------------------------------------------------------ */

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="ml-1 mt-1 rounded-xl px-3.5 py-2.5 text-[12.5px] leading-5 text-[#bbb]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
          a: ({ node, ...props }) => <a className="text-[#60a5fa] hover:underline" target="_blank" rel="noreferrer" {...props} />,
          ul: ({ node, ...props }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0" {...props} />,
          ol: ({ node, ...props }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0" {...props} />,
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          h1: ({ node, ...props }) => <h1 className="mb-2 mt-4 text-lg font-semibold text-[#eee] first:mt-0" {...props} />,
          h2: ({ node, ...props }) => <h2 className="mb-2 mt-4 text-base font-semibold text-[#eee] first:mt-0" {...props} />,
          h3: ({ node, ...props }) => <h3 className="mb-2 mt-3 text-sm font-semibold text-[#eee] first:mt-0" {...props} />,
          pre: ({ node, ...props }) => (
            <pre className="my-2 overflow-x-auto rounded-md border border-[#2a2a35] bg-[#0c0c10] p-3 text-[11.5px] font-mono leading-relaxed" {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const isInline = !className || !className.includes('language-')
            if (!isInline) {
              return <code className={className} {...props}>{children}</code>
            }
            return (
              <code className="rounded bg-[#2a2a35] px-1 py-0.5 font-mono text-[11.5px] text-[#ddd]" {...props}>
                {children}
              </code>
            )
          },
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-2 border-l-2 border-[#60a5fa] pl-3 italic text-[#888]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AgentPanel({
  clips,
  importedFiles,
  onAddClip,
  onRemoveClip,
  onMoveClip,
  onTrimClip,
}: AgentPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [mode, setMode] = useState<Mode>('Agent')
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState<OpenCodeConfig>(getStoredConfig)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingTools, setStreamingTools] = useState<Array<{ name: string; args: Record<string, unknown>; result?: unknown }>>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tabTitle, setTabTitle] = useState('New Agent')
  const [serverRunning, setServerRunning] = useState(false)
  const [serverStarting, setServerStarting] = useState(false)
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [pendingCommands, setPendingCommands] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modeMenuRef = useRef<HTMLDivElement>(null)
  const messageQueue = useRef<string[]>([])
  const processingQueue = useRef(false)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Close mode menu on outside click
  useEffect(() => {
    if (!modeMenuOpen) return
    const close = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [modeMenuOpen])

  // Save config
  const handleSaveConfig = useCallback((newConfig: OpenCodeConfig) => {
    setConfig(newConfig)
    storeConfig(newConfig)
  }, [])

  // Check server status on mount
  useEffect(() => {
    let cancelled = false
    checkServer(config).then(status => {
      if (!cancelled) setServerRunning(status.healthy)
    })
    return () => { cancelled = true }
  }, [config])

  // Start OpenCode server
  const handleStartServer = useCallback(async () => {
    setServerStarting(true)
    try {
      const port = parseInt(config.serverUrl.split(':').pop() || '4096')
      await invoke('start_opencode', { port })
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500))
        const status = await checkServer(config)
        if (status.healthy) {
          setServerRunning(true)
          break
        }
      }
    } catch (err) {
      console.error('Failed to start OpenCode:', err)
    } finally {
      setServerStarting(false)
    }
  }, [config])

  // Stop OpenCode server
  const handleStopServer = useCallback(async () => {
    try {
      await invoke('stop_opencode')
      setServerRunning(false)
    } catch (err) {
      console.error('Failed to stop OpenCode:', err)
    }
  }, [])

  // Create OpenCode session lazily
  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId
    const session = await createSession(config, tabTitle)
    setSessionId(session.id)
    return session.id
  }, [sessionId, config, tabTitle])

  // Parse timeline commands into a pending list shown to the user for approval
  const collectTimelineCommands = useCallback((text: string) => {
    const lines = text.split('\n')
    const found: string[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (parseTimelineCommand(trimmed)) {
        found.push(trimmed)
      }
    }
    if (found.length > 0) {
      setPendingCommands(prev => [...prev, ...found])
    }
  }, [])

  // Apply a parsed timeline command
  const applyCommand = useCallback((cmdText: string) => {
    const cmd = parseTimelineCommand(cmdText)
    if (!cmd) return

    switch (cmd.type) {
      case 'add': {
        const media = importedFiles.find(f => f.id === cmd.mediaId || f.name === cmd.mediaId)
        if (media) {
          const isAudio = media.kind === 'audio'
          const track = cmd.track ?? (isAudio ? 4 : 0)
          const clampedTrack = isAudio ? Math.max(4, Math.min(6, track)) : Math.max(0, Math.min(3, track))
          
          onAddClip({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            label: media.name,
            lane: clampedTrack,
            startTime: cmd.startTime ?? 0,
            durationSec: cmd.duration ?? media.duration ?? 5,
            tone: media.kind as Clip['tone'],
            fileId: media.id,
          })
          return
        }
        const graphic = cmd.mediaId ? findGraphic(cmd.mediaId) : undefined
        if (graphic) {
          const isEffect = graphic.kind === 'effect'
          const isAudio = graphic.id.startsWith('bgm') || graphic.id.startsWith('sfx')
          const track = cmd.track ?? (isAudio ? 4 : isEffect ? 2 : 0)
          const clampedTrack = isAudio ? Math.max(4, Math.min(6, track)) : Math.max(0, Math.min(3, track))
          
          onAddClip({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            label: graphic.name,
            lane: clampedTrack,
            startTime: cmd.startTime ?? 0,
            durationSec: cmd.duration ?? graphic.duration,
            tone: isAudio ? 'audio' : isEffect ? 'effect' : 'template',
            templateId: isEffect || isAudio ? undefined : graphic.id,
            effectId: isEffect ? graphic.id : undefined,
          })
        }
        return
      }
      case 'remove': {
        if (cmd.clipIndex != null && cmd.clipIndex >= 0 && cmd.clipIndex < clips.length) {
          onRemoveClip(clips[cmd.clipIndex].id)
        }
        return
      }
      case 'move': {
        if (cmd.clipIndex != null && cmd.clipIndex >= 0 && cmd.clipIndex < clips.length) {
          const clip = clips[cmd.clipIndex]
          onMoveClip(clip.id, cmd.startTime ?? clip.startTime, cmd.track ?? clip.lane)
        }
        return
      }
      case 'trim': {
        if (cmd.clipIndex != null && cmd.clipIndex >= 0 && cmd.clipIndex < clips.length) {
          const clip = clips[cmd.clipIndex]
          onTrimClip(clip.id, cmd.duration ?? clip.durationSec)
        }
        return
      }
    }
  }, [clips, importedFiles, onAddClip, onRemoveClip, onMoveClip, onTrimClip])

  // Approve and run all pending commands
  const approveCommands = useCallback(() => {
    const commands = [...pendingCommands]
    setPendingCommands([])
    for (const cmd of commands) {
      applyCommand(cmd)
    }
  }, [pendingCommands, applyCommand])

  // Reject / dismiss pending commands
  const dismissCommands = useCallback(() => {
    setPendingCommands([])
  }, [])

  // Process next queued message
  const processNextMessage = useCallback(async () => {
    if (processingQueue.current || messageQueue.current.length === 0) return
    processingQueue.current = true

    const text = messageQueue.current.shift()!
    setQueueCount(messageQueue.current.length)
    setIsStreaming(true)
    setStreamingText('')
    setStreamingTools([])

    try {
      const sid = await ensureSession()
      let fullText = ''
      const tools: Array<{ name: string; args: Record<string, unknown>; result?: unknown }> = []

      for await (const event of streamPrompt(config, sid, text, clips, importedFiles)) {
        switch (event.type) {
          case 'text':
            fullText += event.data as string
            setStreamingText(fullText)
            break
          case 'tool_result': {
            const td = event.data as { name: string; args: Record<string, unknown>; result?: unknown }
            tools.push(td)
            setStreamingTools([...tools])
            break
          }
          case 'error':
            fullText += `\n\nError: ${event.data}`
            setStreamingText(fullText)
            break
        }
      }

      collectTimelineCommands(fullText)

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: fullText,
        toolCalls: tools.length > 0 ? tools : undefined,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Could not connect to OpenCode server.'}`,
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      setStreamingTools([])
      processingQueue.current = false

      if (messageQueue.current.length > 0) {
        processNextMessage()
      }
    }
  }, [config, clips, importedFiles, sessionId, ensureSession, collectTimelineCommands])

  // Send message
  const send = useCallback(async () => {
    const text = input.trim()
    if (!text) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    if (messages.length === 0) {
      setTabTitle(text.length > 24 ? `${text.slice(0, 24)}...` : text)
    }

    if (isStreaming) {
      messageQueue.current.push(text)
      setQueueCount(messageQueue.current.length)
      return
    }

    // Check server connection
    if (!serverRunning) {
      const status = await checkServer(config)
      if (!status.healthy) {
        setMessages(prev => [...prev, {
          role: 'assistant' as const,
          content: 'OpenCode server is not running. Select OpenCode from the model dropdown to start it.',
        }])
        return
      }
      setServerRunning(true)
    }

    messageQueue.current.push(text)
    processNextMessage()
  }, [input, isStreaming, config, messages, sessionId, serverRunning, processNextMessage])

  // New chat
  const newChat = useCallback(() => {
    setMessages([])
    setInput('')
    setSessionId(null)
    setTabTitle('New Agent')
    setIsStreaming(false)
    setStreamingText('')
    setStreamingTools([])
    messageQueue.current = []
    setQueueCount(0)
    setPendingCommands([])
  }, [])

  return (
    <aside className="flex w-[400px] shrink-0 flex-col border-l border-[#1e1e28] bg-[#111116] font-sans text-[13px] text-[#999]">
      {showSettings && (
        <SettingsPopover config={config} onSave={handleSaveConfig} onClose={() => setShowSettings(false)} />
      )}

      {/* Tab bar */}
      <div className="flex h-[34px] shrink-0 items-stretch border-b border-[#1e1e28]">
        <div className="flex min-w-0 flex-1 items-stretch">
          <div className="flex min-w-0 items-center gap-2 border-r border-[#1e1e28] bg-[#16161e] px-3">
            <MessageSquare size={12} className="shrink-0 text-[#666]" />
            <span className="truncate text-[12px] text-[#ccc]">{tabTitle}</span>
            <button
              type="button"
              onClick={newChat}
              className="grid size-4 shrink-0 place-items-center rounded text-[#555] hover:bg-[#2a2a35] hover:text-[#999]"
            >
              <X size={10} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 text-[#555]">
          <button
            type="button"
            onClick={newChat}
            className="grid size-6 place-items-center rounded hover:bg-[#2a2a35] hover:text-[#999]"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="grid size-6 place-items-center rounded hover:bg-[#2a2a35] hover:text-[#999]"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="grid size-10 place-items-center rounded-xl border border-[#2a2a35] bg-[#16161e]">
              <Zap size={18} className="text-[#555]" />
            </div>
            <div className="text-[12px] text-[#666]">
              {serverRunning ? 'Ask the agent to edit your timeline' : 'Select OpenCode to begin'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <Circle
                size={7}
                className={
                  serverRunning
                    ? 'fill-[#60a5fa] text-[#60a5fa]'
                    : serverStarting
                      ? 'fill-[#f59e0b] text-[#f59e0b] animate-pulse'
                      : 'fill-[#555] text-[#555]'
                }
              />
              <span className="text-[#555]">
                {serverRunning ? 'Connected to OpenCode' : serverStarting ? 'Starting server...' : 'Use the model dropdown to start'}
              </span>
            </div>
            {!serverRunning && !serverStarting && (
              <button
                onClick={handleStartServer}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#3b82f6]/10 px-3 py-1.5 text-[11px] text-[#60a5fa] hover:bg-[#3b82f6]/20"
              >
                <Play size={10} />
                Start OpenCode
              </button>
            )}
            {serverRunning && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {['Build a 30s launch sequence', 'Add launch-reveal then an end-card', 'Show me the current clips'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-lg border border-[#2a2a35] bg-[#16161e] px-2.5 py-1 text-[10.5px] text-[#666] hover:border-[#444] hover:text-[#999]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className="mb-4">
            {message.role === 'user' ? (
              <div className="ml-6 rounded-xl bg-[#1e1e28] px-3.5 py-2.5 text-[12.5px] leading-5 text-[#ddd]">
                {message.content}
              </div>
            ) : (
              <div>
                {message.toolCalls?.map((tc, ti) => (
                  <ToolCallBadge key={ti} name={tc.name} args={tc.args} result={tc.result} />
                ))}
                {message.content && (
                  <MarkdownMessage content={message.content} />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Streaming */}
        {isStreaming && (
          <div>
            {streamingTools.map((tc, ti) => (
              <ToolCallBadge key={ti} name={tc.name} args={tc.args} result={tc.result} />
            ))}
            {streamingText && (
              <MarkdownMessage content={streamingText} />
            )}
            {!streamingText && streamingTools.length === 0 && (
              <div className="ml-1 flex items-center gap-2 text-[11px] text-[#555]">
                <Loader2 size={11} className="animate-spin" />
                Thinking...
              </div>
            )}
          </div>
        )}

        {/* Queue indicator */}
        {queueCount > 0 && (
          <div className="ml-1 mt-2 flex items-center gap-2 rounded-md bg-[#1e1e28] px-2.5 py-1.5 text-[11px] text-[#888]">
            <Loader2 size={10} className="animate-spin text-[#f59e0b]" />
            <span>{queueCount} message{queueCount > 1 ? 's' : ''} queued</span>
          </div>
        )}

        {/* Pending command approval */}
        {pendingCommands.length > 0 && (
          <div className="mb-3 rounded-xl border border-[#2a2a35] bg-[#16161e] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#888]">
                {pendingCommands.length} timeline {pendingCommands.length > 1 ? 'commands' : 'command'} pending
              </span>
              <button
                type="button"
                onClick={dismissCommands}
                className="text-[#555] hover:text-[#999]"
              >
                <X size={12} />
              </button>
            </div>
            <div className="mb-2 max-h-32 space-y-1 overflow-y-auto rounded-md bg-[#0c0c10] p-2 font-mono text-[10.5px] text-[#bbb]">
              {pendingCommands.map((cmd, i) => (
                <div key={i}>{cmd}</div>
              ))}
            </div>
            <button
              type="button"
              onClick={approveCommands}
              className="w-full rounded-lg bg-[#3b82f6] px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-[#2563eb]"
            >
              Approve & run
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer - fixed at bottom */}
      <div className="shrink-0 px-3 pb-3">
        <div className="rounded-xl border border-[#2a2a35] bg-[#16161e] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-colors focus-within:border-[#444]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={isStreaming ? "Message queued — type more..." : "Plan, build, @ for context..."}
            className="h-[100px] w-full resize-none bg-transparent px-3.5 pt-3 text-[13px] leading-5 text-[#ddd] outline-none placeholder:text-[#444]"
          />
          <div className="flex items-center justify-between gap-1 px-2 pb-2">
            <div className="flex min-w-0 items-center gap-1">
              {/* Mode selector */}
              <div className="relative" ref={modeMenuRef}>
                <button
                  type="button"
                  onClick={() => setModeMenuOpen(!modeMenuOpen)}
                  className="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[#888] hover:bg-[#2a2a35] hover:text-[#ccc]"
                >
                  <span className="grid size-5 place-items-center rounded-full border border-[#333] bg-[#1e1e28]">
                    <Sparkles size={10} className="text-[#888]" />
                  </span>
                  <span className="text-[11.5px]">{mode}</span>
                  <ChevronDown size={11} className="text-[#555]" />
                </button>
                {modeMenuOpen && (
                  <div className="absolute bottom-[calc(100%+6px)] left-0 z-20 min-w-[140px] overflow-hidden rounded-lg border border-[#2a2a35] bg-[#1a1a22] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                    {MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMode(m); setModeMenuOpen(false) }}
                        className={`flex w-full items-center px-3 py-1.5 text-left text-[12px] ${
                          m === mode ? 'bg-[#2a2a35] text-[#ccc]' : 'text-[#888] hover:bg-[#222]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Model selector with OpenCode dropdown */}
              <ModelSelector
                config={config}
                onConfigChange={handleSaveConfig}
                serverRunning={serverRunning}
                serverStarting={serverStarting}
                onStartServer={handleStartServer}
                onStopServer={handleStopServer}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>

            <div className="flex shrink-0 items-center">
              <button
                type="button"
                className="grid size-7 place-items-center rounded-md text-[#555] hover:bg-[#2a2a35] hover:text-[#999]"
              >
                <Paperclip size={14} />
              </button>
              <button
                type="button"
                className="grid size-7 place-items-center rounded-md text-[#555] hover:bg-[#2a2a35] hover:text-[#999]"
              >
                <Mic size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
