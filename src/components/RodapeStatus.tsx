import type { Plano } from '../types/visualizacao'

interface PropriedadesRodape {
  plano: Plano
  camada: number | null
  colunas?: number
  linhas?: number
}

export function RodapeStatus({ plano, camada, colunas, linhas }: PropriedadesRodape) {
  return (
    <footer className="rodape-status">
      <div>
        <span>Plano <strong>{plano}</strong></span>
        <span>Camada <strong>{camada ?? '—'}</strong></span>
        <span>Resolução <strong>{colunas && linhas ? `${colunas} × ${linhas}` : '—'}</strong></span>
      </div>
      <span>{camada === null ? 'Aguardando seleção' : 'Seção processada'}</span>
    </footer>
  )
}
