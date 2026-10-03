import type { Plano } from '../types/visualizacao'

interface PropriedadesPainel {
  plano: Plano
  camada: number | null
  limiteInferior: number
  limiteSuperior: number
  aoAlterarPlano: (plano: Plano) => void
  aoAlterarCamada: (camada: number | null) => void
}

const PLANOS: Plano[] = ['XY', 'XZ', 'YZ']

export function PainelControles({ plano, camada, limiteInferior, limiteSuperior, aoAlterarPlano, aoAlterarCamada }: PropriedadesPainel) {
  function limitarCamada(valor: number) {
    return Math.max(limiteInferior, Math.min(limiteSuperior, Math.round(valor)))
  }

  function alterarValor(valor: string) {
    if (valor === '') {
      aoAlterarCamada(null)
      return
    }
    aoAlterarCamada(limitarCamada(Number(valor)))
  }

  function incrementarCamada(incremento: number) {
    aoAlterarCamada(limitarCamada((camada ?? limiteInferior) + incremento))
  }

  return (
    <section className="painel-controles" aria-labelledby="titulo-parametros">
      <p className="titulo-bloco" id="titulo-parametros">Parâmetros da seção</p>
      <div className="grupo-controle">
        <div className="rotulo-controle"><span>Plano</span></div>
        <div className="seletor-planos" role="group" aria-label="Selecionar plano">
          {PLANOS.map((opcao) => (
            <button key={opcao} type="button" className={opcao === plano ? 'ativo' : ''} aria-pressed={opcao === plano} onClick={() => aoAlterarPlano(opcao)}>{opcao}</button>
          ))}
        </div>
      </div>
      <div className="grupo-controle">
        <div className="rotulo-controle">
          <label htmlFor="entrada-camada">Camada</label>
          <span className="intervalo">{limiteInferior} — {limiteSuperior}</span>
        </div>
        <div className="controle-camada">
          <button type="button" onClick={() => incrementarCamada(-1)} aria-label="Camada anterior">−</button>
          <input id="entrada-camada" type="number" min={limiteInferior} max={limiteSuperior} value={camada ?? ''} placeholder="—" onChange={(evento) => alterarValor(evento.target.value)} aria-describedby="nota-camada" />
          <button type="button" onClick={() => incrementarCamada(1)} aria-label="Próxima camada">+</button>
        </div>
        <div className="escala-camada" aria-hidden="true" />
        <div className="limites-camada" aria-hidden="true">
          <span>{limiteInferior.toString().padStart(2, '0')}</span>
          <span>{limiteSuperior.toString().padStart(2, '0')}</span>
        </div>
      </div>
      <aside className="nota-controle" id="nota-camada">
        <strong>i</strong><span>Informe uma camada para revelar o plano de corte e gerar sua leitura térmica.</span>
      </aside>
    </section>
  )
}
