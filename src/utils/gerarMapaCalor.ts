import data from "../../jsons/hybrid_montecarlo_pi.json"
import { UploadJson } from '../components/UploadJson'
import type { Plano, PontoCalor, MetricaId } from '../types/visualizacao'

const uploadJson = new UploadJson()

function obterEixoHorizontal(plano: Plano, ponto: { core: number; input: number }): number {
  return plano === 'INPUT/RANK' ? ponto.input : ponto.core
}

function obterEixoVertical(plano: Plano, ponto: { input: number; rank: number }): number {
  return plano === 'CORE/INPUT' ? ponto.input : ponto.rank
}

function mapearCelulasGrid<T>(
  grid: (T | undefined)[][],
  transformar: (item: T, colIndex: number, rowIndex: number) => PontoCalor,
): PontoCalor[] {
  const pontos: PontoCalor[] = []
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const item = grid[i][j]
      if (item) {
        pontos.push(transformar(item, j, i))
      }
    }
  }
  return pontos
}

export function gerarMapaCalor(
  plano: Plano,
  camada: number,
  metrica: MetricaId
): PontoCalor[] {
  const eficiencias = uploadJson.calcularEficiencia(data)

  // Para a métrica de escalabilidade fraca, o input 0 é sempre 0% e é omitido quando input compõe o plano
  const filtrarInput0 = metrica === 'weak' && plano !== 'CORE/RANK'

  const valoresX = [...new Set(
    eficiencias
      .filter((r) => !(filtrarInput0 && r.input === 0))
      .map((r) => obterEixoHorizontal(plano, r))
  )].sort((a, b) => a - b)

  const valoresY = [...new Set(
    eficiencias
      .filter((r) => !(filtrarInput0 && r.input === 0))
      .map((r) => obterEixoVertical(plano, r))
  )].sort((a, b) => a - b)

  const dadosCamada = eficiencias.filter((r) => {
    if (filtrarInput0 && r.input === 0) {
      return false
    }
    switch (plano) {
      case 'CORE/INPUT':
        return r.rank === camada
      case 'CORE/RANK':
        return r.input === camada
      case 'INPUT/RANK':
        return r.core === camada
    }
  })

  if (dadosCamada.length === 0) {
    return []
  }

  const speedupMaximo = uploadJson.obterSpeedupMaximo(eficiencias)

  // gridDados[rowIndex][colIndex] ordenado pelos eixos horizontais/verticais do plano ativo
  const gridDados: (typeof dadosCamada[0] | undefined)[][] = Array.from(
    { length: valoresY.length },
    () => Array(valoresX.length).fill(undefined),
  )

  for (const r of dadosCamada) {
    const indiceX = valoresX.indexOf(obterEixoHorizontal(plano, r))
    const indiceY = valoresY.indexOf(obterEixoVertical(plano, r))

    if (indiceX >= 0 && indiceY >= 0) {
      gridDados[indiceY][indiceX] = r
    }
  }

  // Tratamento específico de cada métrica
  switch (metrica) {
    case "eficiencia": {
      return mapearCelulasGrid(gridDados, (r, indiceX, indiceY) => {
        const valorPerc = r.eficiencia * 100
        return {
          id: `${indiceX}-${indiceY}`,
          intensidade: Math.min(1, Math.max(0, r.eficiencia)),
          rank: r.rank,
          core: r.core,
          input: r.input,
          valorBruto: Number(valorPerc.toFixed(2)),
          valorFormatado: `${valorPerc.toFixed(2)}%`,
        }
      })
    }

    case "speedup": {
      return mapearCelulasGrid(gridDados, (r, indiceX, indiceY) => ({
        id: `${indiceX}-${indiceY}`,
        intensidade: Math.min(1, Math.max(0, r.speedup / speedupMaximo)),
        rank: r.rank,
        core: r.core,
        input: r.input,
        valorBruto: Number(r.speedup.toFixed(2)),
        valorFormatado: `${r.speedup.toFixed(2)}x`,
      }))
    }

    case "imbalance": {
      return mapearCelulasGrid(gridDados, (r, indiceX, indiceY) => ({
        id: `${indiceX}-${indiceY}`,
        intensidade: Math.min(1, Math.max(0, r.imbalance)),
        rank: r.rank,
        core: r.core,
        input: r.input,
        valorBruto: Number((r.imbalance * 100).toFixed(2)),
        valorFormatado: `${(r.imbalance * 100).toFixed(1)}%`,
      }))
    }

    // Métricas de Escalabilidade (Construídas a partir da matriz de eficiência E(w, p))
    case "strong":
    case "scalab":
    case "weak":
    case "rel_strong":
    case "rel_scalab":
    case "rel_weak": {
      // Matriz global de eficiência para o modelo híbrido (Topologias x Cargas de Trabalho)
      const workloads = [...new Set(eficiencias.map((e) => e.input))].sort((a, b) => a - b)

      const toposMap = new Map<string, { rank: number; core: number; p: number }>()
      for (const e of eficiencias) {
        const k = `${e.rank}x${e.core}`
        if (!toposMap.has(k)) {
          toposMap.set(k, { rank: e.rank, core: e.core, p: e.rank * e.core })
        }
      }
      const topos = [...toposMap.values()].sort((a, b) => a.p - b.p || a.rank - b.rank)

      const gridGlobal: number[][] = topos.map((t) => {
        return workloads.map((w) => {
          const item = eficiencias.find((e) => e.rank === t.rank && e.core === t.core && e.input === w)
          return item ? Number((item.eficiencia * 100).toFixed(2)) : 0
        })
      })

      const pontosCalculados: {
        id: string
        rank: number
        core: number
        input: number
        diff: number
      }[] = []

      for (let i = 0; i < valoresY.length; i++) {
        for (let j = 0; j < valoresX.length; j++) {
          const item = gridDados[i][j]
          if (!item) continue

          const pIdx = topos.findIndex((t) => t.rank === item.rank && t.core === item.core)
          const wIdx = workloads.indexOf(item.input)
          if (pIdx === -1 || wIdx === -1) continue

          const eAtual = gridGlobal[pIdx][wIdx]
          let diff = 0

          switch (metrica) {
            case "strong": {
              // Strong(w, p) = E(w, p) - E(w, p₁)
              // Topologia p₁ é o baseline sequencial 1x1 (índice 0, onde a eficiência é 100.00%)
              const eBase = gridGlobal[0][wIdx]
              diff = eAtual - eBase
              break
            }

            case "scalab": {
              // Scalab(w, p) = E(w, p) - E(w₁, p)
              // Compara com a 1ª carga de trabalho (coluna de índice 0)
              const eBase = gridGlobal[pIdx][0]
              diff = eAtual - eBase
              break
            }

            case "weak": {
              // Weak(w, p) = E(w, p) - E(w - m, p - m), m = min(w, p)
              // Compara diagonalmente os passos de crescimento de carga e recursos
              const m = Math.min(wIdx, pIdx)
              const eBase = gridGlobal[pIdx - m][wIdx - m]
              diff = eAtual - eBase
              break
            }

            case "rel_strong": {
              // RelStrong(w, p) = E(w, p) - E(w, p - 1)
              // Variação em relação à topologia paralela imediatamente anterior
              if (pIdx > 0) {
                const eAnterior = gridGlobal[pIdx - 1][wIdx]
                diff = eAtual - eAnterior
              } else {
                diff = 0
              }
              break
            }

            case "rel_scalab": {
              // RelScalab(w, p) = E(w, p) - E(w - 1, p)
              // Variação em relação à carga imediatamente anterior
              if (wIdx > 0) {
                const eAnterior = gridGlobal[pIdx][wIdx - 1]
                diff = eAtual - eAnterior
              } else {
                diff = 0
              }
              break
            }

            case "rel_weak": {
              // RelWeak(w, p) = E(w, p) - E(w - 1, p - 1)
              // Variação em relação ao ponto diagonal imediatamente anterior
              if (pIdx > 0 && wIdx > 0) {
                const eAnterior = gridGlobal[pIdx - 1][wIdx - 1]
                diff = eAtual - eAnterior
              } else {
                diff = 0
              }
              break
            }
          }

          pontosCalculados.push({
            id: `${j}-${i}`,
            rank: item.rank,
            core: item.core,
            input: item.input,
            diff,
          })
        }
      }

      // Escala fixa de porcentagem de -100% até +100%:
      // diff == -100% -> intensidade 0.0 (frio/degradação máxima)
      // diff ==    0% -> intensidade 0.5 (neutro)
      // diff == +100% -> intensidade 1.0 (aquecimento/melhoria máxima)
      return pontosCalculados.map((p) => {
        const intensidade = Math.min(
          1,
          Math.max(0, 0.5 + (0.5 * p.diff) / 100),
        )
        const prefixo = p.diff > 0 ? "+" : ""

        return {
          id: p.id,
          intensidade,
          rank: p.rank,
          core: p.core,
          input: p.input,
          valorBruto: Number(p.diff.toFixed(3)),
          valorFormatado: `${prefixo}${p.diff.toFixed(3)}%`,
        }
      })
    }
  }
}

// Traduz a intensidade num gradiente térmico com contraste suficiente para leitura.
export function obterCorCalor(intensidade: number): string {
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
