import { useMemo, useState } from 'react'
import { Cabecalho } from './components/Cabecalho'
import { CuboInterativo } from './components/CuboInterativo'
import { PainelControles } from './components/PainelControles'
import { RodapeStatus } from './components/RodapeStatus'
import { UploadJson } from './components/UploadJson'
import { VisualizadorSecao } from './components/VisualizadorSecao'
import { METRICAS_DISPONIVEIS } from './types/visualizacao'
import type { Plano, MetricaId } from './types/visualizacao'
import { gerarMapaCalor } from './utils/gerarMapaCalor'
import data from "../jsons/hybrid_montecarlo_pi.json"
import './App.css'

const uploader = new UploadJson()

const DIMENSAO_POR_PLANO = {
  XY: 'rank',
  XZ: 'core',
  YZ: 'input',
} as const

function App() {
  const [plano, definirPlano] = useState<Plano>('XY')
  const [camada, definirCamada] = useState<number | null>(null)
  const [metricaIndex, setMetricaIndex] = useState<number>(0)

  const metricaAtual = METRICAS_DISPONIVEIS[metricaIndex]

  function proximaMetrica() {
    setMetricaIndex((atual) => (atual + 1) % METRICAS_DISPONIVEIS.length)
  }

  function metricaAnterior() {
    setMetricaIndex((atual) =>
      (atual - 1 + METRICAS_DISPONIVEIS.length) % METRICAS_DISPONIVEIS.length
    )
  }

  function selecionarMetrica(id: MetricaId) {
    const idx = METRICAS_DISPONIVEIS.findIndex((m) => m.id === id)
    if (idx !== -1) {
      setMetricaIndex(idx)
    }
  }

  const dimensionalidade = useMemo(
    () => uploader.dimensionalidadeBidimensional(
      data,
      DIMENSAO_POR_PLANO[plano],
    ),
    [plano],
  )

  const dadosCalor = useMemo(
    () => camada === null ? [] : gerarMapaCalor(plano, camada, metricaAtual.id),
    [plano, camada, metricaAtual.id],
  )

  return (
    <main className="aplicacao">
      <Cabecalho />

      <section className="espaco-trabalho" aria-label="Área de visualização">
        <aside className="barra-lateral">
          <CuboInterativo plano={plano} camada={camada} />

          <PainelControles
            plano={plano}
            camada={camada}
            limiteInferior={0}
            limiteSuperior={20}
            aoAlterarPlano={definirPlano}
            aoAlterarCamada={definirCamada}
          />
        </aside>

        <VisualizadorSecao
          plano={plano}
          camada={camada}
          dados={dadosCalor}
          dimensionalidade={dimensionalidade}
          metricaAtual={metricaAtual}
          proximaMetrica={proximaMetrica}
          metricaAnterior={metricaAnterior}
          aoSelecionarMetrica={selecionarMetrica}
        />
      </section>

      <RodapeStatus plano={plano} camada={camada} />
    </main>
  )
}

export default App
