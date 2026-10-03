export function Cabecalho() {
  return (
    <header className="cabecalho">
      <div className="marca">
        <span className="marca-simbolo" aria-hidden="true" />
        <div>
          <h1>Graph Visualizer</h1>
          <p>Conversão espacial 3D → 2D</p>
        </div>
      </div>
      <div className="acoes-cabecalho">
        <span className="estado-sistema">Sistema pronto</span>
        <button className="botao-icone" type="button" title="Informações do protótipo" aria-label="Informações do protótipo">i</button>
      </div>
    </header>
  )
}
