# Design Reference - Tasks

## Referencias aprovadas

- Dashboard Originais.
- LuxStudio.

## Direcao visual

- Ferramenta operacional, densa e escaneavel.
- Nada de landing page, hero ou explicacoes grandes na interface.
- Base Lumine: preto, off-white, branco, amarelo de marca e cinzas.
- Acentos funcionais para status/prioridade: azul, verde, amarelo, vermelho e roxo/pink em uso moderado.
- Sidebar fixa com hierarquia.
- Topbar compacta com busca e acoes.
- Views principais como superficies de trabalho, nao cards decorativos.
- Cards apenas quando representarem tarefas no board ou paineis/modais reais.
- Raio preferencial de 8px.
- Tipografia Satoshi, como nos outros sistemas.

## Componentes esperados

- Botoes com icones `lucide-react`.
- Toolbars compactas.
- Tabelas/listas densas.
- Pills para status/prioridade.
- Avatares/iniciais para responsaveis.
- Painel lateral para detalhe da tarefa.
- Estados mobile sem sobreposicao de texto.

## Primeira tela criada

O scaffold inicial implementa:

- Sidebar com atalhos e Spaces.
- Header com breadcrumb e busca.
- Metric strip.
- Alternancia List/Board.
- Lista de tarefas.
- Board por status.
- Painel lateral de detalhe.
- Indicador de Supabase configurado/local.

