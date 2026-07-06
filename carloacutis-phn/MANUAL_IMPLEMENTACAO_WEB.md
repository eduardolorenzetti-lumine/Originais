# Carlo Infinite Play - Manual de Implementacao Web

Esta pasta ja contem tudo que precisa ser enviado para o servidor.

## O que subir

Suba a pasta `CarloInfinitePlay Web` inteira, mantendo esta estrutura:

```text
CarloInfinitePlay Web/
  index.html
  configuracao.js
  assets_web/
  src/
```

Importante: nao mova nem renomeie `assets_web` e `src`.

## Como inserir em uma pagina do site

Recomendamos hospedar esta pasta em uma URL propria, por exemplo:

```text
https://seudominio.com/carlo-infinite-play/
```

Depois, inserir o jogo em uma pagina existente usando iframe:

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

## Configuracao do ranking

O ranking Top 10 e salvo no navegador do jogador usando `localStorage`.

Isso significa:

- O ranking permanece salvo se o jogador fechar e reabrir o navegador.
- O ranking e local daquele navegador/dispositivo.
- Esta versao nao envia placares para um servidor.

Se quiser separar rankings entre campanhas ou paginas diferentes, edite:

```text
configuracao.js
```

E troque `scoreboardKey`:

```js
window.CARLO_INFINITE_PLAY_CONFIG = {
  scoreboardKey: "carlo-infinite-play-scoreboard-v1",
};
```

Exemplo:

```js
window.CARLO_INFINITE_PLAY_CONFIG = {
  scoreboardKey: "carlo-infinite-play-campanha-julho",
};
```

## Reset do ranking

Na tela de Press Start:

```text
Mac: Cmd + Shift + S
Windows/Linux: Ctrl + Shift + S
```

Esse comando apaga o ranking salvo naquele navegador.

## Requisitos tecnicos

- Servir por HTTP/HTTPS. Nao usar `file://`.
- Servir arquivos `.js` como JavaScript modules.
- Servir `.png`, `.svg` e `.mp3` com MIME types corretos.
- A build usa Phaser via CDN:

```text
https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js
```

Se o servidor bloquear CDNs externos, baixar esse arquivo e ajustar o script do Phaser em `index.html` para uma copia local.

## Teste rapido depois de subir

1. Abra a URL hospedada.
2. Confirme que a tela inicial aparece.
3. Aperte Start e avance ate o gameplay.
4. Confirme que o contador de distancia aparece no canto superior direito.
5. Colida com um obstaculo e confirme a tela de Game Over.
6. Se entrar no Top 10, digite um nome e pressione Enter.
7. Recarregue a pagina e confirme que o ranking continua salvo no mesmo navegador.
