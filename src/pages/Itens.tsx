import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Item } from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  Button, Card, ConfirmDialog, DataTable, EmptyState, Field, Modal,
  MoneyInput, PageHeader, SearchBox, inputClass,
} from '../components/ui'
import { formatCents } from '../lib/money'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../data/supabaseClient'
import { rotuloSegmento, SEGMENTOS, segmentoValido } from '../lib/segmentos'

export function novoItem(): Item {
  return {
    id: crypto.randomUUID(),
    nome: '',
    categoria: 'produto',
    precoM2: 0,
    precoUnitario: 0,
    descricao: '',
    favorito: false,
  }
}

export function ItemFormFields({
  item,
  onChange,
}: {
  item: Item
  onChange: (i: Item) => void
}) {
  const set = (patch: Partial<Item>) => onChange({ ...item, ...patch })
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nome *">
        <input
          required
          className={inputClass}
          value={item.nome}
          onChange={(e) => set({ nome: e.target.value })}
          placeholder="Ex.: Lona 440g"
        />
      </Field>
      <Field label="Tipo do item">
        <select
          className={inputClass}
          value={item.categoria}
          onChange={(e) => set({ categoria: e.target.value as Item['categoria'] })}
        >
          <option value="produto">Produto</option>
          <option value="servico">Serviço</option>
        </select>
      </Field>
      <Field label="Categoria do produto">
        <select className={inputClass} value={item.segmento ?? ''} onChange={(e) => set({ segmento: segmentoValido(e.target.value) })}>
          <option value="">Sem classificação</option>
          {SEGMENTOS.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
        </select>
      </Field>
      <Field label="Preço por m² (R$)">
        <MoneyInput valueCents={item.precoM2} onChangeCents={(v) => set({ precoM2: v })} />
      </Field>
      <Field label="Preço unitário (R$)">
        <MoneyInput
          valueCents={item.precoUnitario}
          onChangeCents={(v) => set({ precoUnitario: v })}
        />
      </Field>
      <Field label="Descrição" className="sm:col-span-2">
        <textarea
          className={`${inputClass} min-h-20`}
          value={item.descricao}
          onChange={(e) => set({ descricao: e.target.value })}
        />
      </Field>
    </div>
  )
}

export default function Itens() {
  const { db, saveItem, deleteItem } = useData()
  const { cloudMode, role } = useAuth()
  const podeVerCusto = !cloudMode || role === 'owner'
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState<Item | null>(null)
  const [saving, setSaving] = useState(false)
  const [custo, setCusto] = useState<number | undefined>(undefined)
  const [carregandoCusto, setCarregandoCusto] = useState(false)
  const [erroCusto, setErroCusto] = useState(false)

  const abrir = async (item: Item, novo = false) => {
    setEditing({ ...item })
    setCusto(!cloudMode ? item.custoCentavosLocal : undefined)
    setErroCusto(false)
    if (!cloudMode || !podeVerCusto || novo || !supabase) return
    setCarregandoCusto(true)
    try {
      const { data, error } = await supabase.from('itens_custos').select('custo_centavos').eq('item_id',item.id).maybeSingle()
      if (error) throw error
      if (data) setCusto(Number(data.custo_centavos))
    } catch { setErroCusto(true) }
    finally { setCarregandoCusto(false) }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || carregandoCusto) return
    if (custo !== undefined && (!Number.isSafeInteger(custo) || custo < 0 || custo > 999_999_999_999)) {
      showToast('Informe um custo válido, maior ou igual a zero.', 'error'); return
    }
    setSaving(true)
    try {
      await saveItem(editing, podeVerCusto && !erroCusto ? custo : undefined)
      showToast('Item salvo com sucesso!')
      setEditing(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo de produtos e serviços. Marque a estrela dos itens que devem aparecer primeiro no PDV da equipe."
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Buscar produto..." />
            <Button onClick={() => void abrir(novoItem(), true)}>+ Novo Produto</Button>
          </>
        }
      />

      <Card>
        <DataTable
          rows={db.itens}
          searchText={search}
          searchFields={(i) => [i.nome, i.descricao, i.categoria, rotuloSegmento(i.segmento)]}
          empty={
            <EmptyState
              icon="📦"
              title="Nenhum produto cadastrado"
              hint="Cadastre lonas, adesivos, placas e serviços com preço por m² ou unitário."
            />
          }
          columns={[
            {
              key: 'nome',
              header: 'Nome',
              sortValue: (i) => i.nome.toLowerCase(),
              render: (i) => (
                <div>
                  <span className="font-medium text-slate-800">{i.nome}</span>
                  {i.descricao && (
                    <p className="max-w-md truncate text-xs text-slate-400">{i.descricao}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'categoria',
              header: 'Tipo',
              sortValue: (i) => i.categoria,
              render: (i) => (i.categoria === 'servico' ? 'Serviço' : 'Produto'),
            },
            {
              key: 'segmento',
              header: 'Categoria',
              sortValue: (i) => rotuloSegmento(i.segmento),
              render: (i) => rotuloSegmento(i.segmento),
            },
            {
              key: 'favorito',
              header: 'PDV',
              className: 'text-center',
              render: (i) => (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await saveItem({ ...i, favorito: !i.favorito })
                      showToast(i.favorito ? 'Removido dos favoritos do PDV.' : 'Adicionado aos favoritos do PDV.')
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : String(err), 'error')
                    }
                  }}
                  className={`rounded px-2 py-1 text-xl transition hover:bg-amber-50 ${i.favorito ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
                  aria-label={i.favorito ? `Remover ${i.nome} dos favoritos do PDV` : `Favoritar ${i.nome} no PDV`}
                  aria-pressed={i.favorito}
                  title={i.favorito ? 'Favorito do PDV' : 'Adicionar aos favoritos do PDV'}
                >
                  {i.favorito ? '★' : '☆'}
                </button>
              ),
            },
            {
              key: 'precoM2',
              header: 'Preço/m²',
              sortValue: (i) => i.precoM2,
              className: 'text-right',
              render: (i) => (i.precoM2 ? formatCents(i.precoM2) : '-'),
            },
            {
              key: 'precoUnitario',
              header: 'Preço unit.',
              sortValue: (i) => i.precoUnitario,
              className: 'text-right',
              render: (i) => (i.precoUnitario ? formatCents(i.precoUnitario) : '-'),
            },
            {
              key: 'acoes',
              header: '',
              className: 'text-right whitespace-nowrap',
              render: (i) => (
                <div className="flex justify-end gap-1.5">
                  <Button small variant="secondary" onClick={() => void abrir(i)}>
                    Editar
                  </Button>
                  <Button small variant="danger" onClick={() => setDeleting(i)}>
                    Excluir
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={editing !== null}
        title={editing && db.itens.some((i) => i.id === editing.id) ? 'Editar Produto' : 'Novo Produto'}
        onClose={() => { if (!carregandoCusto && !saving) setEditing(null) }}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={carregandoCusto || saving} onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="item-form" disabled={saving || carregandoCusto}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        }
      >
        {editing && (
          <form id="item-form" onSubmit={handleSubmit}>
            <ItemFormFields item={editing} onChange={setEditing} />
            {podeVerCusto && <div className="mt-4 max-w-xs">
              <Field label="Custo do produto (R$)">
                <MoneyInput key={editing.id} valueCents={custo ?? 0} onChangeCents={setCusto} disabled={carregandoCusto || erroCusto || saving} />
              </Field>
              <p className="mt-1 text-xs text-slate-500">{erroCusto ? 'Não foi possível consultar o custo. Salvá-lo aqui está indisponível.' : carregandoCusto ? 'Carregando custo…' : 'Visível apenas para a gestão. Não altera o preço de venda.'}</p>
            </div>}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir produto"
        message={`Excluir "${deleting?.nome}" do catálogo?`}
        confirmLabel="Excluir"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteItem(deleting.id)
            showToast('Item excluído.')
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
