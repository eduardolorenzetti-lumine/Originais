# Supabase Setup - Tasks

## Projeto

- Organization: `Lumine` Free
- Project name: `lumine-tasks`
- Project ref: `kqmkqzsktmcmrehktejs`
- Region: `sa-east-1`
- Status verificado: `ACTIVE_HEALTHY`
- Database: Postgres 17
- Plano: Free
- Uso: backend do MVP web `tasks`

## Criacao do projeto

Na tela "Create a new project":

1. **GitHub optional:** deixar desconectado por enquanto.
   - Motivo: o deploy web ja acontece via GitHub/Cloudflare Pages. Migrations e schema serao versionados no repo do app quando o scaffold existir.
2. **Project name:** `lumine-tasks`.
3. **Database password:** gerar senha forte e guardar em gerenciador de senhas.
   - Nao enviar a senha em chat.
   - Nao commitar em `.env`, docs ou screenshots.
4. **Region:** escolher a regiao mais proxima dos usuarios.
   - Preferir South America/Sao Paulo se estiver disponivel.
   - Se a UI mostrar apenas grupos, escolher `Americas`.
5. **Security:**
   - `Enable Data API`: ligado.
   - `Automatically expose new tables`: desligado.
   - `Enable automatic RLS`: ligado.

## Justificativa de seguranca

- O app web usara `supabase-js`, entao a Data API precisa ficar habilitada.
- Novas tabelas nao devem ser expostas automaticamente para roles da API; grants e policies devem ser aplicados explicitamente nas migrations.
- RLS deve estar habilitado em todas as tabelas expostas. Sem policies, os dados ficam inacessiveis via publishable/anon key, que e o comportamento seguro inicial.

## Depois que o projeto for criado

Coletar no dashboard:

- Project URL.
- Publishable key ou anon public key.
- Project reference ID: `kqmkqzsktmcmrehktejs`.

Verificacao Codex:

- Projeto listado com sucesso pelo conector Supabase.
- Migrations: nenhuma.
- Edge Functions: nenhuma.
- Extensoes instaladas relevantes por padrao: `pgcrypto`, `pg_stat_statements`, `uuid-ossp`, `supabase_vault`, `plpgsql`.

Nao coletar nem compartilhar:

- Service role key.
- Database password.
- JWT secret.
- Connection string completa com senha.

## Configuracao futura no app

Quando o scaffold existir:

- Criar `.env.example` com nomes de variaveis, sem valores reais.
- Criar `.env.local` localmente com Project URL e publishable/anon key.
- Garantir que `.env.local` esteja no `.gitignore`.
- Testar localmente antes de qualquer commit/push.
