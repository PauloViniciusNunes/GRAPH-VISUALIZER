import type { Plano } from '../types/visualizacao'

interface PropriedadesRodape { plano: Plano; camada: number | null }

export function RodapeStatus({ plano, camada }: PropriedadesRodape) {
  return (
    <footer className="rodape-status">
      <div>
        <span>Plano <strong>{plano}</strong></span>
        <span>Camada <strong>{camada ?? '—'}</strong></span>
        <span>Resolução <strong>28 × 20</strong></span>
      </div>
      <span>{camada === null ? 'Aguardando seleção' : 'Seção processada'}</span>
    </footer>
  )
}
