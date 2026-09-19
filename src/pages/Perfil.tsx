import { useState } from 'react'
import type { FormEvent } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { EMPRESA_PADRAO } from '../types'
import { Button, Card, Field, PageHeader, inputClass } from '../components/ui'
import { maskCep, maskCpfCnpj, maskTelefone, telefoneParaDigitos } from '../lib/validation'
import { buscarCep } from '../lib/viacep'

export default function Perfil() {
  const { db, saveEmpresa } = useData()
  const { showToast } = useToast()
  // Se o texto padrão do orçamento estiver vazio, mostra o modelo para o usuário editar.
  const [empresa, setEmpresa] = useState({
    ...db.empresa,
    observacoesPadraoOrcamento:
      db.empresa.observacoesPadraoOrcamento || EMPRESA_PADRAO.observacoesPadraoOrcamento,
    condicoesPagamentoPadrao:
      db.empresa.condicoesPagamentoPadrao || EMPRESA_PADRAO.condicoesPagamentoPadrao,
  })
  const [telefoneEmEdicao, setTelefoneEmEdicao] = useState(false)

  const set = (patch: Partial<typeof empresa>) => setEmpresa({ ...empresa, ...patch })

  const handleLogo = (file: File | undefined) => {
    if (!file) return
    if (file.size > 500 * 1024) {
      showToast('Logo muito grande — use uma imagem de até 500 KB.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => set({ logoDataUrl: reader.result as string })
    reader.readAsDataURL(file)
  }

  const handleCepBlur = async () => {
    const end = await buscarCep(empresa.cep)
    if (end) {
      set({
        endereco: empresa.endereco || end.logradouro,
        bairro: end.bairro,
        cidade: end.localidade,
        estado: end.uf,
      })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await saveEmpresa(empresa)
    showToast('Perfil da empresa salvo!')
  }

  return (
    <div>
      <PageHeader
        title="Perfil da Empresa"
        subtitle="Estes dados aparecem nos PDFs de orçamento e fatura"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nome da empresa *" className="sm:col-span-2">
                <input
                  required
                  className={inputClass}
                  value={empresa.nome}
                  onChange={(e) => set({ nome: e.target.value })}
                />
              </Field>
              <Field label="CNPJ">
                <input
                  className={inputClass}
                  value={empresa.cnpj}
                  onChange={(e) => set({ cnpj: maskCpfCnpj(e.target.value) })}
                />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input
                  className={inputClass}
                  inputMode="tel"
                  value={telefoneEmEdicao ? telefoneParaDigitos(empresa.telefone) : maskTelefone(empresa.telefone)}
                  onFocus={() => setTelefoneEmEdicao(true)}
                  onBlur={() => setTelefoneEmEdicao(false)}
                  onChange={(e) => set({ telefone: telefoneParaDigitos(e.target.value) })}
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  className={inputClass}
                  value={empresa.email}
                  onChange={(e) => set({ email: e.target.value })}
                />
              </Field>
              <Field label="Site">
                <input
                  className={inputClass}
                  value={empresa.website}
                  onChange={(e) => set({ website: e.target.value })}
                />
              </Field>
              <Field label="CEP">
                <input
                  className={inputClass}
                  value={empresa.cep}
                  onChange={(e) => set({ cep: maskCep(e.target.value) })}
                  onBlur={handleCepBlur}
                />
              </Field>
              <Field label="Endereço">
                <input
                  className={inputClass}
                  value={empresa.endereco}
                  onChange={(e) => set({ endereco: e.target.value })}
                />
              </Field>
              <Field label="Bairro">
                <input
                  className={inputClass}
                  value={empresa.bairro}
                  onChange={(e) => set({ bairro: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cidade">
                  <input
                    className={inputClass}
                    value={empresa.cidade}
                    onChange={(e) => set({ cidade: e.target.value })}
                  />
                </Field>
                <Field label="UF">
                  <input
                    className={inputClass}
                    maxLength={2}
                    value={empresa.estado}
                    onChange={(e) => set({ estado: e.target.value.toUpperCase() })}
                  />
                </Field>
              </div>
              <Field label="Chave PIX (aparece na fatura)" className="sm:col-span-2">
                <input
                  className={inputClass}
                  placeholder="CNPJ, e-mail, telefone ou chave aleatória"
                  value={empresa.chavePix}
                  onChange={(e) => set({ chavePix: e.target.value })}
                />
              </Field>
              <Field
                label="Observações padrão do orçamento (aparece no rodapé; editável por orçamento)"
                className="sm:col-span-2"
              >
                <textarea
                  className={`${inputClass} min-h-24`}
                  placeholder="Ex.: serviços inclusos, prazos..."
                  value={empresa.observacoesPadraoOrcamento}
                  onChange={(e) => set({ observacoesPadraoOrcamento: e.target.value })}
                />
              </Field>
              <Field
                label="Condições de pagamento padrão (aparece no rodapé; editável por orçamento)"
                className="sm:col-span-2"
              >
                <textarea
                  className={`${inputClass} min-h-24`}
                  placeholder="Ex.: formas de pagamento aceitas..."
                  value={empresa.condicoesPagamentoPadrao}
                  onChange={(e) => set({ condicoesPagamentoPadrao: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Logo</h3>
              {empresa.logoDataUrl ? (
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={empresa.logoDataUrl}
                    alt="Logo"
                    className="h-16 rounded border border-slate-200 object-contain p-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    small
                    onClick={() => set({ logoDataUrl: '' })}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <p className="mb-3 text-xs text-slate-400">
                  PNG ou JPG até 500 KB — usada nos PDFs.
                </p>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="text-sm"
                onChange={(e) => handleLogo(e.target.files?.[0])}
              />
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Numeração</h3>
              <div className="flex flex-col gap-4">
                <Field label="Prefixo do orçamento">
                  <input
                    className={inputClass}
                    value={empresa.prefixoOrcamento}
                    onChange={(e) => set({ prefixoOrcamento: e.target.value })}
                  />
                </Field>
                <Field label="Próximo nº de orçamento">
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={empresa.proximoNumOrcamento}
                    onChange={(e) =>
                      set({ proximoNumOrcamento: parseInt(e.target.value) || 1 })
                    }
                  />
                </Field>
                <Field label="Próximo nº de fatura">
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={empresa.proximoNumFatura}
                    onChange={(e) => set({ proximoNumFatura: parseInt(e.target.value) || 1 })}
                  />
                </Field>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-5">
          <Button type="submit">Salvar perfil</Button>
        </div>
      </form>
    </div>
  )
}
