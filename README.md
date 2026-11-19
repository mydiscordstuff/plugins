# Plugins para o Valenced

Cada plugin tem uma pasta em `plugins/` com seu código e `manifest.json`.

| Plugin | Código-fonte |
| --- | --- |
| desmaiaram themes | [plugins/amoled-rgb/](plugins/amoled-rgb/) |
| Platform Indicators | [plugins/platform-indicators/](plugins/platform-indicators/) |
| UserRadar (Android) | [plugins/user-radar/](plugins/user-radar/) |

## Instalar no Valenced

Abra **Configurações → Valenced → Plugins → ⚙️** e adicione o [endereço do catálogo](https://raw.githubusercontent.com/mydiscordstuff/plugins/main/index.json).

## desmaiaram themes

Atualize o antigo **AMOLED RGB** em **Valenced → Plugins** e use **Reload App**. Abra a engrenagem de **desmaiaram themes**. Na primeira instalação, o fundo é preto puro e o arco-íris colore botões e texto. A atualização aproveita a velocidade e a pausa já salvas.

Escolha **Arco-íris suave**, **Chroma pulsante**, **Onda de cores**, **Pulso da cor escolhida** ou **Cores fixas**. A onda percorre as áreas animadas em momentos diferentes. A duração de um ciclo varia de 5 a 120 segundos, com nove opções.

Toque em **Fundo**, **Botões** ou **Texto** para escolher uma amostra ou aplicar uma cor HEX. Cada área tem seu próprio controle de animação. No pulso, sua cor vira a base do efeito. Nos modos de arco-íris, escolher uma cor fixa pausa só aquela área. A animação respeita a opção de reduzir movimento do celular e pausa em segundo plano. Ao desativar o plugin, o tema anterior volta nas telas compatíveis.

## Editar ou adicionar um plugin

Edite a pasta existente ou crie `plugins/nome-do-plugin/` com o manifesto e os arquivos de execução que ele declara. Para publicar uma nova versão, atualize `version` no manifesto e envie a alteração para a branch `main`.

O GitHub Actions encontra as pastas com `manifest.json`, empacota os arquivos e gera o catálogo. Os ZIPs ficam na [branch de pacotes](https://github.com/mydiscordstuff/plugins/tree/packages). O `index.json` da `main` mantém o endereço usado pelas instalações existentes.

## UserRadar no Android

Abra **Configurações → Valenced → UserRadar**, adicione o ID de uma pessoa e toque em **Enviar notificação de teste**. Em **Notificações do Android**, você pode permitir alertas e ajustar o som. Após um reload, se o canal próprio do UserRadar estiver indisponível, o plugin pode entregar os alertas pelas notificações locais do Discord. A lista e o histórico são locais e separados por conta. Os alertas dependem dos eventos que chegam à sessão do Discord, inclusive em segundo plano. Com o app encerrado ou a conexão suspensa, o plugin não recebe eventos.

Para usar outro app, ative **Manter conexão em segundo plano** com pelo menos uma pessoa na lista. Toque em **Testar ao sair do Discord** e volte à tela inicial. Esse teste verifica a entrega local no momento da troca. Os alertas de atividade dependem de a sessão continuar recebendo eventos. Manter a conexão pode aumentar o uso de bateria.

Adaptação independente inspirada no [UserRadar para Vencord, de k1ng0p](https://github.com/k1ng0p/UserRadar).
