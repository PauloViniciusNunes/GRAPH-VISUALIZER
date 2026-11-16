# AGENTS.md — Memória Técnica e Histórico de Alterações

Este documento consolida o conhecimento técnico sobre o projeto **GRAPH-VISUALIZER**, o modelo de dados de HPC (Computação de Alto Desempenho) subjacente, as métricas de escalabilidade implementadas e o histórico das alterações recentes realizadas no código.

---

## 1. Visão Geral do Projeto

* **Nome do Projeto:** GRAPH-VISUALIZER (Visualizador gráfico 3D → 2D).
* **Objetivo:** Aplicação web interativa para exploração visual e análise de escalabilidade de benchmarks paralelos híbridos (**MPI + OpenMP**) executados em ambientes de supercomputação (HPC).
* **Origem dos Dados:** Relatórios JSON gerados pelo **`pascalanalyzer`** (ferramenta de análise e instrumentação pertencente ao ecossistema *PaScal Suite / PaScal Viewer*, desenvolvido no âmbito de laboratórios da UFRN / NPAD / LAPPS).
* **Baseline Sequencial Mandatório:** Todo arquivo de entrada deve conter obrigatoriamente a execução com a **topologia $1 \times 1$** ($1\text{ rank MPI} \times 1\text{ core OpenMP}$) para servir como referência sequencial estrita ($T_{\text{seq}}$) para cada carga computacional ($w$).

---

## 2. Modelo Dimensional: Espaço Tridimensional (Tensor 3D)

O espaço amostral de execuções híbridas é modelado como um tensor tridimensional:
1. **Eixo X (Input / Workload):** Carga computacional do problema (ex.: 200M, 400M, 800M e 1.6B iterações de Monte Carlo para estimativa de $\pi$).
2. **Eixo Y (Core / OpenMP):** Quantidade de threads OpenMP / núcleos por processo.
3. **Eixo Z (Rank / MPI):** Quantidade de processos MPI distribuídos.

### Projeções Bidimensionais (Planos de Corte)
A interface 3D permite selecionar uma camada e fatiar o volume em três planos:
* **Plano XY** (fixa o *Rank*): Varia *Cores* (vertical) vs. *Inputs* (horizontal).
* **Plano XZ** (fixa o *Core*): Varia *Ranks* (vertical) vs. *Inputs* (horizontal).
* **Plano YZ** (fixa o *Input*): Varia *Ranks* (vertical) vs. *Cores* (horizontal) — análise pura da decomposição topológica para uma carga fixa.

---

## 3. Métricas e Fórmulas Matemáticas

### Métricas Fundamentais
* **Eficiência Paralela ($E$):**
  $$E(w, p) = \frac{T_{\text{seq}}(w)}{p \cdot T_{\text{par}}(w, p)}$$
  Onde $p = \text{ranks} \times \text{cores}$ é o paralelismo efetivo total.
* **Speedup ($S$):**
  $$S(w, p) = \frac{T_{\text{seq}}(w)}{T_{\text{par}}(w, p)}$$
* **Desbalanceamento de Carga ($Imbalance$):**
  $$\text{Imbalance} = \frac{T_{\max} - T_{\text{avg}}}{T_{\max}}$$
  Calculado com base nas medições individuais de tempo por trabalhador (`process_id` e `thread_id`) registradas na instrumentação de `regions`.

### Métricas de Escalabilidade Diferencial
As métricas de escalabilidade avaliam a variação da matriz de eficiência ao longo das topologias híbridas ordenadas (*Topology view*) e das cargas de entrada:

1. **Escalabilidade Forte ($Strong$):**
   $$Strong(w, p) = E(w, p) - E(w, p_1)$$
   Compara a configuração paralela contra a referência sequencial $p_1$ (`1x1`), cuja eficiência é $100,00\%$.
2. **Escalabilidade entre Cargas ($Scalab$):**
   $$Scalab(w, p) = E(w, p) - E(w_1, p)$$
   Compara o ponto atual com a carga de trabalho inicial ($w_1$, índice 0) na mesma topologia.
3. **Escalabilidade Fraca ($Weak$):**
   $$Weak(w, p) = E(w, p) - E(w - m, p - m), \quad m = \min(w, p)$$
   Compara diagonalmente o ponto atual com o ponto de partida onde recursos e tamanho do problema cresceram conjuntamente.
4. **Variantes Relativas:**
   * $RelStrong(w, p) = E(w, p) - E(w, p - 1)$
   * $RelScalab(w, p) = E(w, p) - E(w - 1, p)$
   * $RelWeak(w, p) = E(w, p) - E(w - 1, p - 1)$

---

## 4. Principais Aprendizados Técnicos

1. **Escopo Global das Topologias Híbridas vs. Fatias 2D:**
   * **Problema:** Inicialmente, o código tentava calcular as métricas de escalabilidade buscando linhas vizinhas dentro da própria matriz da fatia 2D ativa do plano geométrico. No Plano XY com `rank = 16`, a linha base acabava sendo `core = 2` em vez da referência global `1x1`.
   * **Solução:** No modelo híbrido MPI+OpenMP, as topologias possuem uma ordenação global canônica baseada no paralelismo efetivo $p$ ($p = \text{ranks} \times \text{cores}$) e no número de ranks. Toda célula inspecionada em qualquer corte geométrico (XY, XZ ou YZ) consulta essa matriz de topologias global para derivar métricas consistentes.
2. **Resolução Exata dos Pontos de Referência:**
   * Para a configuração $(\text{RANK} = 16, \text{CORE} = 16, \text{INPUT} = 3)$:
     * Eficiência do ponto: $E = 5,52\%$.
     * **$Strong$:** $5,52\% - 100,00\% = \mathbf{-94,480\%}$.
     * **$Weak$:** $w = 3$ (índice da 4ª carga), $p = 24$ (índice da 25ª topologia, `16x16`). $m = \min(3, 24) = 3$. Base diagonal em $w - 3 = 0$ (`INPUT = 0`) e $p - 3 = 21$ (topologia `16x4`), onde $E = 5,01\%$. Portanto: $5,52\% - 5,01\% = \mathbf{+0,510\%}$.
3. **Trivialidade do Input 0 no Weak Scaling:**
   * Para a primeira coluna ($input = 0$), $w = 0 \implies m = \min(0, p) = 0$. Como a base é sempre o próprio ponto $(w - 0, p - 0) = (0, p)$, o resultado para qualquer linha é invariavelmente $0,000\%$.
   * A omissão da coluna $input = 0$ para a métrica de escalabilidade fraca melhora a clareza e foca a visualização nas colunas onde o crescimento conjunto de recursos e dados efetivamente ocorre ($input \ge 1$).

---

## 5. Histórico de Alterações Recentes

### Correção dos Cálculos de Escalabilidade e Normalização Fixa
* **`src/utils/gerarMapaCalor.ts`:**
  * Implementação da matriz global de topologias híbridas ($Topologias \times Cargas$) para cálculo de todas as métricas diferenciais.
  * Ajuste de $Strong(w, p)$ para subtrair a linha de base $1 \times 1$ ($100,00\%$).
  * Ajuste de $Weak(w, p)$ seguindo os índices de topologia global ($p - m$) e carga ($w - m$).
  * Fixação da escala térmica de intensidade de **$-100\%$ a $+100\%$**:
    * $-100\% \implies 0.0$ (azul escuro / perda máxima).
    * $0\% \implies 0.5$ (neutro).
    * $+100\% \implies 1.0$ (vermelho / ganho máximo).
  * Formatação dos valores com 3 casas decimais (`toFixed(3)`).

### Ajuste da Escala na Interface
* **`src/components/VisualizadorSecao.tsx`:**
  * Atualização da legenda do mapa de calor para fixar `rotuloMax: '+100%'` e `rotuloMin: '-100%'` nas métricas diferenciais de escalabilidade.

### Omissão do Input 0 para Escalabilidade Fraca (`weak`)
* **`src/utils/gerarMapaCalor.ts`:**
  * Filtragem automática para excluir pontos com `input === 0` quando `metrica === 'weak'` e o plano ativo indexa as cargas no eixo horizontal (`plano !== 'YZ'`).
  * Geração dos pontos da camada iniciando a partir do `input 1`.
* **`src/components/VisualizadorSecao.tsx`:**
  * Cálculo dinâmico de `colunasEfetivas` (reduzindo de 4 para 3 colunas quando `weak` está ativo), alimentando a variável CSS `--colunas` do `.mapa-calor` para evitar distorção de grade.
* **`src/components/RodapeStatus.tsx` e `src/App.tsx`:**
  * Substituição do valor estático legado (`28 × 20`) pela resolução real da seção processada (ex.: `3 × 5` para `weak`, `4 × 5` para as demais seções).

---

## 6. Comandos e Validação do Projeto

* **Instalação de Dependências:** `npm install`
* **Ambiente de Desenvolvimento:** `npm run dev`
* **Build de Produção e Validação TypeScript:** `npm run build` (`tsc -b && vite build`)
* **Linting:** `npm run lint`
