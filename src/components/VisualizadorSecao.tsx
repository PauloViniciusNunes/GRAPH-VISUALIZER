import type { Plano, PontoCalor } from '../types/visualizacao'
import { obterCorCalor } from '../utils/gerarMapaCalor'

interface PropriedadesVisualizador { plano: Plano; camada: number | null; dados: PontoCalor[] }
const EIXOS_POR_PLANO: Record<Plano, [string, string]> = { XY: ['x', 'y'], XZ: ['x', 'z'], YZ: ['y', 'z'] }

export function VisualizadorSecao({ plano, camada, dados }: PropriedadesVisualizador) {
  const [eixoHorizontal, eixoVertical] = EIXOS_POR_PLANO[plano]

  return (
    <section className="visualizador-secao" aria-labelledby="titulo-secao">
      <header className="cabecalho-visualizador">
        <div><p className="titulo-bloco">Interpretação bidimensional</p><h2 id="titulo-secao">Visualizador da seção</h2></div>
        <div className="metadados-secao">
          <span>Plano <strong>{plano}</strong></span><span>/</span>
          <span>Camada <strong>{camada === null ? '—' : camada.toString().padStart(2, '0')}</strong></span>
        </div>
      </header>
      <div className="palco-secao" aria-live="polite">
        {camada === null ? (
          <div className="estado-vazio">
            {/* Representação abstrata de planos empilhados para orientar o primeiro uso. */}
            <div className="icone-estado-vazio" aria-hidden="true"><span /><span /><span /></div>
            <h3>Nenhuma seção selecionada</h3>
            <p>Escolha um plano e informe a camada no painel lateral para visualizar o corte.</p>
          </div>
        ) : (
          <div className="moldura-mapa">
            {/* Grade térmica provisória gerada de forma determinística para cada corte. */}
            <div className="mapa-calor" role="img" aria-label={`Mapa de calor do plano ${plano}, camada ${camada}`}>
              {dados.map((ponto) => (
                <span className="celula-calor" key={ponto.id} style={{ backgroundColor: obterCorCalor(ponto.intensidade) }} />
              ))}
            </div>
            <span className="eixo-mapa horizontal">Eixo {eixoHorizontal}</span>
            <span className="eixo-mapa vertical">Eixo {eixoVertical}</span>
            <span className="legenda-calor" aria-label="Escala de intensidade de zero a um" />
          </div>
        )}
      </div>
    </section>
  )
}
