import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import type { Plano } from '../types/visualizacao'

interface PropriedadesCubo { plano: Plano; camada: number | null }
interface Rotacao { x: number; y: number }

export function CuboInterativo({ plano, camada }: PropriedadesCubo) {
  const [rotacao, definirRotacao] = useState<Rotacao>({ x: -20, y: 34 })
  const arraste = useRef<{ x: number; y: number; rotacao: Rotacao } | null>(null)

  function iniciarArraste(evento: PointerEvent<HTMLDivElement>) {
    evento.currentTarget.setPointerCapture(evento.pointerId)
    arraste.current = { x: evento.clientX, y: evento.clientY, rotacao }
  }

  function moverCubo(evento: PointerEvent<HTMLDivElement>) {
    if (!arraste.current) return
    const deltaX = evento.clientX - arraste.current.x
    const deltaY = evento.clientY - arraste.current.y
    definirRotacao({
      x: Math.max(-80, Math.min(80, arraste.current.rotacao.x - deltaY * 0.45)),
      y: arraste.current.rotacao.y + deltaX * 0.45,
    })
  }

  function encerrarArraste() { arraste.current = null }

  function controlarTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    const incremento = 7
    const { key } = evento
    if (!key.startsWith('Arrow')) return
    evento.preventDefault()
    if (key === 'ArrowLeft') definirRotacao((atual) => ({ ...atual, y: atual.y - incremento }))
    if (key === 'ArrowRight') definirRotacao((atual) => ({ ...atual, y: atual.y + incremento }))
    if (key === 'ArrowUp') definirRotacao((atual) => ({ ...atual, x: atual.x - incremento }))
    if (key === 'ArrowDown') definirRotacao((atual) => ({ ...atual, x: atual.x + incremento }))
  }

  const posicaoCorte = camada === null ? 0 : -46 + (camada / 20) * 92
  const estiloCena = { transform: `rotateX(${rotacao.x}deg) rotateY(${rotacao.y}deg)` }
  const estiloPlano = { '--posicao-corte': `${posicaoCorte}px` } as CSSProperties

  return (
    <section className="painel-cubo" aria-labelledby="titulo-cubo">
      <p className="titulo-bloco" id="titulo-cubo">Orientação 3D</p>
      {/* O mesmo estado de rotação é aplicado ao cubo e ao indicador de eixos. */}
      <div
        className="palco-cubo"
        role="application"
        aria-label="Cubo tridimensional. Arraste ou use as setas para girar."
        tabIndex={0}
        onPointerDown={iniciarArraste}
        onPointerMove={moverCubo}
        onPointerUp={encerrarArraste}
        onPointerCancel={encerrarArraste}
        onKeyDown={controlarTeclado}
      >
        {/* OBJETO 3D VISÍVEL */}
        <div className="cena-3d" style={estiloCena}>
          <span className="face-cubo frente" /><span className="face-cubo tras" />
          <span className="face-cubo direita" /><span className="face-cubo esquerda" />
          <span className="face-cubo topo" /><span className="face-cubo base" />
          <span className={`plano-corte plano-${plano.toLowerCase()} ${camada !== null ? 'ativo' : ''}`} style={estiloPlano} />
        </div>
        {/* EIXOS */}
        <div className="eixos" style={estiloCena} aria-hidden="true">
          <span className="eixo eixo-x" data-eixo="x" />
          <span className="eixo eixo-y" data-eixo="y" />
          <span className="eixo eixo-z" data-eixo="z" />
        </div>
      </div>
      <span className="dica-arraste">↔ Arraste para rotacionar</span>
    </section>
  )
}
