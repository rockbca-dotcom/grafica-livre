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

export function novoItem(): Item {
  return {
    id: crypto.randomUUID(),
    nome: '',
    categoria: 'produto',
    precoM2: 0,
    precoUnitario: 0,
    descricao: '',
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
      <Field label="Categoria">
        <select
          className={inputClass}
          value={item.categoria}
          onChange={(e) => set({ categoria: e.target.value as Item['categoria'] })}
        >
          <option value="produto">Produto</option>
          <option value="servico">Serviço</option>
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
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState<Item | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      await saveItem(editing)
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
        subtitle="Catálogo de produtos e serviços"
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Buscar produto..." />
            <Button onClick={() => setEditing(novoItem())}>+ Novo Produto</Button>
          </>
        }
      />

      <Card>
        <DataTable
          rows={db.itens}
          searchText={search}
          searchFields={(i) => [i.nome, i.descricao, i.categoria]}
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
              header: 'Categoria',
              sortValue: (i) => i.categoria,
              render: (i) => (i.categoria === 'servico' ? 'Serviço' : 'Produto'),
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
                  <Button small variant="secondary" onClick={() => setEditing({ ...i })}>
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
        onClose={() => setEditing(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="item-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        }
      >
        {editing && (
          <form id="item-form" onSubmit={handleSubmit}>
            <ItemFormFields item={editing} onChange={setEditing} />
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
