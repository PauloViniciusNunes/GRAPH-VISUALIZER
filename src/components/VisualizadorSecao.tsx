import { useMemo } from 'react'
import {
  METRICAS_DISPONIVEIS,
  type Plano,
  type PontoCalor,
  type SeccaoBidimensional,
  type MetricaDef,
  type MetricaId,
} from '../types/visualizacao'
import { obterCorCalor } from '../utils/gerarMapaCalor'

interface PropriedadesVisualizador {
  plano: Plano
  camada: number | null
  dados: PontoCalor[]
  dimensionalidade: SeccaoBidimensional
  metricaAtual: MetricaDef
  proximaMetrica: () => void
  metricaAnterior: () => void
  aoSelecionarMetrica: (id: MetricaId) => void
}

const EIXOS_POR_PLANO: Record<Plano, [string, string]> = {
  XY: ['x', 'y'],
  XZ: ['x', 'z'],
  YZ: ['y', 'z'],
}

const NOME_PLANO: Record<string, string> = {
  x: "INPUT",
  y: "CORE",
  z: "RANK"
}

export function VisualizadorSecao({
  plano,
  camada,
  dados,
  dimensionalidade,
  metricaAtual,
  proximaMetrica,
  metricaAnterior,
  aoSelecionarMetrica,
}: PropriedadesVisualizador) {
  const [eixoHorizontal, eixoVertical] = EIXOS_POR_PLANO[plano]

  const nomeHorizontal = useMemo(() => {
    return NOME_PLANO[eixoHorizontal]
  }, [eixoHorizontal])

  const nomeVertical = useMemo(() => {
    return NOME_PLANO[eixoVertical]
  }, [eixoVertical])

  // Rótulos dinâmicos para a escala da legenda de calor
  const { rotuloMax, rotuloMin } = useMemo(() => {
    if (dados.length === 0) {
      return { rotuloMax: '1.0', rotuloMin: '0.0' }
    }

    switch (metricaAtual.id) {
      case 'eficiencia':
        return { rotuloMax: '100%', rotuloMin: '0%' }
      case 'speedup': {
        const maxVal = Math.max(1, ...dados.map((d) => d.valorBruto))
        return { rotuloMax: `${maxVal.toFixed(1)}x`, rotuloMin: '0x' }
      }
      case 'imbalance':
        return { rotuloMax: '100%', rotuloMin: '0%' }
      default: {
        // Métricas de escalabilidade diferencial
        const maxAbs = Math.max(0.1, ...dados.map((d) => Math.abs(d.valorBruto)))
        return {
          rotuloMax: `+${maxAbs.toFixed(0)}%`,
          rotuloMin: `-${maxAbs.toFixed(0)}%`,
        }
      }
    }
  }, [dados, metricaAtual.id])

  return (
    <section
      className="visualizador-secao"
      aria-labelledby="titulo-secao"
    >
      <header className="cabecalho-visualizador">
        <div className="bloco-titulo-visualizador">
          <p className="titulo-bloco">Interpretação bidimensional</p>
          <h2 id="titulo-secao">Visualizador da seção</h2>
          <p className="descricao-metrica-ativa" title={metricaAtual.descricao}>
            {metricaAtual.descricao}
          </p>
        </div>

        <div className="controles-metrica">
          <button
            type="button"
            onClick={metricaAnterior}
            aria-label="Métrica anterior"
            title="Métrica anterior (←)"
          >
            ←
          </button>

          <select
            className="seletor-metrica-dropdown"
            value={metricaAtual.id}
            onChange={(e) => aoSelecionarMetrica(e.target.value as MetricaId)}
            aria-label="Selecionar métrica de escalabilidade"
          >
            {METRICAS_DISPONIVEIS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={proximaMetrica}
            aria-label="Próxima métrica"
            title="Próxima métrica (→)"
          >
            →
          </button>
        </div>

        <div className="metadados-secao">
          <span>Plano <strong>{plano}</strong></span>
          <span>/</span>
          <span>
            Camada{' '}
            <strong>
              {camada === null ? '—' : camada.toString().padStart(2, '0')}
            </strong>
          </span>
        </div>
      </header>

      <div className="palco-secao" aria-live="polite">
        {camada === null ? (
          <div className="estado-vazio">
            <div className="icone-estado-vazio" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <h3>Nenhuma seção selecionada</h3>
            <p>
              Escolha um plano e uma camada no painel lateral para
              visualizar o corte e analisar a escalabilidade.
            </p>
          </div>
        ) : (
          <div className="moldura-mapa">
            <div
              className="mapa-calor"
              role="img"
              aria-label={`Mapa de calor do plano ${plano}, camada ${camada}, métrica: ${metricaAtual.nome}`}
              style={{
                '--colunas': dimensionalidade.COLUNAS,
                '--linhas': dimensionalidade.LINHAS,
              } as React.CSSProperties}
            >
              {dados.map((ponto) => (
                <span
                  className="celula-calor"
                  key={ponto.id}
                  style={{
                    backgroundColor: obterCorCalor(ponto.intensidade),
                  }}
                  tabIndex={0}
                  aria-label={
                    `Rank: ${ponto.rank}, Core: ${ponto.core}, ` +
                    `Input: ${ponto.input}, ${metricaAtual.tituloCurto}: ${ponto.valorFormatado ?? ponto.valorBruto}`
                  }
                >
                  <span className="tooltip-calor">
                    <span>RANK: {ponto.rank}</span>
                    <span>CORE: {ponto.core}</span>
                    <span>INPUT: {ponto.input}</span>
                    <span className="tooltip-valor">
                      {metricaAtual.tituloCurto}: {ponto.valorFormatado ?? ponto.valorBruto}
                    </span>
                  </span>
                </span>
              ))}
            </div>

            <span className="eixo-mapa horizontal">
              Eixo {nomeHorizontal}
            </span>

            <span className="eixo-mapa vertical">
              Eixo {nomeVertical}
            </span>

            <span
              className="legenda-calor"
              aria-label={`Escala de intensidade: de ${rotuloMin} a ${rotuloMax}`}
              style={{
                '--legenda-max': `'${rotuloMax}'`,
                '--legenda-min': `'${rotuloMin}'`,
              } as React.CSSProperties}
            />
          </div>
        )}
      </div>
    </section>
  )
}
