# Sistema de Repetição Espaçada (SRS) por frase

Vou ampliar `src/app/components/PhraseRepetition.tsx` para incluir os 4 pilares que você descreveu.

## 1. UI por frase
- **Avatar do speaker** (emoji ou inicial colorida por speaker) ao lado da frase.
- **Check verde "Aprendida"** quando a frase atingir maturidade (5 acertos consecutivos) ou for marcada manualmente.
- **Badge de dificuldade**: 🟢 Fácil / 🟡 Médio / 🔴 Difícil, calculado automaticamente.
- **Botão "Modo de repetição"** com 3 níveis por frase:
  - Nível 1 – Reconhecimento (escolher entre 3 opções com lacuna)
  - Nível 2 – Escrita (digitar após ouvir)
  - Nível 3 – Produção ativa (responder a um prompt da IA)

## 2. Classificação automática de dificuldade
Função `classifyDifficulty(text)` em novo arquivo `src/app/utils/srs.ts`:
- comprimento em palavras (1-4 / 5-8 / 9+)
- detecção de padrões gramaticais (`would have`, `had + pp`, `if … would` → difícil; `will`, `-ed` → médio; default → fácil)
- heurística simples de vocabulário (lista Top-500 embarcada para fácil)
- retorna `'easy' | 'medium' | 'hard'`

## 3. SRS com intervalos por nível
Tabela em `srs.ts`:
```
easy:   [4h, 1d, 3d, 7d, 14d]   erro → 4h
medium: [2h, 12h, 2d, 5d, 10d]  erro → 2h
hard:   [1h, 6h, 1d, 3d, 7d]    erro → 1h + dica
```
- 5 acertos consecutivos → intervalo mensal (30d) e marca como "aprendida".
- Ajuste adaptativo: 3 erros → desce de nível; 5 acertos → sobe.

## 4. Persistência
Estado SRS por frase salvo em `localStorage` sob `srs_state_v1`:
```ts
type PhraseState = {
  id: string;            // hash do texto
  level: 'easy'|'medium'|'hard';
  history: boolean[];    // últimos resultados
  consecutiveHits: number;
  nextReview: number;    // timestamp
  learned: boolean;
};
```
Hook `useSrs()` expõe `getDue()`, `record(id, correct)`, `markLearned(id)`.

## 5. Integração com avaliação existente
Quando `evaluatePronunciation` retornar score ≥ 70 → `record(id, true)`, senão `record(id, false)`. O próximo `phrases` da fila é ordenado por `nextReview` ascendente; já-aprendidas vão para o final.

## Arquivos a alterar/criar
- novo: `src/app/utils/srs.ts` (classificação + agendamento + storage)
- editar: `src/app/components/PhraseRepetition.tsx` (UI: avatar, check, badge, 3 modos, integração SRS)

Sem mudanças de banco — tudo client-side em localStorage.
