# Plugins para o Valenced

Cada plugin tem uma pasta em `plugins/` com seu código e `manifest.json`.

| Plugin | Código-fonte |
| --- | --- |
| Platform Indicators | [plugins/platform-indicators/](plugins/platform-indicators/) |

## Instalar no Valenced

Abra **Configurações → Valenced → Plugins → ⚙️** e adicione o [endereço do catálogo](https://raw.githubusercontent.com/mydiscordstuff/plugins/main/index.json).

## Editar ou adicionar um plugin

Edite a pasta existente ou crie `plugins/nome-do-plugin/` com o manifesto e os arquivos de execução que ele declara. Para publicar uma nova versão, atualize `version` no manifesto e envie a alteração para a branch `main`.

O GitHub Actions encontra as pastas com `manifest.json`, empacota os arquivos e gera o catálogo. Os ZIPs ficam na [branch de pacotes](https://github.com/mydiscordstuff/plugins/tree/packages). O `index.json` da `main` mantém o endereço usado pelas instalações existentes.
