# Carlo Infinite Play - Implementacao Web

Esta pasta contem a versao web completa do jogo Carlo Infinite Play.

## Arquivos que devem ser enviados ao servidor

Envie a pasta `WebInfinityPlay` inteira para o servidor, mantendo esta estrutura:

```text
WebInfinityPlay/
  index.html
  configuracao.js
  assets/
  src/
```

Nao renomeie nem mova as pastas `assets` e `src`, pois o jogo usa caminhos relativos.

## Forma recomendada de implementar em uma pagina ja existente

Hospede a pasta `WebInfinityPlay` em uma URL propria, por exemplo:

```text
https://seudominio.com/carlo-infinite-play/
```

Depois, insira o jogo na pagina usando um `iframe`:

```html
<iframe
  src="https://seudominio.com/carlo-infinite-play/"
  title="Carlo Infinite Play"
  width="100%"
  height="900"
  style="border: 0; max-width: 1100px; display: block; margin: 0 auto;"
  allow="autoplay; fullscreen"
></iframe>
```

O jogo e responsivo e se ajusta ao espaco disponivel.

## Configuracao do ranking

O ranking Top 10 fica salvo no navegador do jogador usando `localStorage`. Isso significa que:

- O ranking permanece salvo mesmo se o jogador fechar e reabrir o navegador.
- O ranking e local ao navegador/dispositivo usado.
- Esta build nao envia placares para servidor.

Se quiser publicar mais de uma instancia do jogo e manter rankings separados, altere o arquivo:

```text
configuracao.js
```

Troque o valor de `scoreboardKey`:

```js
window.CARLO_INFINITE_PLAY_CONFIG = {
  scoreboardKey: "carlo-infinite-play-scoreboard-v1",
};
```

Exemplo:

```js
window.CARLO_INFINITE_PLAY_CONFIG = {
  scoreboardKey: "carlo-infinite-play-campanha-maio",
};
```

## Reset do ranking

Na tela de Press Start, use:

```text
Mac: Cmd + Shift + S
Windows/Linux: Ctrl + Shift + S
```

Esse comando apaga o ranking salvo naquele navegador.

## Requisitos tecnicos

- A pasta deve ser servida por HTTP/HTTPS. Nao recomendamos abrir direto via `file://`.
- O jogo usa JavaScript modules, entao o servidor precisa servir arquivos `.js` corretamente.
- A versao atual carrega Phaser via CDN:

```text
https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js
```

Se o ambiente de producao bloquear CDNs externos, a equipe tecnica deve baixar esse arquivo e ajustar o `index.html` para apontar para uma copia local.

## Teste rapido apos subir

1. Abra a URL onde a pasta foi hospedada.
2. Confirme que a tela inicial aparece.
3. Inicie o jogo e confirme que o contador de distancia aparece no canto superior direito.
4. Colida com um obstaculo para abrir a tela de Game Over.
5. Se a distancia entrar no Top 10, digite um nome e pressione Enter para salvar.
6. Reabra a pagina e confirme que o ranking permanece salvo no mesmo navegador.
