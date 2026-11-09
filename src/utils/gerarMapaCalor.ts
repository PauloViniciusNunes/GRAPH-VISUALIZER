import data from "../../jsons/hybrid_montecarlo_pi.json"
import { UploadJson } from '../components/UploadJson'
import type { Plano, PontoCalor, MetricaId } from '../types/visualizacao'

const uploadJson = new UploadJson()

export function gerarMapaCalor(
  plano: Plano,
  camada: number,
  metrica: MetricaId
): PontoCalor[] {
  const eficiencias = uploadJson.calcularEficiencia(data)

  const valoresX = [...new Set(
    eficiencias.map((r) => plano === "YZ" ? r.core : r.input)
  )].sort((a, b) => a - b)

  const valoresY = [...new Set(
    eficiencias.map((r) => plano === "XY" ? r.core : r.rank)
  )].sort((a, b) => a - b)

  const dadosCamada = eficiencias.filter((r) => {
    switch (plano) {
      case "XY":
        return r.rank === camada
      case "XZ":
        return r.core === camada
      case "YZ":
        return r.input === camada
    }
  })

  if (dadosCamada.length === 0) {
    return []
  }

  const speedupMaximo = uploadJson.obterSpeedupMaximo(eficiencias)

  // Constrói a matriz bidimensional de eficiência (em porcentagem 0-100) para a seção ativa
  // grid[rowIndex][colIndex] onde colIndex é X (input/workload em XY/XZ) e rowIndex é Y (recurso paralelo)
  const gridEficiencia: number[][] = Array.from(
    { length: valoresY.length },
    () => Array(valoresX.length).fill(0),
  )

  const gridDados: (typeof dadosCamada[0] | undefined)[][] = Array.from(
    { length: valoresY.length },
    () => Array(valoresX.length).fill(undefined),
  )

  for (const r of dadosCamada) {
    const x = plano === "YZ" ? r.core : r.input
    const y = plano === "XY" ? r.core : r.rank

    const indiceX = valoresX.indexOf(x)
    const indiceY = valoresY.indexOf(y)

    if (indiceX >= 0 && indiceY >= 0) {
      gridEficiencia[indiceY][indiceX] = r.eficiencia * 100 // Eficiência em porcentagem
      gridDados[indiceY][indiceX] = r
    }
  }

  // Tratamento específico de cada métrica
  switch (metrica) {
    case "eficiencia": {
      return dadosCamada.map((r) => {
        const x = plano === "YZ" ? r.core : r.input
        const y = plano === "XY" ? r.core : r.rank
        const indiceX = valoresX.indexOf(x)
        const indiceY = valoresY.indexOf(y)
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
      return dadosCamada.map((r) => {
        const x = plano === "YZ" ? r.core : r.input
        const y = plano === "XY" ? r.core : r.rank
        const indiceX = valoresX.indexOf(x)
        const indiceY = valoresY.indexOf(y)

        return {
          id: `${indiceX}-${indiceY}`,
          intensidade: Math.min(1, Math.max(0, r.speedup / speedupMaximo)),
          rank: r.rank,
          core: r.core,
          input: r.input,
          valorBruto: Number(r.speedup.toFixed(2)),
          valorFormatado: `${r.speedup.toFixed(2)}x`,
        }
      })
    }

    case "imbalance": {
      return dadosCamada.map((r) => {
        const x = plano === "YZ" ? r.core : r.input
        const y = plano === "XY" ? r.core : r.rank
        const indiceX = valoresX.indexOf(x)
        const indiceY = valoresY.indexOf(y)

        return {
          id: `${indiceX}-${indiceY}`,
          intensidade: Math.min(1, Math.max(0, r.imbalance)),
          rank: r.rank,
          core: r.core,
          input: r.input,
          valorBruto: Number((r.imbalance * 100).toFixed(2)),
          valorFormatado: `${(r.imbalance * 100).toFixed(1)}%`,
        }
      })
    }

    // Métricas de Escalabilidade (Construídas a partir da matriz de eficiência E(w, p))
    case "strong":
    case "scalab":
    case "weak":
    case "rel_strong":
    case "rel_scalab":
    case "rel_weak": {
      const pontosCalculados: {
        id: string
        rank: number
        core: number
        input: number
        diff: number
      }[] = []

      const totalLinhas = valoresY.length

      for (let i = 0; i < valoresY.length; i++) {
        for (let j = 0; j < valoresX.length; j++) {
          const item = gridDados[i][j]
          if (!item) continue

          const eAtual = gridEficiencia[i][j]
          let diff = 0

          switch (metrica) {
            case "strong": {
              // Strong(w, p) = E(w, p) - E(w, p1)
              // Compara com a 1ª configuração paralela (não sequencial: linha de índice 1 se existir)
              const linhaBase = totalLinhas > 1 ? 1 : 0
              const eBase = gridEficiencia[linhaBase][j]
              diff = eAtual - eBase
              break
            }

            case "scalab": {
              // Scalab(w, p) = E(w, p) - E(w1, p)
              // Compara com a 1ª carga de trabalho (coluna de índice 0)
              const eBase = gridEficiencia[i][0]
              diff = eAtual - eBase
              break
            }

            case "weak": {
              // Weak(w, p) = E(w, p) - E(w - m, p - m), m = min(w, p)
              // Compara com o ponto base na origem do raio diagonal (45 graus)
              const m = Math.min(i, j)
              const eBase = gridEficiencia[i - m][j - m]
              diff = eAtual - eBase
              break
            }

            case "rel_strong": {
              // RelStrong(w, p) = E(w, p) - E(w, p - 1)
              // Variação em relação à configuração paralela imediatamente anterior
              if (i > 0) {
                const eAnterior = gridEficiencia[i - 1][j]
                diff = eAtual - eAnterior
              } else {
                diff = 0
              }
              break
            }

            case "rel_scalab": {
              // RelScalab(w, p) = E(w, p) - E(w - 1, p)
              // Variação em relação à carga imediatamente anterior
              if (j > 0) {
                const eAnterior = gridEficiencia[i][j - 1]
                diff = eAtual - eAnterior
              } else {
                diff = 0
              }
              break
            }

            case "rel_weak": {
              // RelWeak(w, p) = E(w, p) - E(w - 1, p - 1)
              // Variação em relação ao ponto diagonal imediatamente anterior
              if (i > 0 && j > 0) {
                const eAnterior = gridEficiencia[i - 1][j - 1]
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

      // Normalização bipolar centrada em zero:
      // diff == 0 -> intensidade 0.5 (neutro)
      // diff > 0  -> intensidade (0.5, 1.0] (aquecimento/melhoria)
      // diff < 0  -> intensidade [0.0, 0.5) (resfriamento/regressão)
      const maxAbs = Math.max(0.01, ...pontosCalculados.map((p) => Math.abs(p.diff)))

      return pontosCalculados.map((p) => {
        const intensidade = Math.min(
          1,
          Math.max(0, 0.5 + (0.5 * p.diff) / maxAbs),
        )
        const prefixo = p.diff > 0 ? "+" : ""

        return {
          id: p.id,
          intensidade,
          rank: p.rank,
          core: p.core,
          input: p.input,
          valorBruto: Number(p.diff.toFixed(2)),
          valorFormatado: `${prefixo}${p.diff.toFixed(2)}%`,
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
