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

### [2026-06-09] — BUG_FIX + DB_SCHEMA
**O que foi feito:** Corrigida a impossibilidade de **excluir etapas** (timeline e dialog do projeto).
**Causa-raiz:** Não era o frontend — eram os triggers de proteção. O `protect_projects_before_save` (BEFORE) mantinha o array de `stages` "mais completo" (`CASE WHEN qtd_no_banco > qtd_entrante THEN proj.stages`), então toda exclusão (estado com menos etapas) era **revertida**. O `sync_projects_after_save` (AFTER) também preservava o array mais longo no espelho.
**Correção:** Ambos os triggers passam a **respeitar o array de stages do estado entrante** (frontend como fonte de verdade para etapas). Mantidas as proteções críticas: `spent` nunca reduz (`GREATEST`) e projetos que somem do estado são re-injetados a partir da tabela espelho.
**Verificação:** Removida 1 etapa do 02-00 (4→3) e confirmado que persistiu (não reverteu); restaurado para 4.
**Impacto:** Exclusão de etapas volta a funcionar. Proteção de gastos e de projetos intacta.
**Feito por:** Claude (Opus 4.8)

---

### [2026-06-03] ~18h30 — BUG_FIX + REFACTOR + DB_SCHEMA (Auditoria do sistema de usuários)
**Contexto:** Não era possível cadastrar/entrar com novos usuários. Aline e Jordana foram ativadas com senha provisória, não entraram (Aline: "não cadastrado"; Jordana: voltava ao login), foram excluídas e recriadas — e continuaram sem acesso.

**Diagnóstico (3 fontes de verdade dessincronizadas):** `auth.users` (login/senha), `app_users` (nome/role/ativo) e `app_state.users` (JSON legado, vazio em prod). Causas-raiz:
1. **Exclusão incompleta:** `deleteSecureUserFromSupabase` apagava só de `app_users`, nunca de `auth.users`. A recriação em modo convite caía em `422 já registrado` e a Edge Function tratava como "sucesso" silencioso, sem enviar e-mail. (Confirmado nos logs de auth: POST /invite → 422 para ambas às 17:49.)
2. **Bloqueio falso no login:** o pré-check de "e-mail cadastrado" lia uma lista de `app_users` em cache desatualizado → falso "não cadastrado".
3. **Autorização frouxa:** `currentSecureUser?.active !== false` dava `true` para usuário ausente de `app_users` (`undefined !== false`) → entrava em estado quebrado.
4. **RLS furada:** `app_users` tinha políticas `USING(true)` (além das corretas `*_admin`/`_self`), permitindo que qualquer autenticado editasse a tabela e **se promovesse a ADMIN**.

**Correções aplicadas:**
- **Desbloqueio imediato:** redefinida senha de `aline.santos` (`Aline@2026`) e `jordana.bastos` (`Jordana@2026`) via bcrypt em `auth.users`; login validado (HTTP 200).
- **Frontend** (`script.js`): senha provisória obrigatória para novo usuário (removido o toggle/▶ convite quebrado); login revalida e-mails autorizados ao vivo a cada tentativa; lógica de autorização exige registro ativo em `app_users` (cache só como fallback de rede); exclusão passa a chamar a Edge Function (exclusão completa).
- **Edge Function `set-user-password` v5:** adicionado `action: "delete"` (service role) que remove de `auth.users` E `app_users`, com proteção contra auto-exclusão.
- **RLS:** removidas as 4 políticas `USING(true)` de `app_users`. Restam apenas `*_admin` (escrita só ADMIN) e `*_self` (usuário lê/edita o próprio registro, sem poder mudar role/ativo). Fecha a escalada de privilégio.
- **Constraint `app_users_role_check`:** só aceitava `ADMIN`/`EDITOR`/`LEITOR` — então o papel **`EDITOR ROTA`** (oferecido pelo frontend) **nunca pôde ser salvo** em produção. Constraint recriada incluindo `EDITOR ROTA`.
- Edge Function `temp-reset-admin` já estava neutralizada (retorna 410).

**Modelo de onboarding definido:** senha provisória (admin define e compartilha; usuário troca depois em "Esqueci minha senha" / perfil).

**Usuários reconciliados (auth.users ↔ app_users, todos ativos com login e senha):** eduardo.lorenzetti (ADMIN), gustavo.leite (ADMIN), aline.santos (EDITOR), jordana.bastos (EDITOR), mariana.lopez (EDITOR ROTA — órfã resolvida, senha `Mariana@2026`), lautierre.souza (LEITOR).

**Pendência restante:** revisão do cache local (localStorage/IndexedDB) que causa relatos de "dados diferentes" — tema separado, não tratado nesta auditoria.

**Feito por:** Claude (Opus 4.8), com aprovação do usuário

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

---

### [2026-05-21] ~22h36 — BUG_FIX
**O que foi feito:** Ajustado o visual da tela de login com redução da altura do logo para `16px` e atualização do texto do botão principal para `ENTRAR` em caixa alta.
**Motivo / Contexto:** Refino visual solicitado pelo usuário para a tela inicial de autenticação.
**Impacto:** Tela de login fica mais alinhada ao padrão visual esperado sem alterar a lógica de autenticação.
**Feito por:** Codex

---

### [2026-05-21] ~17h30 — REFACTOR
**O que foi feito:** Migração visual para o novo design system Lumine (branch `redesign`) — Fases 1–3.
**Mudanças:**
- Adicionado `dashboard/lumine-design-system.css` (2474 linhas — design system completo: Satoshi font, tokens `--yellow`/`--black`/`--off-white`, componentes Nav, Chip, Stat Card, Table, Gantt, Modal, etc.)
- `index.html`: importa `lumine-design-system.css` antes de `styles.css`; app shell reestruturado de sidebar vertical para navbar horizontal (`.nav` + `.nav-links` + `.nav-right`); avatar circular (`.nav-avatar`) com iniciais do usuário
- `styles.css`: modo claro como padrão (`:root` = light, dark apenas sob `[data-theme="dark"]`); body usa `--off-white` + fonte Satoshi; `.page` substitui `.content`; tokens de cor migrados para o design system
- `script.js`: `applyAuthVisibility()` injeta iniciais do usuário no avatar da navbar
**Branch:** `redesign` (isolado de `main` — seguro para testes sem afetar produção)
**Feito por:** Claude

---

### [2026-05-21] ~19h00 — REFACTOR
**O que foi feito:** Migração visual para o novo design system Lumine — Fases 4–7.

**Fase 4 — Tabela de Projetos (`script.js` + `styles.css`):**
- `inlineSelect()`: classe `cell-inline-select` substituída por `isel` + `isel-nil` (pill arredondado do design system). Cores dinâmicas via `getConfigItemColor` continuam aplicadas inline — `isel` fornece apenas o shape.
- Botões de ação na tabela: `btn.icon-btn` → `act-btn` (editar) / `act-btn.danger` (excluir), agrupados em `.act-group`.
- Adicionado `.act-btn svg` e `.isel` com chevron SVG no `styles.css`.

**Fase 5 — Barras do Gantt (`styles.css`):**
- `.stage-bar` atualizado com tokens do design system: `var(--r-xs)`, `font-size: 10px`, `font-weight: 600`, `color: var(--black)`.
- Adicionado `transition: filter` + `hover: brightness(0.93)` (padrão `.gantt-bar` do design system).

**Fase 6 — Tabela Rota (`script.js` + `styles.css`):**
- `routeInlineSelect()` migrado para `.isel` / `.isel-nil` (mesmo padrão da tabela de projetos).
- Overrides `.route-table-wrap` estendidos para cobrir `.isel`.

**Fase 7 — Tela de Login e Loading Screen (`styles.css`):**
- Tokens antigos (`var(--accent-ink)`, `var(--muted)`, `var(--line)`, `var(--accent)`) substituídos por `var(--mid)`, `var(--pale)`, `var(--yellow)`.
- Spinner agora usa `border-top-color: var(--yellow)`.

**Feito por:** Claude

---

### [2026-05-22] ~00h30 — FEATURE + REFACTOR
**O que foi feito:** Reformulação completa do Dashboard — tabs de visualização, novos gráficos e seção financeira.

**Tabs de visualização:**
- Chips "Ambos/Produções/Rota" substituídos por botões tab estilizados (underline amarelo no ativo)
- Rótulos: **TODOS | PRODUÇÕES | ROTA** (era "Ambos")
- Filtros de ano/painel ocultados automaticamente na aba Rota

**Gráficos reformulados:**
- **Tempo Médio por Etapa**: substituiu gráfico de barras horizontais por tabela visual com dot colorido por etapa, barra proporcional e valor em meses
- **Por Status / Categoria / Formato / Natureza / Duração**: migrados de barras verticais para barras horizontais com cores dinâmicas dos settings. Labels exibem texto completo (180px)

**Nova seção:**
- **Maiores Investimentos**: lista top 10 projetos por valor total investido, com numeração destacada (ouro/prata/bronze), barra proporcional, divisão Produção × Equipe quando disponível, e valor à direita

**Commits:** `f7e0038`, `6de77cc` (branch `dudu-claude/brave-mclean-c76de8`)
**Feito por:** Claude

---

## Estado Atual do Sistema (2026-05-22)

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
