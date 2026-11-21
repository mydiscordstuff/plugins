# Plugins para o Valenced

Cada plugin tem uma pasta em `plugins/` com seu código e `manifest.json`.

| Plugin | Código-fonte |
| --- | --- |
| desmaiaram themes | [plugins/amoled-rgb/](plugins/amoled-rgb/) |
| Platform Indicators | [plugins/platform-indicators/](plugins/platform-indicators/) |
| UserRadar (Android) | [plugins/user-radar/](plugins/user-radar/) |
| Volume Booster | [plugins/volume-booster/](plugins/volume-booster/) |

## Instalar no Valenced

Abra **Configurações → Valenced → Plugins → ⚙️** e adicione o [endereço do catálogo](https://raw.githubusercontent.com/mydiscordstuff/plugins/main/index.json).

## desmaiaram themes

Em **Valenced → Plugins**, atualize **desmaiaram themes**, use **Reload App** e abra a engrenagem do plugin.

Com **Tema RGB** ligado, o fundo das telas temáticas fica preto puro (`#000000`). Texto, botões, ícones, bordas e indicadores acompanham o efeito, inclusive quando você já salvou cores fixas. Escolha **Arco-íris suave**, **Chroma pulsante**, **Onda de cores** ou **Pulso RGB**, com nove velocidades de 5 a 120 segundos. A pausa congela o efeito. A animação respeita a opção de reduzir movimento do celular e pausa em segundo plano.

Desligue **Tema RGB** para acessar **Fundo**, **Botões** e **Texto**. Escolha uma amostra ou digite uma cor HEX. Suas três cores ficam guardadas quando você volta ao RGB. O efeito alcança as cores que o Discord consulta pelo sistema de temas. Imagens, emojis e componentes nativos com cores próprias podem manter a aparência original.

## Volume Booster

Durante uma chamada de voz, abra **Valenced → Plugins → Volume Booster → ⚙️**. Toque no nome de uma pessoa e escolha **225%, 250%, 300%, 350% ou 400%**. O ajuste é local e vale para a chamada atual. Para desfazer, toque em **Voltar ao volume do Discord** ou mova o controle de volume da pessoa no próprio Discord. O painel mostra o valor solicitado à conexão de voz. O ganho audível depende do cliente e do aparelho.

## Editar ou adicionar um plugin

Edite a pasta existente ou crie `plugins/nome-do-plugin/` com o manifesto e os arquivos de execução que ele declara. Para publicar uma nova versão, atualize `version` no manifesto e envie a alteração para a branch `main`.

O GitHub Actions encontra as pastas com `manifest.json`, empacota os arquivos e gera o catálogo. Os ZIPs ficam na [branch de pacotes](https://github.com/mydiscordstuff/plugins/tree/packages). O `index.json` da `main` mantém o endereço usado pelas instalações existentes.

## UserRadar no Android

Abra **Configurações → Valenced → UserRadar**, adicione o ID de uma pessoa e toque em **Enviar notificação de teste**. Em **Notificações do Android**, você pode permitir alertas e ajustar o som. Após um reload, se o canal próprio do UserRadar estiver indisponível, o plugin pode entregar os alertas pelas notificações locais do Discord. A lista e o histórico são locais e separados por conta. Os alertas dependem dos eventos que chegam à sessão do Discord, inclusive em segundo plano. Com o app encerrado ou a conexão suspensa, o plugin não recebe eventos.

Para usar outro app, ative **Manter conexão em segundo plano** com pelo menos uma pessoa na lista. Toque em **Testar ao sair do Discord** e volte à tela inicial. Esse teste verifica a entrega local no momento da troca. Os alertas de atividade dependem de a sessão continuar recebendo eventos. Manter a conexão pode aumentar o uso de bateria.

Adaptação independente inspirada no [UserRadar para Vencord, de k1ng0p](https://github.com/k1ng0p/UserRadar).
