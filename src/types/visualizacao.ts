export type Plano = 'CORE/INPUT' | 'CORE/RANK' | 'INPUT/RANK'

export type Dimensao = 'rank' | 'core' | 'input'

export const PLANOS: Plano[] = ['CORE/INPUT', 'CORE/RANK', 'INPUT/RANK']

// Eixos: X = CORE, Y = INPUT, Z = RANK (cada plano fixa a dimensão ortogonal)
export const DIMENSAO_POR_PLANO: Record<Plano, Dimensao> = {
  'CORE/INPUT': 'rank',
  'CORE/RANK': 'input',
  'INPUT/RANK': 'core',
}

export type MetricaId =
  | 'eficiencia'
  | 'speedup'
  | 'imbalance'
  | 'strong'
  | 'scalab'
  | 'weak'
  | 'rel_strong'
  | 'rel_scalab'
  | 'rel_weak'

export interface MetricaDef {
  id: MetricaId
  nome: string
  tituloCurto: string
  descricao: string
  unidade: string
}

export interface PontoCalor {
  id: string
  intensidade: number
  rank: number
  core: number
  input: number
  valorBruto: number
  valorFormatado?: string
}

export type SeccaoBidimensional = {
  COLUNAS: number
  LINHAS: number
  TERCEIRA_DIMENSAO: Set<number>
}

/** Calcula colunas e linhas efetivas, omitindo input 0 no weak scaling quando input compõe o corte. */
export function obterResolucaoEfetiva(
  dimensionalidade: SeccaoBidimensional,
  plano: Plano,
  metrica: MetricaId,
): { colunas: number; linhas: number } {
  if (metrica !== 'weak') {
    return { colunas: dimensionalidade.COLUNAS, linhas: dimensionalidade.LINHAS }
  }
  if (plano === 'INPUT/RANK') {
    return {
      colunas: Math.max(1, dimensionalidade.COLUNAS - 1),
      linhas: dimensionalidade.LINHAS,
    }
  }
  if (plano === 'CORE/INPUT') {
    return {
      colunas: dimensionalidade.COLUNAS,
      linhas: Math.max(1, dimensionalidade.LINHAS - 1),
    }
  }
  return { colunas: dimensionalidade.COLUNAS, linhas: dimensionalidade.LINHAS }
}

export const METRICAS_DISPONIVEIS: MetricaDef[] = [
  {
    id: 'eficiencia',
    nome: 'Eficiência Paralela (Efficiency)',
    tituloCurto: 'Eficiência',
    descricao: 'Mede a eficiência do uso paralelo (% em relação ao ideal).',
    unidade: '%',
  },
  {
    id: 'speedup',
    nome: 'Speedup',
    tituloCurto: 'Speedup',
    descricao: 'Aceleração obtida em relação à execução sequencial.',
    unidade: 'x',
  },
  {
    id: 'imbalance',
    nome: 'Desbalanceamento (Load Imbalance)',
    tituloCurto: 'Desbalanceamento',
    descricao: 'Disparidade no tempo de execução dos trabalhadores.',
    unidade: '%',
  },
  {
    id: 'strong',
    nome: 'Escalabilidade Forte (Strong)',
    tituloCurto: 'Strong Scalab.',
    descricao: 'Variação da eficiência em relação à primeira configuração paralela.',
    unidade: '%',
  },
  {
    id: 'scalab',
    nome: 'Escalabilidade entre Cargas (Scalab)',
    tituloCurto: 'Scalab (Cargas)',
    descricao: 'Sensibilidade da eficiência ao aumento do tamanho da carga de entrada.',
    unidade: '%',
  },
  {
    id: 'weak',
    nome: 'Escalabilidade Fraca (Weak)',
    tituloCurto: 'Weak Scalab.',
    descricao: 'Evolução ao escalar simultaneamente carga e recursos.',
    unidade: '%',
  },
  {
    id: 'rel_strong',
    nome: 'Escalabilidade Forte Relativa (RelStrong)',
    tituloCurto: 'RelStrong',
    descricao: 'Comparação com a configuração paralela imediatamente anterior.',
    unidade: '%',
  },
  {
    id: 'rel_scalab',
    nome: 'Escalabilidade entre Cargas Relativa (RelScalab)',
    tituloCurto: 'RelScalab',
    descricao: 'Comparação com a carga imediatamente anterior.',
    unidade: '%',
  },
  {
    id: 'rel_weak',
    nome: 'Escalabilidade Fraca Relativa (RelWeak)',
    tituloCurto: 'RelWeak',
    descricao: 'Comparação com o passo diagonal imediatamente anterior.',
    unidade: '%',
  },
]
