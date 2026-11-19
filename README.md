# Plugins para o Valenced

Cada plugin tem uma pasta em `plugins/` com seu código e `manifest.json`.

| Plugin | Código-fonte |
| --- | --- |
| Platform Indicators | [plugins/platform-indicators/](plugins/platform-indicators/) |
| UserRadar (Android) | [plugins/user-radar/](plugins/user-radar/) |
| PinDMs | [plugins/pin-dms/](plugins/pin-dms/) |

## Instalar no Valenced

Abra **Configurações → Valenced → Plugins → ⚙️** e adicione o [endereço do catálogo](https://raw.githubusercontent.com/mydiscordstuff/plugins/main/index.json).

## Editar ou adicionar um plugin

Edite a pasta existente ou crie `plugins/nome-do-plugin/` com o manifesto e os arquivos de execução que ele declara. Para publicar uma nova versão, atualize `version` no manifesto e envie a alteração para a branch `main`.

O GitHub Actions encontra as pastas com `manifest.json`, empacota os arquivos e gera o catálogo. Os ZIPs ficam na [branch de pacotes](https://github.com/mydiscordstuff/plugins/tree/packages). O `index.json` da `main` mantém o endereço usado pelas instalações existentes.

## UserRadar no Android

Abra **Configurações → Valenced → UserRadar**, adicione o ID de uma pessoa e toque em **Enviar notificação de teste**. Em **Notificações do Android**, você pode permitir alertas e ajustar o som do canal UserRadar. A lista e o histórico são locais e separados por conta. Os alertas dependem dos eventos que chegam à sessão do Discord, inclusive em segundo plano. Com o app encerrado ou a conexão suspensa, o plugin não recebe eventos.

Adaptação independente inspirada no [UserRadar para Vencord, de k1ng0p](https://github.com/k1ng0p/UserRadar).

## PinDMs no celular

Abra **Configurações → Valenced → PinDMs → Criar categoria** para escolher o nome e a cor. Em **Conversas**, selecione uma DM individual ou em grupo para movê-la. Você também pode salvar um apelido e uma cor só para a sua lista. Na aba de mensagens, toque no título de uma categoria para recolher ou expandir. Cada conta salva sua organização no aparelho.

Implementação mobile independente inspirada no [PinDMs do Vencord](https://vencord.dev/plugins/PinDMs).
