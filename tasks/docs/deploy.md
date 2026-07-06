# Deploy - Tasks

## Regra operacional

- Testar sempre localmente antes de publicar.
- Nao fazer commit, push ou deploy sem pedido explicito do usuario.

## Cloudflare Pages

Deploy confirmado via GitHub. O app e uma SPA estatica publicada em:

- `https://originais.lumine.tv/tasks`

Configuracao esperada:

- Build command: `npm run build`
- Output directory: `dist`
- App build output: `dist/tasks`

O script de build gera:

- `dist/tasks/index.html`
- `dist/tasks/assets/*`
- `dist/_redirects`
- `dist/_headers`

## Roteamento

O arquivo `_redirects` gerado pelo build contem:

```txt
/tasks /tasks/index.html 200
/tasks/* /tasks/index.html 200
```

Isso permite URLs limpas dentro da SPA em `/tasks`.

## Ambiente

Variaveis do frontend:

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Nunca commitar `.env.local`, database password, service role key ou connection string com senha.

