import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../data/supabaseClient'
import {
  lerMetasLocais, mesAtualMetas, mesValido, salvarMetasLocais,
  type MetaMensal,
} from '../lib/metas'
import { formatCents } from '../lib/money'
import { Button, Card, Field, MoneyInput, PageHeader, inputClass } from '../components/ui'

const VAZIO = {
  custoFixoCentavos: 0,
  metaFaturamentoCentavos: 0,
  metaGraficaCentavos: 0,
  metaComunicacaoVisualCentavos: 0,
  margemContribuicaoPct: 0,
}

export default function Metas() {
  const { cloudMode, session, role } = useAuth()
  const { showToast } = useToast()
  const [mes, setMes] = useState(mesAtualMetas)
  const [form, setForm] = useState(VAZIO)
  const [margemTexto, setMargemTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroLeitura, setErroLeitura] = useState(false)
  const podeEditar = !cloudMode || role === 'owner'

  useEffect(() => {
    if (!podeEditar || !mesValido(mes)) return
    let ativo = true
    setCarregando(true)
    setErroLeitura(false)
    const aplicar = (meta: MetaMensal | null) => {
      if (!ativo) return
      setForm(meta ? {
        custoFixoCentavos: meta.custoFixoCentavos,
        metaFaturamentoCentavos: meta.metaFaturamentoCentavos,
        metaGraficaCentavos: meta.metaGraficaCentavos ?? 0,
        metaComunicacaoVisualCentavos: meta.metaComunicacaoVisualCentavos ?? 0,
        margemContribuicaoPct: meta.margemContribuicaoPct,
      } : VAZIO)
      setMargemTexto(meta ? String(meta.margemContribuicaoPct).replace('.', ',') : '')
      setCarregando(false)
    }

    if (!cloudMode) {
      aplicar(lerMetasLocais(mes))
      return () => { ativo = false }
    }

    if (!supabase || !session) {
      setErroLeitura(true)
      setCarregando(false)
      return () => { ativo = false }
    }

    void (async () => {
      const { data: ownerId, error: ownerError } = await supabase.rpc('current_workspace_owner_id')
      if (ownerError || !ownerId) {
        if (ativo) { setErroLeitura(true); setCarregando(false) }
        return
      }
      const { data, error } = await supabase.from('metas_mensais')
        .select('mes,custo_fixo_centavos,meta_faturamento_centavos,margem_contribuicao_pct,meta_grafica_centavos,meta_comunicacao_visual_centavos')
        .eq('owner_id', ownerId)
        .eq('mes', `${mes}-01`)
        .maybeSingle()
      if (!ativo) return
      if (error) {
        setErroLeitura(true)
        setCarregando(false)
      } else {
        aplicar(data ? {
          mes,
          custoFixoCentavos: Number(data.custo_fixo_centavos),
          metaFaturamentoCentavos: Number(data.meta_faturamento_centavos),
          metaGraficaCentavos: data.meta_grafica_centavos == null ? null : Number(data.meta_grafica_centavos),
          metaComunicacaoVisualCentavos: data.meta_comunicacao_visual_centavos == null ? null : Number(data.meta_comunicacao_visual_centavos),
          margemContribuicaoPct: Number(data.margem_contribuicao_pct),
        } : null)
      }
    })()

    return () => { ativo = false }
  }, [mes, cloudMode, session?.user.id, podeEditar])

  const totalSegmentado = form.metaGraficaCentavos + form.metaComunicacaoVisualCentavos
  const margem = Number(margemTexto.trim().replace(',', '.'))
  const equilibrio = margem > 0 && margem <= 100
    ? Math.round(form.custoFixoCentavos * 100 / margem)
    : 0

  const salvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!podeEditar || !mesValido(mes) ||
      form.custoFixoCentavos <= 0 ||
      ![form.metaGraficaCentavos, form.metaComunicacaoVisualCentavos].every(n => Number.isSafeInteger(n) && n > 0 && n <= 999_999_999_999) ||
      !Number.isFinite(margem) || margem <= 0 || margem > 100 ||
      Math.round(margem * 100) !== margem * 100) {
      showToast('Informe o custo fixo, as duas metas e uma margem válida (maior que 0 e até 100%).', 'error')
      return
    }
    const meta: MetaMensal = {
      mes,
      custoFixoCentavos: form.custoFixoCentavos,
      metaFaturamentoCentavos: form.metaFaturamentoCentavos || totalSegmentado,
      metaGraficaCentavos: form.metaGraficaCentavos,
      metaComunicacaoVisualCentavos: form.metaComunicacaoVisualCentavos,
      margemContribuicaoPct: margem,
    }
    setSalvando(true)
    try {
      if (!cloudMode) {
        salvarMetasLocais(meta)
      } else {
        if (!supabase || !session || role !== 'owner') throw new Error('Acesso não autorizado.')
        const { data: ownerId, error: ownerError } = await supabase.rpc('current_workspace_owner_id')
        if (ownerError || !ownerId) throw new Error('Não foi possível verificar a empresa.')
        const { error } = await supabase.from('metas_mensais').upsert({
          owner_id: ownerId,
          mes: `${mes}-01`,
          custo_fixo_centavos: meta.custoFixoCentavos,
          meta_faturamento_centavos: meta.metaFaturamentoCentavos,
          meta_grafica_centavos: meta.metaGraficaCentavos,
          meta_comunicacao_visual_centavos: meta.metaComunicacaoVisualCentavos,
          margem_contribuicao_pct: meta.margemContribuicaoPct,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'owner_id,mes' })
        if (error) throw error
      }
      showToast('Metas do mês salvas com sucesso!')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar as metas.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Metas"
        subtitle="Configure as metas mensais da gráfica. Somente administradores podem visualizar e editar valores."
      />

      <div className="max-w-3xl">
        <Card>
          <form onSubmit={salvar} className="space-y-5">
            <Field label="Mês de referência">
              <input type="month" className={inputClass} required value={mes}
                onChange={(event) => setMes(event.target.value)} />
            </Field>

            {erroLeitura && (
              <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                Não foi possível carregar esta configuração. Nenhum dado foi alterado.
                Verifique se a atualização do banco foi aplicada.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Custo fixo mensal (R$)">
                <MoneyInput valueCents={form.custoFixoCentavos}
                  onChangeCents={(value) => setForm((prev) => ({ ...prev, custoFixoCentavos: value }))}
                  disabled={carregando || salvando || erroLeitura} />
              </Field>
              <Field label="Meta Gráfica (R$)">
                <MoneyInput valueCents={form.metaGraficaCentavos}
                  onChangeCents={(value) => setForm((prev) => ({ ...prev, metaGraficaCentavos: value }))}
                  disabled={carregando || salvando || erroLeitura} />
              </Field>
              <Field label="Meta Comunicação Visual (R$)">
                <MoneyInput valueCents={form.metaComunicacaoVisualCentavos}
                  onChangeCents={(value) => setForm((prev) => ({ ...prev, metaComunicacaoVisualCentavos: value }))}
                  disabled={carregando || salvando || erroLeitura} />
              </Field>
              <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
                <p className="text-xs font-medium text-violet-900">Meta Total (soma automática)</p>
                <p className="text-lg font-bold text-violet-900">{totalSegmentado > 0 ? formatCents(totalSegmentado) : '—'}</p>
              </div>
            </div>

            {form.metaFaturamentoCentavos > 0 && form.metaGraficaCentavos === 0 && form.metaComunicacaoVisualCentavos === 0 &&
              <p className="text-sm text-slate-600">Meta total anterior preservada: {formatCents(form.metaFaturamentoCentavos)}.</p>}
            <Field label="Margem de contribuição (%)">
              <input className={inputClass} type="text" inputMode="decimal"
                placeholder="Ex.: 40" required value={margemTexto}
                disabled={carregando || salvando || erroLeitura}
                onChange={(event) => setMargemTexto(event.target.value)} />
            </Field>

            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-sm font-semibold text-violet-900">Ponto de equilíbrio calculado automaticamente</p>
              <p className="mt-2 text-2xl font-bold text-violet-800">
                {equilibrio > 0 ? formatCents(equilibrio) : '—'}
              </p>
              <p className="mt-2 text-xs text-violet-700">
                Custo fixo ÷ margem de contribuição. A margem representa a parcela do faturamento
                que sobra após custos e despesas variáveis. Este valor é mostrado apenas a administradores.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              O dashboard exibe somente os percentuais de progresso (0 a 100%) do mês atual,
              sem revelar custos, margens ou metas monetárias aos funcionários.
              O ponto de equilíbrio considera faturas não canceladas e vendas do PDV. As novas metas
              usam apenas itens classificados. Frete, impostos e descontos são refletidos no valor final de cada documento,
              distribuído proporcionalmente entre seus itens.
            </p>

            <Button type="submit" disabled={!podeEditar || carregando || salvando || erroLeitura}>
              {salvando ? 'Salvando...' : 'Salvar metas do mês'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
