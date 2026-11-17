import type { SeccaoBidimensional } from "../types/visualizacao"

export interface DadosExecucaoJson {
    start_time: number
    stop_time: number
    imbalance?: number
    regions?: Record<string, (number | string)[][]>
}

export interface DadosEntradaJson {
    config?: Record<string, unknown>
    data: Record<string, DadosExecucaoJson>
}

export type Execucao = {
    rank: number
    core: number
    input: number
    time: number
    imbalance: number
}

export type ResultadoSpeedup = Execucao & {
    speedup: number
}

export type ResultadoEficiencia = Execucao & {
    speedup: number
    eficiencia: number
}

export type ResultadoDesbalanceamento = Execucao & {
    desbalanceamento: number
}

export type TerceiraDimensao = "rank" | "core" | "input"

export function calcularMediana(valores: number[]): number {
    if (valores.length === 0) return 0
    const ordenados = [...valores].sort((a, b) => a - b)
    const meio = Math.floor(ordenados.length / 2)
    if (ordenados.length % 2 !== 0) {
        return ordenados[meio]
    }
    return (ordenados[meio - 1] + ordenados[meio]) / 2
}

export class UploadJson {
    public parseJson(dados: DadosEntradaJson): DadosEntradaJson {
        return dados
    }

    public printAllInputs(dados: DadosEntradaJson): void {
        const campoDados = dados.data
        if (!campoDados) return
        const chaveDados = Object.keys(campoDados)

        for (const chave of chaveDados) {
            console.log(chave)
        }
    }

    public dimensionalidadeBidimensional(dados: DadosEntradaJson, terceiraDimensao: TerceiraDimensao): SeccaoBidimensional {
        const dadosExecucoes = this.obterDadosDimensoes(dados)

        const ranks: number[] = []
        const cores: number[] = []
        const inputs: number[] = []

        for (const execucao of dadosExecucoes) {
            ranks.push(execucao.rank)
            cores.push(execucao.core)
            inputs.push(execucao.input)
        }

        const ranksSet = new Set(ranks)
        const coresSet = new Set(cores)
        const inputsSet = new Set(inputs)

        switch (terceiraDimensao) {
            case "rank":
                return { COLUNAS: coresSet.size, LINHAS: inputsSet.size, TERCEIRA_DIMENSAO: ranksSet }
            case "input":
                return { COLUNAS: coresSet.size, LINHAS: ranksSet.size, TERCEIRA_DIMENSAO: inputsSet }
            case "core":
                return { COLUNAS: inputsSet.size, LINHAS: ranksSet.size, TERCEIRA_DIMENSAO: coresSet }
            default:
                throw new Error("Não foi passado um valor válido para representar a terceira dimensão.")
        }
    }

    public obterDadosDimensoes(dados: DadosEntradaJson): Execucao[] {
        const campoDados = dados.data
        if (!campoDados) {
            throw new Error("Formato de JSON inválido: campo 'data' não encontrado.")
        }

        // Agrupador para medições com múltiplas repetições para a mesma célula (rank, core, input)
        const grupos = new Map<string, { rank: number; core: number; input: number; times: number[]; imbalances: number[] }>()

        const chaveDados = Object.keys(campoDados)

        for (const chave of chaveDados) {
            const chaveTratada = String(chave)
            const dadosInternos = campoDados[chave]

            const tempoInicio = Number(dadosInternos.start_time)
            const tempoFim = Number(dadosInternos.stop_time)

            if (!Number.isFinite(tempoInicio) || !Number.isFinite(tempoFim)) {
                throw new Error(`Erro de conversão nos valores de tempo para a chave '${chave}'.`)
            }

            const deltaTime = tempoFim - tempoInicio

            if (deltaTime < 0) {
                throw new Error(`Valor inválido para deltaTime na chave '${chave}'. O intervalo de tempo não pode ser negativo.`)
            }

            const partes = chaveTratada.split(";")
            const rank = Number(partes[0])
            const core = Number(partes[1])
            const input = Number(partes[2])

            if (!Number.isFinite(rank) || !Number.isFinite(core) || !Number.isFinite(input)) {
                throw new Error(`Chave com formato inválido: '${chave}'. Esperado 'rank;core;input;repeticao'.`)
            }

            // Cálculo do desbalanceamento (Load Imbalance) da execução
            let imbalance = 0
            if (dadosInternos.imbalance !== undefined && Number.isFinite(Number(dadosInternos.imbalance))) {
                imbalance = Math.max(0, Math.min(1, Number(dadosInternos.imbalance)))
            } else if (dadosInternos.regions) {
                // Calcula o desbalanceamento a partir do tempo de trabalho por trabalhador (process_id, thread_id)
                const temposTrabalhadores = new Map<string, number>()
                const regioes = dadosInternos.regions

                for (const reg in regioes) {
                    const itens = regioes[reg]
                    if (Array.isArray(itens)) {
                        for (const item of itens) {
                            const inicio = Number(item[0])
                            const fim = Number(item[1])
                            const dur = fim - inicio
                            if (dur > 0) {
                                const idTrabalhador = `${item[5]}_${item[4]}`
                                temposTrabalhadores.set(
                                    idTrabalhador,
                                    (temposTrabalhadores.get(idTrabalhador) || 0) + dur,
                                )
                            }
                        }
                    }
                }

                const tempos = Array.from(temposTrabalhadores.values())
                if (tempos.length > 1) {
                    const maxT = Math.max(...tempos)
                    const avgT = tempos.reduce((acc, t) => acc + t, 0) / tempos.length
                    imbalance = maxT > 0 ? (maxT - avgT) / maxT : 0
                }
            }

            const chaveCelula = `${rank};${core};${input}`
            if (!grupos.has(chaveCelula)) {
                grupos.set(chaveCelula, {
                    rank,
                    core,
                    input,
                    times: [],
                    imbalances: [],
                })
            }

            const grupo = grupos.get(chaveCelula)!
            grupo.times.push(deltaTime)
            grupo.imbalances.push(imbalance)
        }

        // Agregação por mediana por célula para lidar com múltiplas repetições
        const executions: Execucao[] = []
        for (const grupo of grupos.values()) {
            executions.push({
                rank: grupo.rank,
                core: grupo.core,
                input: grupo.input,
                time: calcularMediana(grupo.times),
                imbalance: calcularMediana(grupo.imbalances),
            })
        }

        return executions
    }

    public obterValorPonto(
        resultados: Execucao[],
        rank: number,
        core: number,
        input: number,
    ): Execucao {
        const target = resultados.find(
            (r) => r.core === core && r.input === input && r.rank === rank,
        )

        if (!target) {
            throw new Error(
                `Nenhum valor encontrado para (rank: ${rank}, core: ${core}, input: ${input}).`,
            )
        }

        return target
    }

    public obterTempoSequencial(executions: Execucao[]): Map<number, number> {
        const temposSequenciais = new Map<number, number>()

        // Linha de base sequencial: topologia 1x1 (rank 1, core 1)
        const targets = executions.filter((e) => e.rank === 1 && e.core === 1)

        for (const target of targets) {
            temposSequenciais.set(target.input, target.time)
        }

        // Validação: todos os inputs devem possuir execução 1x1
        const todosInputs = new Set(executions.map((e) => e.input))
        for (const input of todosInputs) {
            if (!temposSequenciais.has(input)) {
                throw new Error(
                    `Baseline sequencial (1 núcleo / topologia 1x1) não encontrada para o input ${input}. ` +
                    `Arquivos sem a execução 1x1 bloqueiam os gráficos de speedup e eficiência.`,
                )
            }
        }

        return temposSequenciais
    }

    public calcularSpeedUps(dados: DadosEntradaJson): ResultadoSpeedup[] {
        const executions = this.obterDadosDimensoes(dados)
        const temposSequenciais = this.obterTempoSequencial(executions)

        // S = T_seq(w) / T_par(w, p)
        const resultadosSpeedups: ResultadoSpeedup[] = []

        for (const execution of executions) {
            const seq = temposSequenciais.get(execution.input)

            if (seq === undefined || !Number.isFinite(seq)) {
                throw new Error("Não foi possível obter o tempo sequencial para o input especificado.")
            }

            if (!Number.isFinite(execution.time) || execution.time <= 0) {
                throw new Error("Tempo de execução inválido para calcular speedup.")
            }

            const speedup = seq / execution.time

            resultadosSpeedups.push({
                rank: execution.rank,
                core: execution.core,
                input: execution.input,
                time: execution.time,
                imbalance: execution.imbalance,
                speedup,
            })
        }

        return resultadosSpeedups
    }

    public obterMaiorSpeedup(speedups: ResultadoSpeedup[]): number {
        return Math.max(0, ...speedups.map((s) => s.speedup))
    }

    public obterSpeedupMaximo(speedups: ResultadoSpeedup[]): number {
        const maiorSpeedup = Math.max(0, ...speedups.map((s) => s.speedup))
        return Math.max(1, Math.ceil(maiorSpeedup))
    }

    public calcularEficiencia(dados: DadosEntradaJson): ResultadoEficiencia[] {
        const resultadosSpeedups = this.calcularSpeedUps(dados)
        const resultadosEficiencia: ResultadoEficiencia[] = []

        for (const resultado of resultadosSpeedups) {
            const p = resultado.rank * resultado.core

            if (p <= 0 || !Number.isFinite(p)) {
                throw new Error("Paralelismo efetivo inválido para calcular eficiência.")
            }

            const eficiencia = resultado.speedup / p

            resultadosEficiencia.push({
                rank: resultado.rank,
                core: resultado.core,
                input: resultado.input,
                time: resultado.time,
                imbalance: resultado.imbalance,
                speedup: resultado.speedup,
                eficiencia,
            })
        }

        return resultadosEficiencia
    }

    public calcularDesbalanceamento(dados: DadosEntradaJson): ResultadoDesbalanceamento[] {
        const executions = this.obterDadosDimensoes(dados)
        return executions.map((e) => ({
            ...e,
            desbalanceamento: e.imbalance,
        }))
    }
}
