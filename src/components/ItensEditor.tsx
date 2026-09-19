import { useState } from 'react'
import type { DocumentoItem, Item } from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Button, Modal, MoneyInput, inputClass } from '../components/ui'
import { ItemFormFields, novoItem } from '../pages/Itens'
import { formatCents } from '../lib/money'

export function novoDocumentoItem(impostoPct = 0): DocumentoItem {
  return {
    itemId: null, descricao: '', qtd: 1,
    largura: 0, altura: 0, m2: 0, precoM2: 0, valorUnit: 0, total: 0,
    impostoPct,
  }
}

/** Recalcula m², valor unitário (a partir do preço/m², a menos que sobrescrito) e total. */
export function recalcularItem(item: DocumentoItem, manterValorUnit = false): DocumentoItem {
  const m2 = Number((item.largura * item.altura).toFixed(4))
  let valorUnit = item.valorUnit
  if (!manterValorUnit && m2 > 0 && item.precoM2 > 0) {
    valorUnit = Math.round(m2 * item.precoM2)
  }
  const total = Math.round(item.qtd * valorUnit)
  return { ...item, m2, valorUnit, total }
}

export default function ItensEditor({
  itens,
  onChange,
  impostoPadrao = 0,
}: {
  itens: DocumentoItem[]
  onChange: (itens: DocumentoItem[]) => void
  impostoPadrao?: number
}) {
  const { db, saveItem } = useData()
  const { showToast } = useToast()
  const [quickItemIdx, setQuickItemIdx] = useState<number | null>(null)
  const [quickItem, setQuickItem] = useState<Item>(novoItem())

  const update = (idx: number, patch: Partial<DocumentoItem>, manterValorUnit = false) => {
    const list = [...itens]
    list[idx] = recalcularItem({ ...list[idx], ...patch }, manterValorUnit)
    onChange(list)
  }

  const selectCatalogo = (idx: number, itemId: string) => {
    if (!itemId) {
      update(idx, { itemId: null })
      return
    }
    const cat = db.itens.find((i) => i.id === itemId)
    if (!cat) return
    update(idx, {
      itemId,
      descricao: cat.descricao ? `${cat.nome} - ${cat.descricao}` : cat.nome,
      precoM2: cat.precoM2,
      valorUnit: cat.precoUnitario,
    })
  }

  const clonarItem = (idx: number) => {
    const copia = { ...itens[idx] }
    onChange([...itens.slice(0, idx + 1), copia, ...itens.slice(idx + 1)])
  }

  const salvarQuickItem = async () => {
    if (!quickItem.nome.trim()) {
      showToast('Preencha o nome do produto.', 'error')
      return
    }
    await saveItem(quickItem)
    if (quickItemIdx !== null) selectCatalogoAposCriar(quickItemIdx, quickItem)
    showToast('Produto criado e adicionado!')
    setQuickItemIdx(null)
  }

  const selectCatalogoAposCriar = (idx: number, cat: Item) => {
    update(idx, {
      itemId: cat.id,
      descricao: cat.descricao ? `${cat.nome} - ${cat.descricao}` : cat.nome,
      precoM2: cat.precoM2,
      valorUnit: cat.precoUnitario,
    })
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {itens.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3"
          >
            {/* Linha 1: item do catálogo + descrição em largura total */}
            <div className="flex gap-1.5">
              <select
                className={`${inputClass} flex-1`}
                value={item.itemId ?? ''}
                onChange={(e) => selectCatalogo(idx, e.target.value)}
              >
                <option value="">— Produto do catálogo —</option>
                {db.itens.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="success"
                small
                onClick={() => {
                  setQuickItem(novoItem())
                  setQuickItemIdx(idx)
                }}
              >
                + Novo
              </Button>
              <div className="flex gap-0.5 self-center">
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                  onClick={() => clonarItem(idx)}
                  aria-label="Clonar produto"
                  title="Clonar produto"
                >
                  ⎘
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-red-500 hover:bg-red-50"
                  onClick={() => onChange(itens.filter((_, i) => i !== idx))}
                  aria-label="Remover produto"
                  title="Remover produto"
                >
                  ✕
                </button>
              </div>
            </div>
            <textarea
              rows={2}
              className={`${inputClass} resize-y`}
              placeholder="Descrição (livre)"
              value={item.descricao}
              onChange={(e) => update(idx, { descricao: e.target.value }, true)}
            />

            {/* Linha 2: campos numéricos */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              <label>
                <span className="mb-0.5 block text-xs text-slate-500">Qtd</span>
                <input
                  type="number" min={1} step={1}
                  className={inputClass}
                  value={item.qtd || ''}
                  onChange={(e) => update(idx, { qtd: parseFloat(e.target.value) || 0 })}
                />
              </label>
              <label>
                <span className="mb-0.5 block text-xs text-slate-500">Larg. (m)</span>
                <input
                  type="number" min={0} step={0.01}
                  className={inputClass}
                  value={item.largura || ''}
                  onChange={(e) => update(idx, { largura: parseFloat(e.target.value) || 0 })}
                />
              </label>
              <label>
                <span className="mb-0.5 block text-xs text-slate-500">Alt. (m)</span>
                <input
                  type="number" min={0} step={0.01}
                  className={inputClass}
                  value={item.altura || ''}
                  onChange={(e) => update(idx, { altura: parseFloat(e.target.value) || 0 })}
                />
              </label>
              <div>
                <span className="mb-0.5 block text-xs text-slate-500">m²</span>
                <span className="block py-2 text-sm text-slate-600">
                  {item.m2 ? item.m2.toFixed(2) : '-'}
                </span>
              </div>
              <label>
                <span className="mb-0.5 block text-xs text-slate-500">R$/m²</span>
                <MoneyInput
                  valueCents={item.precoM2}
                  onChangeCents={(v) => update(idx, { precoM2: v })}
                />
              </label>
              <label>
                <span className="mb-0.5 block text-xs text-slate-500">V. unit.</span>
                <MoneyInput
                  valueCents={item.valorUnit}
                  onChangeCents={(v) =>
                    update(
                      idx,
                      { valorUnit: v, ...(item.m2 > 0 ? { precoM2: Math.round(v / item.m2) } : {}) },
                      true,
                    )
                  }
                />
              </label>
              <label>
                <span className="mb-0.5 block text-xs text-slate-500">% Imp.</span>
                <input
                  type="number" min={0} step={0.01}
                  className={inputClass}
                  value={item.impostoPct || ''}
                  onChange={(e) => update(idx, { impostoPct: parseFloat(e.target.value) || 0 }, true)}
                  placeholder="0"
                />
              </label>
              <div className="text-right">
                <span className="mb-0.5 block text-xs text-slate-500">Total</span>
                <span className="block py-2 text-sm font-semibold text-slate-800">
                  {formatCents(item.total)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        small
        className="mt-3"
        onClick={() => onChange([...itens, novoDocumentoItem(impostoPadrao)])}
      >
        + Adicionar produto
      </Button>

      {/* Cadastro rápido de item, sem sair do orçamento */}
      <Modal
        open={quickItemIdx !== null}
        title="Novo produto do catálogo"
        onClose={() => setQuickItemIdx(null)}
      >
        <ItemFormFields item={quickItem} onChange={setQuickItem} />
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setQuickItemIdx(null)}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvarQuickItem}>
            Salvar produto
          </Button>
        </div>
      </Modal>
    </div>
  )
}
