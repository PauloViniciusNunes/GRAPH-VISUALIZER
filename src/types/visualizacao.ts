export type Plano = 'XY' | 'XZ' | 'YZ'

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

export const METRICAS_DISPONIVEIS: MetricaDef[] = [
  {
    id: 'eficiencia',
    nome: 'Eficiência Paralela (Efficiency)',
    tituloCurto: 'Eficiência',
    descricao: 'E(w, p) = Tseq(w) / (p · Tpar(w, p)) — Mede a eficiência do uso paralelo (% em relação ao ideal).',
    unidade: '%',
  },
  {
    id: 'speedup',
    nome: 'Speedup',
    tituloCurto: 'Speedup',
    descricao: 'S(w, p) = Tseq(w) / Tpar(w, p) — Aceleração obtida em relação à execução sequencial.',
    unidade: 'x',
  },
  {
    id: 'imbalance',
    nome: 'Desbalanceamento (Load Imbalance)',
    tituloCurto: 'Desbalanceamento',
    descricao: 'Imbalance = (Tmax - Tavg) / Tmax — Disparidade no tempo de execução dos trabalhadores.',
    unidade: '%',
  },
  {
    id: 'strong',
    nome: 'Escalabilidade Forte (Strong)',
    tituloCurto: 'Strong Scalab.',
    descricao: 'Strong(w, p) = E(w, p) - E(w, p₁) — Variação da eficiência em relação à primeira configuração paralela.',
    unidade: '%',
  },
  {
    id: 'scalab',
    nome: 'Escalabilidade entre Cargas (Scalab)',
    tituloCurto: 'Scalab (Cargas)',
    descricao: 'Scalab(w, p) = E(w, p) - E(w₁, p) — Sensibilidade da eficiência ao aumento do tamanho da carga de entrada.',
    unidade: '%',
  },
  {
    id: 'weak',
    nome: 'Escalabilidade Fraca (Weak)',
    tituloCurto: 'Weak Scalab.',
    descricao: 'Weak(w, p) = E(w, p) - E(w - m, p - m), m = min(w, p) — Evolução ao escalar simultaneamente carga e recursos.',
    unidade: '%',
  },
  {
    id: 'rel_strong',
    nome: 'Escalabilidade Forte Relativa (RelStrong)',
    tituloCurto: 'RelStrong',
    descricao: 'RelStrong(w, p) = E(w, p) - E(w, p - 1) — Comparação com a configuração paralela imediatamente anterior.',
    unidade: '%',
  },
  {
    id: 'rel_scalab',
    nome: 'Escalabilidade entre Cargas Relativa (RelScalab)',
    tituloCurto: 'RelScalab',
    descricao: 'RelScalab(w, p) = E(w, p) - E(w - 1, p) — Comparação com a carga imediatamente anterior.',
    unidade: '%',
  },
  {
    id: 'rel_weak',
    nome: 'Escalabilidade Fraca Relativa (RelWeak)',
    tituloCurto: 'RelWeak',
    descricao: 'RelWeak(w, p) = E(w, p) - E(w - 1, p - 1) — Comparação com o passo diagonal imediatamente anterior.',
    unidade: '%',
  },
]
