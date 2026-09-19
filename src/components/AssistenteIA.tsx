import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  perguntarAssistente,
  type AssistenteAction,
  type AssistenteMessage,
} from '../lib/assistente'

const MENSAGEM_INICIAL: AssistenteMessage = {
  role: 'assistant',
  content:
    'Olá! Posso consultar clientes, orçamentos, faturas, vendas rápidas e contas a pagar para ajudar no dia a dia da gráfica.',
}

const SUGESTOES = [
  'Faça um resumo da operação',
  'Quais orçamentos estão pendentes?',
  'Mostre minhas vendas rápidas',
]

export default function AssistenteIA() {
  const { cloudMode } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<AssistenteAction | null>(null)
  const [messages, setMessages] = useState<AssistenteMessage[]>([MENSAGEM_INICIAL])

  if (!cloudMode) return null

  const enviar = async (texto = input) => {
    const content = texto.trim()
    if (!content || loading) return
    const userMessage: AssistenteMessage = { role: 'user', content }
    const history = [...messages, userMessage]
    setMessages(history)
    setInput('')
    setLoading(true)
    try {
      const answer = await perguntarAssistente(history)
      setMessages((current) => [...current, { role: 'assistant', content: answer.message }])
      setPendingAction(answer.confirmation ?? null)
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Não foi possível consultar o assistente.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const confirmarAcao = async () => {
    if (!pendingAction || loading) return
    setLoading(true)
    try {
      const answer = await perguntarAssistente(messages, pendingAction)
      setMessages((current) => [...current, { role: 'assistant', content: answer.message }])
      setPendingAction(null)
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Não foi possível executar a ação.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {open && (
        <section
          className="fixed bottom-20 right-4 z-40 flex w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          aria-label="Assistente do sistema"
        >
          <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div>
              <h2 className="font-semibold">Assistente GraficaUp</h2>
              <p className="text-xs text-slate-300">Consultas seguras sobre sua operação</p>
            </div>
            <button
              type="button"
              className="rounded p-1 text-xl leading-none text-slate-300 hover:bg-slate-700 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
            >
              ×
            </button>
          </header>

          <div className="flex max-h-[min(60vh,28rem)] min-h-64 flex-col gap-3 overflow-y-auto bg-slate-50 p-3" role="log" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'self-end bg-blue-600 text-white'
                    : 'self-start bg-white text-slate-700 shadow-sm ring-1 ring-slate-200'
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="self-start rounded-xl bg-white px-3 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                Consultando os dados...
              </div>
            )}
          </div>

          {pendingAction && !loading && (
            <div className="border-t border-amber-200 bg-amber-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Confirmação necessária
              </p>
              <p className="mt-1 text-sm text-amber-900">A operação acima ainda não foi executada.</p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-amber-100"
                  onClick={() => setPendingAction(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  onClick={() => void confirmarAcao()}
                >
                  Confirmar ação
                </button>
              </div>
            </div>
          )}

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-200 bg-white px-3 py-2">
              {SUGESTOES.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
                  onClick={() => void enviar(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
            onSubmit={(event) => {
              event.preventDefault()
              void enviar()
            }}
          >
            <textarea
              className="min-h-10 max-h-24 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Digite sua pergunta..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void enviar()
                }
              }}
              aria-label="Mensagem para o assistente"
              disabled={loading || Boolean(pendingAction)}
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || Boolean(pendingAction) || !input.trim()}
              aria-label="Enviar mensagem"
            >
              Enviar
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
      >
        {open ? 'Fechar' : '✨ Assistente'}
      </button>
    </>
  )
}
