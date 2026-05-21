# SYSTEM LOG — Originais Dashboard

> Arquivo interno de registro de alterações. Não é servido aos usuários.
> Destinado ao uso por agentes de IA (Claude, Codex) para rastrear o histórico do sistema antes de implementar novas melhorias.

---

## Formato de entrada

```
### [DATA] [HORA] — [CATEGORIA]
**O que foi feito:** ...
**Motivo / Contexto:** ...
**Impacto:** ...
**Feito por:** ...
```

Categorias: `BUG_FIX` | `DATA_RECOVERY` | `FEATURE` | `DB_SCHEMA` | `DATA_CORRECTION` | `REFACTOR`

---

## Registro de Alterações

---

### [2026-05-19] ~14h00 — BUG_FIX
**O que foi feito:** Identificado e diagnosticado bug de perda de dados no `mergeLocalAndRemoteState`.
**Motivo / Contexto:** A função havia sido alterada para sempre preferir o estado remoto (Supabase) sobre o local (localStorage). Isso fez com que ~R$430.000 em valores de `spent` gravados localmente fossem descartados ao sincronizar.
**Impacto:** O total de gasto caiu de R$1.315.739 para R$886.000. Nenhum dado foi permanentemente perdido — ainda estava no Chrome localStorage.
**Feito por:** Claude (diagnóstico)

---

### [2026-05-19] ~15h00 — DATA_RECOVERY
**O que foi feito:** Recuperação de dados do Chrome localStorage (Profile 4, origin `https://originais-dashboard.lorenzettidudu.workers.dev` — endereço antigo de deploy; URL atual: `https://originais.lumine.tv/dashboard/`) via leitura direta do LevelDB com Python 3.9 + pacote `leveldb`.
**Motivo / Contexto:** O Chrome mantinha lock no LevelDB. Solução: copiar o diretório para `/tmp/chrome_ls_copy/` e remover o arquivo `LOCK`. Dados estavam em UTF-16LE com prefixo de 1 byte.
**Impacto:** Recuperados 98 projetos com total de R$1.315.739,09 — o estado mais completo encontrado.
**Feito por:** Claude

---

### [2026-05-19] ~15h30 — DATA_RECOVERY
**O que foi feito:** Restaurados 22 valores de `spent` de projetos no Supabase (`app_state`, row `originais-main`) a partir do backup recuperado.
**Motivo / Contexto:** Esses projetos tinham `spent > 0` no localStorage mas `spent = 0` no Supabase por nunca terem sincronizado completamente.
**Impacto:** Total recuperado de R$886K → R$1.397.187,90.
**Feito por:** Claude

---

### [2026-05-19] ~16h00 — DATA_RECOVERY
**O que foi feito:** Adicionados 8 projetos ausentes no Supabase: SKUs 02-92 a 02-99 e ECCE HOMO (id: `vrjpgf02`, code: `02-67`).
**Motivo / Contexto:** Projetos haviam sido criados no frontend mas nunca sincronizados ao Supabase.
**Impacto:** Total de projetos: 95 → 103.
**Feito por:** Claude

---

### [2026-05-19] ~16h30 — DATA_RECOVERY
**O que foi feito:** Restaurados dados de `stages` (etapas de produção) de 39 projetos via UPDATE com CASE no JSONB do `app_state`.
**Motivo / Contexto:** As etapas estavam no backup do localStorage mas haviam sido sobrescritas por arrays vazios no Supabase.
**Impacto:** 52 projetos passaram a ter stages completos (anteriormente a maioria tinha `[]`).
**Feito por:** Claude

---

### [2026-05-19] ~17h00 — DB_SCHEMA
**O que foi feito:** Criada tabela `projects` no Supabase como espelho normalizado do JSONB `app_state.state.projects`.

```sql
CREATE TABLE projects (
  id        TEXT PRIMARY KEY,
  code      TEXT,
  title     TEXT,
  spent     NUMERIC DEFAULT 0,
  budget    NUMERIC,
  stages    JSONB DEFAULT '[]'::jsonb,
  data      JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX projects_code_idx ON projects(code);
```

**Motivo / Contexto:** Criar backup estruturado e consultável dos projetos, separado do blob JSONB.
**Impacto:** Dados de projetos agora disponíveis via SQL direto, sem precisar desempacotar JSONB.
**Feito por:** Claude

---

### [2026-05-19] ~17h15 — FEATURE
**O que foi feito:** Criado AFTER trigger `sync_projects_after_save_trigger` na tabela `app_state`.
**Motivo / Contexto:** Sincroniza automaticamente `app_state` → `projects` a cada save. Usa `GREATEST` para nunca reduzir `spent` e mantém o array de stages mais completo.
**Impacto:** A tabela `projects` se mantém atualizada automaticamente sem nenhuma mudança no frontend.
**Feito por:** Claude

---

### [2026-05-19] ~17h30 — FEATURE
**O que foi feito:** Criado BEFORE trigger `protect_projects_before_save_trigger` na tabela `app_state`.
**Motivo / Contexto:** Proteção contra perda de dados: intercepta todo write no `app_state` e (a) eleva qualquer `spent` que foi reduzido vs. o que está na tabela `projects`, (b) re-injeta qualquer projeto que desapareceu do estado incoming. Funciona 100% no backend — nenhuma mudança no frontend necessária.
**Impacto:** Elimina o risco de perda de dados por regressão de merge ou bug no frontend.
**Feito por:** Claude

---

### [2026-05-20] ~10h00 — DATA_CORRECTION
**O que foi feito:** Comparação sistemática entre a planilha de controle financeiro (Google Sheets — Coluna F: Total) e os valores de `spent` no Supabase para todos os projetos.
**Motivo / Contexto:** O usuário forneceu a planilha como fonte de verdade para os gastos registrados.
**Impacto:** Identificadas 17 divergências (10 ausentes, 5 errados, 2 para verificação).
**Feito por:** Claude

---

### [2026-05-20] ~10h15 — DATA_CORRECTION
**O que foi feito:** Atualizados 10 projetos com `spent = 0` no sistema para os valores corretos da planilha (Coluna F).

| SKU   | Título                                      | Valor aplicado   |
|-------|---------------------------------------------|-----------------|
| 02-05 | Mãezinha do Céu                             | R$1.300,00      |
| 02-17 | Na Mesa com os Santos: Banquete de Natal    | R$1.006,89      |
| 02-18 | Um Santo Entre Nós (Betafilms)              | R$4.795,74      |
| 02-22 | Clube do Livro                              | R$2.276,60      |
| 02-23 | Histórias dos Papas                         | R$863,14        |
| 02-25 | Masterclass Josias                          | R$6.684,58      |
| 02-27 | After the Third Day                         | R$3.964,66      |
| 02-60 | Cartas Sonoras                              | R$39.537,28     |
| 02-66 | Pequenos Evangelhos                         | R$1.000,00      |
| 02-67 | O Encontro (extras)                         | R$81.343,94     |

**Feito por:** Claude (com aprovação do usuário)

---

### [2026-05-20] ~10h20 — DATA_CORRECTION
**O que foi feito:** Corrigidos 5 projetos com valores divergentes da planilha.

| SKU   | Título                    | Antes         | Depois          | Obs.                              |
|-------|---------------------------|---------------|-----------------|-----------------------------------|
| 02-01 | Instantes Decisivos       | R$6.897,00    | R$6.897,50      | Diferença de R$0,50               |
| 02-61 | Cidade Amarela III        | R$5.456,00    | R$5.456,70      | Diferença de R$0,70               |
| 02-68 | Santo Agostinho           | R$14.625,00   | R$14.635,00     | Diferença de R$10,00              |
| 02-71 | Filho de Deus, Menino Meu | R$105,50      | R$105.496,14    | ERRO GRAVE: separador decimal errado (ponto × vírgula) |
| 02-76 | A Memória da Água         | R$57.374,23   | R$165.830,23    | Custo de equipe (R$108.456) não estava somado |

**Feito por:** Claude (com aprovação do usuário)

---

### [2026-05-20] ~10h30 — DATA_CORRECTION
**O que foi feito:** Removido projeto duplicado "O Encontro : Conversas que transformam (extras)" (id: `69a0a3c666ffdad52096ba00`, code: `02-67`).
**Motivo / Contexto:** Era uma entrada duplicada que representava o mesmo projeto que o ECCE HOMO. Foi deletado do `app_state` e da tabela `projects` para evitar duplicação no total.
**Nota:** O projeto ECCE HOMO (id: `vrjpgf02`) mantém o code `02-67` por design — faz parte da obra O Encontro mas também foi lançado como curta-metragem independente. Dois projetos com mesmo SKU é intencional e suportado pelo sistema (ID único é o campo `id`, não `code`).
**Impacto:** Total: 103 → 102 projetos.
**Feito por:** Claude (com aprovação do usuário)

---

### [2026-05-20] ~14h00 — FEATURE
**O que foi feito:** Split do campo de gasto em dois campos separados: `spentProduction` (Custo de Produção) e `spentTeam` (Cachê de Equipe). Campo `spent`/`budget` mantido como total (soma dos dois) para retrocompatibilidade.
**Mudanças no frontend:**
- `index.html`: Substituído campo único `Gasto (R$)` (#projectBudget) por `Custo de Produção` (#projectSpentProduction) + `Cachê de Equipe` (#projectSpentTeam) + display read-only `Investimento Total` (#projectSpentTotal) com auto-cálculo.
- `script.js`: Dashboard expandido para 5 cards (Produções | Investimento Total | Custo de Produção | Cachê de Equipe | Média por Produção). Funções atualizadas: `renderDashboard`, `getDashboardSpentCollections`, `summaryIconHtml`, `openProjectDialog`, `collectProjectForm`. Nova função `updateProjectSpentTotal()`.
- `styles.css`: Grid de 5 colunas, cores `metric-icon-green` e `metric-icon-purple` adicionadas, `.spent-total-display` para o campo calculado.
**Mudanças no Supabase:** `spentProduction` e `spentTeam` adicionados a todos os 102 projetos. 3 projetos com split real conhecido: 02-24 (3.079,21 / 3.000,00), 02-60 (0 / 39.537,28), 02-76 (57.374,23 / 108.456,00).
**Feito por:** Claude (com aprovação do usuário)

---

### [2026-05-20] ~17h00 — DATA_RECOVERY
**O que foi feito:** Restaurada etapa "CÂMERA ABERTA" (id: `3tupo4c9`) no `settings.stages` do Supabase.
**Motivo / Contexto:** A etapa havia sido removida do array de settings (provavelmente por conflito de cache local), mas 5 projetos ainda referenciavam seu ID: After the third day (02-27), Brasil de Todos os Santos 03 (02-87), Cidade Amarela IV (02-94), O Último Sacrifício (02-95) e Fé Asiática (02-96). Na timeline, clicar nesses blocos abria a etapa errada (Development).
**Impacto:** Etapa reinserida entre PRÉ-PRODUÇÃO e PRODUÇÃO com cor `#22c55e`. Todas as referências existentes voltaram a funcionar.
**Feito por:** Claude

---

### [2026-05-20] ~17h15 — FEATURE
**O que foi feito:** Adicionado filtro de Etapas no painel de filtros da aba Cronograma (Timeline/Gantt).
**Motivo / Contexto:** Usuário queria filtrar quais etapas são exibidas na timeline. O filtro controla visibilidade dos blocos de etapa — projetos continuam visíveis mas apenas as etapas selecionadas são renderizadas.
**Impacto:** Chips de etapa aparecem como primeiro filtro no painel. Por padrão (nenhuma seleção) todas as etapas são exibidas.
**Feito por:** Claude

---

### [2026-05-21] ~10h00 — FEATURE + BUG_FIX
**O que foi feito:** Múltiplos ajustes de segurança, roles e funcionalidades da aba Rota.

**Segurança / Auth:**
- Botão "Primeiro acesso" removido da tela de login (impede cadastro não autorizado via `client.auth.signUp`)
- Login agora distingue "E-mail não cadastrado" de "Senha incorreta"
- Fluxo de convite migrado de magic link → Edge Function `set-user-password` (senha provisória definida pelo admin)

**Novo role EDITOR ROTA:**
- Permissão de leitura geral + edição exclusiva da aba Rota
- `canEditRoute()` criada: cobre ADMIN, EDITOR e EDITOR ROTA
- Todas as listas de validação de role atualizadas para incluir "EDITOR ROTA"

**Convite de usuário:**
- Campo "Senha provisória" adicionado ao dialog de convite (admin define, sistema aplica via Edge Function)
- Alert exibe credenciais provisórias para o admin repassar ao convidado

**Rota:**
- Clicar no nome do festival/prêmio na listagem abre o dialog de edição
- Ícone SVG antes do nome distingue FESTIVAL (calendário) de PRÊMIO (estrela)
- Novo campo TIPO: seletor FESTIVAL / PRÊMIO no modal de cadastro
- Novo campo VALOR DE INSCRIÇÃO (R$) no modal de cadastro

**Feito por:** Claude

---

### [2026-05-21] ~14h03 — BUG_FIX + REFACTOR
**O que foi feito:** Limpeza do fluxo legado de "Primeiro acesso" no frontend do dashboard e unificação do cadastro de usuários com senha provisória no modal principal `Cadastrar Usuário`.
**Motivo / Contexto:** O campo `Senha provisória` havia sido implementado apenas em um modal secundário de convite que não estava mais exposto na interface, enquanto o fluxo principal de cadastro continuava exibindo campos genéricos de senha. Além disso, o usuário remoto não era forçado de forma consistente a trocar a senha provisória no primeiro login.
**Impacto:** O modal principal de cadastro agora exibe `Senha provisória` para novos usuários e `Nova senha provisória` ao redefinir acesso de terceiros. Novos usuários remotos passam a exigir senha provisória no cadastro, a listagem de usuários mostra o estado `Provisória`/`Definida`, e o primeiro login com senha provisória obriga a criação imediata de uma nova senha antes de liberar o acesso. Também foram removidos do código o modal antigo de convite e funções mortas relacionadas a magic link / primeiro acesso legado.
**Feito por:** Codex

---

## Estado Atual do Sistema (2026-05-21)

| Métrica                  | Valor              |
|--------------------------|--------------------|
| Total de projetos        | 102                |
| Total gasto registrado   | R$1.714.099,29     |
| Projetos com stages      | 52                 |
| Supabase project ID      | `ypjowxlkmrohaisopzas` (originais-prod) |
| App state row            | `app_state` WHERE id = `originais-main` |
| Tabela espelho           | `projects` (com triggers BEFORE/AFTER) |

## Arquitetura de Proteção de Dados (implementada 2026-05-19)

```
Frontend save
     │
     ▼
BEFORE trigger (protect_projects_before_save)
  • Eleva spent para GREATEST(incoming, stored)
  • Re-injeta projetos ausentes da tabela projects
     │
     ▼
app_state atualizado
     │
     ▼
AFTER trigger (sync_projects_after_save)
  • Sincroniza app_state → tabela projects
  • Upsert por id, nunca reduz spent
```
