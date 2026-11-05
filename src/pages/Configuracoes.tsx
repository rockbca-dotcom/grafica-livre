import { useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Card, PageHeader } from '../components/ui'

export default function Configuracoes() {
  const { exportBackup, importBackup } = useData()
  const { cloudMode } = useAuth()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!pendingFile) return
    setImporting(true)
    try {
      const resumo = await importBackup(pendingFile)
      showToast(`Importação concluída: ${resumo}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast('Erro na importação: ' + msg, 'error')
    } finally {
      setImporting(false)
      setPendingFile(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Backup, importação e armazenamento" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">💾 Backup</h3>
          <p className="mb-4 text-sm text-slate-500">
            Baixa um arquivo JSON com os dados operacionais disponíveis para sua conta.
            Guarde-o em local seguro. Contas de usuário e senhas não estão incluídas.
          </p>
          <Button onClick={exportBackup}>⬇ Exportar backup</Button>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">📥 Importar dados</h3>
          <p className="mb-4 text-sm text-slate-500">
            Aceita o backup deste sistema <strong>ou o backup do app antigo</strong> (botão
            "Exportar dados" da versão anterior). Valores e cadastros são convertidos
            automaticamente. <span className="text-red-600">
              Atenção: substitui todos os dados atuais.
              {cloudMode && ' Uma falha na importação em nuvem pode deixar dados incompletos; confira um backup externo antes de continuar.'}
            </span>
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="text-sm"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          />
          {pendingFile && (
            <div className="mt-3">
              <Button variant="danger" disabled={importing} onClick={handleImport}>
                {importing ? 'Importando...' : `Importar "${pendingFile.name}"`}
              </Button>
            </div>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">☁️ Armazenamento</h3>
          {cloudMode ? (
            <p className="text-sm text-emerald-700">
              ✅ Conectado ao Supabase — seus dados estão salvos na nuvem e acessíveis com login.
              A exportação acima é manual; confirme separadamente se há backup do banco.
            </p>
          ) : (
            <div className="text-sm text-slate-600">
              <p className="mb-2">
                ⚠️ <strong>Modo local:</strong> os dados estão salvos apenas neste navegador.
                Se o cache for limpo, tudo será perdido. Para uso profissional:
              </p>
              <ol className="ml-5 list-decimal space-y-1 text-slate-500">
                <li>Crie um projeto gratuito em <code className="rounded bg-slate-100 px-1">supabase.com</code></li>
                <li>Execute o arquivo <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code> no SQL Editor</li>
                <li>Copie a URL e a chave anônima para o arquivo <code className="rounded bg-slate-100 px-1">.env</code></li>
                <li>Faça o deploy (instruções no README do projeto)</li>
              </ol>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
