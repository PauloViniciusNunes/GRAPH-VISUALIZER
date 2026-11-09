
import type { Plano } from '../types/visualizacao'
import data from "../../jsons/hybrid_montecarlo_pi.json"
import { UploadJson } from './UploadJson'

interface PropriedadesPainel {
  plano: Plano
  camada: number | null
  limiteInferior: number
  limiteSuperior: number
  aoAlterarPlano: (plano: Plano) => void
  aoAlterarCamada: (camada: number | null) => void
}

const PLANOS: Plano[] = ['XY', 'XZ', 'YZ']
const uploader = new UploadJson()

const DIMENSAO_POR_PLANO: Record<Plano, 'rank' | 'core' | 'input'> = {
  XY: 'rank',
  XZ: 'core',
  YZ: 'input',
}

export function PainelControles({
  plano,
  camada,
  limiteInferior,
  limiteSuperior,
  aoAlterarPlano,
  aoAlterarCamada,
}: PropriedadesPainel) {
  const dimensionalidade = uploader.dimensionalidadeBidimensional(
    data,
    DIMENSAO_POR_PLANO[plano],
  )

  const opcoesCamada = Array.from(
    dimensionalidade.TERCEIRA_DIMENSAO,
  ).sort((a, b) => a - b)

  function selecionarPlano(novoPlano: Plano) {
    aoAlterarPlano(novoPlano)

    const dimensao = uploader.dimensionalidadeBidimensional(
      data,
      DIMENSAO_POR_PLANO[novoPlano],
    )

    const novasOpcoes = Array.from(
      dimensao.TERCEIRA_DIMENSAO,
    ).sort((a, b) => a - b)

    aoAlterarCamada(novasOpcoes[0] ?? null)
  }

  return (
    <section
      className="painel-controles"
      aria-labelledby="titulo-parametros"
    >
      <p className="titulo-bloco" id="titulo-parametros">
        Parâmetros da seção
      </p>

      <div className="grupo-controle">
        <div className="rotulo-controle">
          <span>Plano</span>
        </div>

        <div
          className="seletor-planos"
          role="group"
          aria-label="Selecionar plano"
        >
          {PLANOS.map((opcao) => (
            <button
              key={opcao}
              type="button"
              className={opcao === plano ? 'ativo' : ''}
              aria-pressed={opcao === plano}
              onClick={() => selecionarPlano(opcao)}
            >
              {opcao}
            </button>
          ))}
        </div>
      </div>

      <div className="grupo-controle">
        <div className="rotulo-controle">
          <span>Camada {DIMENSAO_POR_PLANO[plano].toUpperCase()}</span>
          <span className="intervalo">
            {opcoesCamada.length} opções
          </span>
        </div>

        <div
          className="seletor-camadas"
          role="group"
          aria-label={`Selecionar camada do plano ${plano}`}
        >
          {opcoesCamada
            .filter(
              (valor) =>
                valor >= limiteInferior &&
                valor <= limiteSuperior,
            )
            .map((valor) => (
              <button
                key={valor}
                type="button"
                className={camada === valor ? 'ativo' : ''}
                aria-pressed={camada === valor}
                onClick={() => aoAlterarCamada(valor)}
              >
                {valor}
              </button>
            ))}
        </div>
      </div>

      <aside className="nota-controle" id="nota-camada">
        <strong>i</strong>
        <span>
          Selecione um plano e uma camada para revelar o plano de
          corte e visualizar as métricas de escalabilidade correspondentes.
        </span>
      </aside>
    </section>
  )
}
