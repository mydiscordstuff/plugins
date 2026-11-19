# Plugins para o Valenced

Cada plugin tem uma pasta em `plugins/` com seu código e `manifest.json`.

| Plugin | Código-fonte |
| --- | --- |
| AMOLED RGB | [plugins/amoled-rgb/](plugins/amoled-rgb/) |
| Platform Indicators | [plugins/platform-indicators/](plugins/platform-indicators/) |
| UserRadar (Android) | [plugins/user-radar/](plugins/user-radar/) |

## Instalar no Valenced

Abra **Configurações → Valenced → Plugins → ⚙️** e adicione o [endereço do catálogo](https://raw.githubusercontent.com/mydiscordstuff/plugins/main/index.json).

## AMOLED RGB

Ative **AMOLED RGB** em **Valenced → Plugins** e toque em **Reload App** na primeira instalação. Na engrenagem do plugin, selecione um ciclo de 15, 30 ou 60 segundos ou pause na cor atual. O fundo das telas compatíveis fica preto puro. O ciclo pausa em segundo plano e respeita a opção de reduzir movimento do celular. Ao desativar o plugin, o Discord volta a usar as cores do tema selecionado.

## Editar ou adicionar um plugin

Edite a pasta existente ou crie `plugins/nome-do-plugin/` com o manifesto e os arquivos de execução que ele declara. Para publicar uma nova versão, atualize `version` no manifesto e envie a alteração para a branch `main`.

O GitHub Actions encontra as pastas com `manifest.json`, empacota os arquivos e gera o catálogo. Os ZIPs ficam na [branch de pacotes](https://github.com/mydiscordstuff/plugins/tree/packages). O `index.json` da `main` mantém o endereço usado pelas instalações existentes.

## UserRadar no Android

Abra **Configurações → Valenced → UserRadar**, adicione o ID de uma pessoa e toque em **Enviar notificação de teste**. Em **Notificações do Android**, você pode permitir alertas e ajustar o som. Após um reload, se o canal próprio do UserRadar estiver indisponível, o plugin pode entregar os alertas pelas notificações locais do Discord. A lista e o histórico são locais e separados por conta. Os alertas dependem dos eventos que chegam à sessão do Discord, inclusive em segundo plano. Com o app encerrado ou a conexão suspensa, o plugin não recebe eventos.

Para usar outro app, ative **Manter conexão em segundo plano** com pelo menos uma pessoa na lista. Toque em **Testar ao sair do Discord** e volte à tela inicial. Esse teste verifica a entrega local no momento da troca. Os alertas de atividade dependem de a sessão continuar recebendo eventos. Manter a conexão pode aumentar o uso de bateria.

Adaptação independente inspirada no [UserRadar para Vencord, de k1ng0p](https://github.com/k1ng0p/UserRadar).
