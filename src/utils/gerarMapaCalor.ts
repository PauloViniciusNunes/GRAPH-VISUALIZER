import type { Plano, PontoCalor } from '../types/visualizacao'

const COLUNAS = 28
const LINHAS = 20

// Gera ruído pseudoaleatório determinístico para manter cada plano/camada estável.
function ruidoDeterministico(semente: number) {
  const valor = Math.sin(semente * 12.9898) * 43758.5453
  return valor - Math.floor(valor)
}

// Combina ondas e pontos quentes para simular uma leitura volumétrica provisória.
export function gerarMapaCalor(plano: Plano, camada: number): PontoCalor[] {
  const deslocamentoPlano = plano === 'XY' ? 17 : plano === 'XZ' ? 43 : 79

  return Array.from({ length: COLUNAS * LINHAS }, (_, indice) => {
    const x = indice % COLUNAS
    const y = Math.floor(indice / COLUNAS)
    const onda = (Math.sin((x + camada) * 0.38) + Math.cos((y - camada) * 0.47) + 2) / 4
    const ruido = ruidoDeterministico(indice + camada * 31 + deslocamentoPlano)
    const distanciaA = Math.hypot(x - (8 + camada * 0.25), y - 7)
    const distanciaB = Math.hypot(x - 20, y - (13 - camada * 0.16))
    const focos = Math.max(Math.exp(-distanciaA * 0.22), Math.exp(-distanciaB * 0.25))
    const intensidade = Math.min(1, Math.max(0, onda * 0.25 + ruido * 0.18 + focos * 0.72))
    return { id: `${x}-${y}`, intensidade }
  })
}

// Traduz a intensidade num gradiente térmico com contraste suficiente para leitura.
export function obterCorCalor(intensidade: number) {
  const pontos = [
    [0, [16, 38, 60]],
    [0.25, [20, 103, 143]],
    [0.48, [49, 183, 157]],
    [0.68, [230, 214, 85]],
    [0.84, [242, 133, 49]],
    [1, [220, 56, 47]],
  ] as const
  const superior = pontos.findIndex(([limite]) => intensidade <= limite)
  const indiceFinal = superior <= 0 ? 1 : superior
  const [inicio, corInicio] = pontos[indiceFinal - 1]
  const [fim, corFim] = pontos[indiceFinal]
  const proporcao = (intensidade - inicio) / (fim - inicio)
  const canais = corInicio.map((canal, indice) =>
    Math.round(canal + (corFim[indice] - canal) * proporcao),
  )
  return `rgb(${canais.join(', ')})`
}
