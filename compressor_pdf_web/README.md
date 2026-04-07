# Compressor de PDF (HTML, CSS e JS puro)

Projeto 100% front-end, sem Python:

- 1 PDF enviado -> baixa 1 PDF comprimido.
- 2+ PDFs enviados -> baixa 1 ZIP com todos os PDFs comprimidos.
- Faz varias tentativas de compressao automaticamente para tentar atingir o limite (padrao 60MB).

## Arquivos

- `index.html`
- `styles.css`
- `app.js`

## Como usar

1. Abra `index.html` no navegador.
2. Selecione um ou varios PDFs.
3. Defina o limite em MB (padrao `60`).
4. Escolha o perfil de qualidade:
   - `Melhor qualidade`: prioriza nitidez e so reduz mais se necessario.
   - `Balanceado`: equilibrio entre qualidade e tamanho.
   - `Maior compressao`: foca em reduzir tamanho.
5. Clique em **Comprimir agora**.

## Tecnologias usadas

- PDF.js (leitura/renderizacao de PDF)
- jsPDF (recriacao do PDF comprimido)
- JSZip (geracao de ZIP quando houver varios arquivos)

As bibliotecas sao carregadas por CDN no proprio `index.html`.
