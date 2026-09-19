import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Cliente } from '../types'
import { emailsDoCliente } from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  Button, Card, ConfirmDialog, DataTable, EmptyState, Field, Modal,
  PageHeader, SearchBox, inputClass,
} from '../components/ui'
import { maskCep, maskCpfCnpj, maskTelefone, onlyDigits, telefoneParaDigitos, validateDocumento } from '../lib/validation'
import { buscarCep } from '../lib/viacep'
import { buscarCnpj } from '../lib/cnpj'

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export function novoCliente(): Cliente {
  return {
    id: crypto.randomUUID(),
    nome: '', documento: '', email: '', emailsAdicionais: [], telefone: '',
    endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '',
    observacoes: '',
    criadoEm: new Date().toISOString(),
  }
}

export function ClienteFormFields({
  cliente,
  onChange,
}: {
  cliente: Cliente
  onChange: (c: Cliente) => void
}) {
  const set = (patch: Partial<Cliente>) => onChange({ ...cliente, ...patch })
  // Tolera clientes antigos (backup/localStorage) sem o campo emailsAdicionais.
  const adicionais = cliente.emailsAdicionais ?? []
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading'>('idle')
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'loading'>('idle')
  const [telefoneEmEdicao, setTelefoneEmEdicao] = useState(false)

  const handleCepBlur = async () => {
    setCepStatus('loading')
    const end = await buscarCep(cliente.cep)
    setCepStatus('idle')
    if (end) {
      set({
        endereco: cliente.endereco || end.logradouro,
        bairro: end.bairro,
        cidade: end.localidade,
        estado: end.uf,
      })
    }
  }

  // Ao digitar um CNPJ (14 dígitos), busca os dados na Receita e preenche os campos.
  const handleDocumentoBlur = async () => {
    if (onlyDigits(cliente.documento).length !== 14) return
    setCnpjStatus('loading')
    const d = await buscarCnpj(cliente.documento)
    setCnpjStatus('idle')
    if (!d) return
    const nome = d.razaoSocial || d.nomeFantasia
    set({
      nome: cliente.nome || nome,
      email: cliente.email || d.email,
      telefone: cliente.telefone || (d.telefone ? telefoneParaDigitos(d.telefone) : ''),
      cep: d.cep ? maskCep(d.cep) : cliente.cep,
      endereco: d.logradouro || cliente.endereco,
      numero: d.numero || cliente.numero,
      complemento: d.complemento || cliente.complemento,
      bairro: d.bairro || cliente.bairro,
      cidade: d.municipio || cliente.cidade,
      estado: d.uf || cliente.estado,
    })
  }

  const docInvalido = cliente.documento && !validateDocumento(cliente.documento)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nome *" className="sm:col-span-2">
        <input
          required
          className={inputClass}
          value={cliente.nome}
          onChange={(e) => set({ nome: e.target.value })}
        />
      </Field>
      <Field label={cnpjStatus === 'loading' ? 'CNPJ / CPF (buscando...)' : 'CNPJ / CPF'}>
        <input
          className={`${inputClass} ${docInvalido ? 'border-red-400' : ''}`}
          value={cliente.documento}
          onChange={(e) => set({ documento: maskCpfCnpj(e.target.value) })}
          onBlur={handleDocumentoBlur}
          placeholder="00.000.000/0000-00"
        />
        {docInvalido ? (
          <span className="text-xs text-red-600">Documento inválido</span>
        ) : (
          <span className="text-xs text-slate-400">
            Digite o CNPJ para preencher os dados automaticamente
          </span>
        )}
      </Field>
      <Field label="Telefone">
        <input
          className={inputClass}
          inputMode="tel"
          value={telefoneEmEdicao ? telefoneParaDigitos(cliente.telefone) : maskTelefone(cliente.telefone)}
          onFocus={() => setTelefoneEmEdicao(true)}
          onBlur={() => setTelefoneEmEdicao(false)}
          onChange={(e) => set({ telefone: telefoneParaDigitos(e.target.value) })}
          placeholder="(21) 99999-9999"
        />
      </Field>
      <Field label="E-mail principal" className="sm:col-span-2">
        <input
          type="email"
          className={inputClass}
          value={cliente.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="cliente@exemplo.com"
        />
      </Field>
      <Field label="Outros e-mails" className="sm:col-span-2">
        <div className="flex flex-col gap-2">
          {adicionais.map((mail, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="email"
                className={inputClass}
                value={mail}
                onChange={(e) => {
                  const lista = [...adicionais]
                  lista[i] = e.target.value
                  set({ emailsAdicionais: lista })
                }}
                placeholder="outro@exemplo.com"
              />
              <Button
                type="button"
                small
                variant="secondary"
                onClick={() => set({ emailsAdicionais: adicionais.filter((_, j) => j !== i) })}
              >
                Remover
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              small
              variant="secondary"
              onClick={() => set({ emailsAdicionais: [...adicionais, ''] })}
            >
              + Adicionar e-mail
            </Button>
          </div>
        </div>
        <span className="text-xs text-slate-400">
          Todos recebem o orçamento/fatura ao enviar por e-mail.
        </span>
      </Field>
      <Field label={cepStatus === 'loading' ? 'CEP (buscando...)' : 'CEP'}>
        <input
          className={inputClass}
          value={cliente.cep}
          onChange={(e) => set({ cep: maskCep(e.target.value) })}
          onBlur={handleCepBlur}
          placeholder="00000-000"
        />
      </Field>
      <Field label="Endereço (logradouro)">
        <input
          className={inputClass}
          value={cliente.endereco}
          onChange={(e) => set({ endereco: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Número">
          <input
            className={inputClass}
            value={cliente.numero}
            onChange={(e) => set({ numero: e.target.value })}
            placeholder="ex.: 123 ou S/N"
          />
        </Field>
        <Field label="Complemento">
          <input
            className={inputClass}
            value={cliente.complemento}
            onChange={(e) => set({ complemento: e.target.value })}
            placeholder="ex.: sala 2, fundos"
          />
        </Field>
      </div>
      <Field label="Bairro">
        <input
          className={inputClass}
          value={cliente.bairro}
          onChange={(e) => set({ bairro: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cidade">
          <input
            className={inputClass}
            value={cliente.cidade}
            onChange={(e) => set({ cidade: e.target.value })}
          />
        </Field>
        <Field label="UF">
          <select
            className={inputClass}
            value={cliente.estado}
            onChange={(e) => set({ estado: e.target.value })}
          >
            <option value="">--</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Observações" className="sm:col-span-2">
        <textarea
          className={`${inputClass} min-h-20`}
          value={cliente.observacoes}
          onChange={(e) => set({ observacoes: e.target.value })}
        />
      </Field>
    </div>
  )
}

export default function Clientes() {
  const { db, saveCliente, deleteCliente } = useData()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [deleting, setDeleting] = useState<Cliente | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (editing.documento && !validateDocumento(editing.documento)) {
      showToast('CNPJ/CPF inválido — verifique os dígitos.', 'error')
      return
    }
    setSaving(true)
    try {
      await saveCliente(editing)
      showToast('Cliente salvo com sucesso!')
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
        title="Clientes"
        subtitle={`${db.clientes.length} cadastrados`}
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Buscar cliente..." />
            <Button onClick={() => setEditing(novoCliente())}>+ Novo Cliente</Button>
          </>
        }
      />

      <Card>
        <DataTable
          rows={db.clientes}
          searchText={search}
          searchFields={(c) => [c.nome, c.documento, ...emailsDoCliente(c), c.telefone, c.cidade]}
          empty={
            <EmptyState
              icon="👥"
              title="Nenhum cliente cadastrado"
              hint="Clique em “+ Novo Cliente” para começar."
            />
          }
          columns={[
            {
              key: 'nome',
              header: 'Nome',
              sortValue: (c) => c.nome.toLowerCase(),
              render: (c) => <span className="font-medium text-slate-800">{c.nome}</span>,
            },
            { key: 'documento', header: 'CNPJ/CPF', render: (c) => c.documento || '-' },
            { key: 'telefone', header: 'Telefone', render: (c) => c.telefone || '-' },
            {
              key: 'email',
              header: 'E-mail',
              render: (c) => {
                const extras = c.emailsAdicionais?.filter((e) => e.trim()).length ?? 0
                if (!c.email) return '-'
                return (
                  <span>
                    {c.email}
                    {extras > 0 && <span className="ml-1 text-xs text-slate-400">+{extras}</span>}
                  </span>
                )
              },
            },
            {
              key: 'cidade',
              header: 'Cidade',
              sortValue: (c) => c.cidade.toLowerCase(),
              render: (c) => (c.cidade ? `${c.cidade}${c.estado ? '/' + c.estado : ''}` : '-'),
            },
            {
              key: 'acoes',
              header: '',
              className: 'text-right whitespace-nowrap',
              render: (c) => (
                <div className="flex justify-end gap-1.5">
                  <Button small variant="secondary" onClick={() => setEditing({ ...c })}>
                    Editar
                  </Button>
                  <Button small variant="danger" onClick={() => setDeleting(c)}>
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
        title={editing && db.clientes.some((c) => c.id === editing.id) ? 'Editar Cliente' : 'Novo Cliente'}
        onClose={() => setEditing(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="cliente-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        }
      >
        {editing && (
          <form id="cliente-form" onSubmit={handleSubmit}>
            <ClienteFormFields cliente={editing} onChange={setEditing} />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir cliente"
        message={`Excluir "${deleting?.nome}"? Orçamentos e faturas dele não serão apagados.`}
        confirmLabel="Excluir"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteCliente(deleting.id)
            showToast('Cliente excluído.')
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
