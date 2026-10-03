import { useMemo, useState } from 'react'
import { Cabecalho } from './components/Cabecalho'
import { CuboInterativo } from './components/CuboInterativo'
import { PainelControles } from './components/PainelControles'
import { RodapeStatus } from './components/RodapeStatus'
import { VisualizadorSecao } from './components/VisualizadorSecao'
import type { Plano } from './types/visualizacao'
import { gerarMapaCalor } from './utils/gerarMapaCalor'
import './App.css'

function App() {
  const [plano, definirPlano] = useState<Plano>('XY')
  const [camada, definirCamada] = useState<number | null>(null)
  const dadosCalor = useMemo(
    () => (camada === null ? [] : gerarMapaCalor(plano, camada)),
    [plano, camada],
  )

  return (
    <main className="aplicacao">
      <Cabecalho />
      <section className="espaco-trabalho" aria-label="Área de visualização">
        {/* Coluna de contexto espacial e parâmetros do corte. */}
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
        {/* A área 2D sempre reflete a seleção feita no painel lateral. */}
        <VisualizadorSecao plano={plano} camada={camada} dados={dadosCalor} />
      </section>
      <RodapeStatus plano={plano} camada={camada} />
    </main>
  )
}

export default App
