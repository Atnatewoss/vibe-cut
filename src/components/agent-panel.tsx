import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  Mic,
  MoreHorizontal,
  Paperclip,
  PanelRight,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'

const MODES = ['Agent', 'Ask', 'Plan'] as const
const MODELS = [
  'Cursor Grok 4.6 Medium',
  'Cursor Grok 4.6',
  'Claude 4.6 Sonnet',
  'GPT-5.4',
]

type Mode = (typeof MODES)[number]

type Menu = 'mode' | 'model' | null

function CursorMark() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className="text-muted">
      <rect
        x="1.25"
        y="1.25"
        width="8.5"
        height="8.5"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <rect
        x="6.25"
        y="6.25"
        width="8.5"
        height="8.5"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
      />
    </svg>
  )
}

function MenuList({
  items,
  active,
  onPick,
}: {
  items: readonly string[]
  active: string
  onPick: (value: string) => void
}) {
  return (
    <div className="absolute bottom-[calc(100%+6px)] left-0 z-20 min-w-[220px] overflow-hidden rounded-lg border border-line-strong bg-raised py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className={`flex w-full items-center px-3 py-1.5 text-left text-[12.5px] transition-colors ${
            item === active
              ? 'bg-active text-bright'
              : 'text-muted hover:bg-hovered'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export function AgentPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>('Agent')
  const [model, setModel] = useState(MODELS[0])
  const [menu, setMenu] = useState<Menu>(null)
  const [tabTitle, setTabTitle] = useState('New Agent')
  const composerRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        setMenu(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const send = () => {
    const next = input.trim()
    if (!next) return
    if (messages.length === 0) {
      setTabTitle(next.length > 22 ? `${next.slice(0, 22)}…` : next)
    }
    setMessages([...messages, next])
    setInput('')
    setMenu(null)
  }

  const newChat = () => {
    setMessages([])
    setInput('')
    setTabTitle('New Agent')
    setMenu(null)
  }

  return (
    <aside className="flex w-[400px] shrink-0 flex-col border-l border-line bg-surface font-sans text-[13px] text-muted">
      {/* Tab bar */}
      <div className="flex h-8 shrink-0 items-stretch border-b border-line">
        <div className="flex min-w-0 flex-1 items-stretch">
          <div className="flex min-w-0 items-center gap-2 border-r border-line bg-raised px-3">
            <span className="truncate text-[13px] text-fg">{tabTitle}</span>
            <button
              type="button"
              aria-label="Close agent"
              onClick={newChat}
              className="grid size-4 shrink-0 place-items-center rounded text-faint hover:bg-hovered hover:text-fg"
            >
              <X size={11} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 text-faint">
          <button
            type="button"
            aria-label="New agent"
            onClick={newChat}
            className="grid size-6 place-items-center rounded hover:bg-hovered hover:text-fg"
          >
            <Plus size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Agent menu"
            className="grid size-6 place-items-center rounded hover:bg-hovered hover:text-fg"
          >
            <MoreHorizontal size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Toggle panel layout"
            className="grid size-6 place-items-center rounded hover:bg-hovered hover:text-fg"
          >
            <PanelRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className="mb-4 ml-8 rounded-xl bg-raised px-3.5 py-2.5 text-[13px] leading-5 text-fg"
          >
            {message}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="px-3 pb-3" ref={composerRef}>
        <div className="rounded-xl border border-line-strong bg-raised shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-colors focus-within:border-faint">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Plan, Build, / for skills, @ for context"
            className="h-[108px] w-full resize-none bg-transparent px-3.5 pt-3 text-[13.5px] leading-5 text-fg outline-none placeholder:text-faint"
          />
          <div className="flex items-center justify-between gap-1 px-2 pb-2">
            <div className="flex min-w-0 items-center gap-1">
              {/* Mode selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenu(menu === 'mode' ? null : 'mode')}
                  className="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-muted hover:bg-hovered hover:text-fg"
                >
                  <span className="grid size-5 place-items-center rounded-full border border-line-strong bg-active">
                    <CursorMark />
                  </span>
                  <span className="text-[12.5px]">{mode}</span>
                  <ChevronDown size={12} className="text-faint" />
                </button>
                {menu === 'mode' && (
                  <MenuList
                    items={MODES}
                    active={mode}
                    onPick={(value) => {
                      setMode(value as Mode)
                      setMenu(null)
                    }}
                  />
                )}
              </div>

              {/* Model selector */}
              <div className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => setMenu(menu === 'model' ? null : 'model')}
                  className="flex h-7 max-w-[210px] items-center gap-1 rounded-full bg-active px-2 text-muted transition-colors hover:bg-hovered hover:text-fg"
                >
                  <Sparkles size={12} className="shrink-0 text-faint" />
                  <span className="truncate text-[12px]">{model}</span>
                </button>
                {menu === 'model' && (
                  <MenuList
                    items={MODELS}
                    active={model}
                    onPick={(value) => {
                      setModel(value)
                      setMenu(null)
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={() => {}}
              />
              <button
                type="button"
                aria-label="Add context"
                onClick={() => fileRef.current?.click()}
                className="grid size-7 place-items-center rounded-md text-faint hover:bg-hovered hover:text-fg"
              >
                <Paperclip size={15} strokeWidth={1.7} />
              </button>
              <button
                type="button"
                aria-label="Voice input"
                className="grid size-7 place-items-center rounded-md text-faint hover:bg-hovered hover:text-fg"
              >
                <Mic size={15} strokeWidth={1.7} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
