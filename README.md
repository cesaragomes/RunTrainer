🏃 RunTrainer - Offline Pro

Seu assistente de corrida focado em performance e simplicidade.

O RunTrainer é um aplicativo móvel desenvolvido em React Native (Expo) focado em treinos de corrida intervalada. Ele foi projetado para operar 100% Offline, garantindo privacidade total e funcionamento em qualquer lugar, sem dependência de internet ou login.

O app guia o utilizador desde os primeiros passos (Couch to 5K) até à Maratona completa, além de permitir a criação de treinos intervalados totalmente personalizados.

📱 Funcionalidades Principais

⚡ 100% Offline: Todos os dados, históricos e treinos são salvos localmente no dispositivo via AsyncStorage.

🏆 Planos de Treino Integrados:

Rumo ao 5K (C25K): O clássico programa de 9 semanas para iniciantes.

Rumo ao 10K: Ponte para aumentar o volume pós-5K.

Meia Maratona (21K): Ciclo de 10 semanas com foco em resistência.

Maratona (42K): Preparação completa de 16 semanas.

🛠️ Criador de Treinos Personalizado: Monte treinos de tiro, fartlek ou rodagem definindo minutos e segundos exatos para cada etapa (Correr, Caminhar, Aquecer, Resfriar).

🎧 Feedback de Áudio:

Contagem regressiva sonora ("3, 2, 1...").

Avisos de voz para troca de estágio (ex: "Começar a Correr").

🎨 Interface Vibrante: Identidade visual distinta por cores para cada categoria de distância.

📊 Histórico de Conclusão: Acompanhe visualmente quais treinos do plano já foram realizados.

🛠️ Tecnologias Utilizadas

Core: React Native

Framework: Expo (Managed Workflow)

Linguagem: JavaScript (ES6+)

Persistência de Dados: @react-native-async-storage/async-storage

Áudio: expo-av (Reprodução de assets MP3)

Síntese de Voz (Fallback): expo-speech

Ícones: lucide-react-native

Build System: Gradle (Android)

🚀 Como Rodar o Projeto Localmente

Pré-requisitos

Node.js (LTS)

Java JDK 17 (Necessário para Android)

Android Studio (com SDK e Command-line tools configurados)

Instalação

Clone o repositório:

git clone [https://github.com/SEU_USUARIO/RunTrainer.git](https://github.com/SEU_USUARIO/RunTrainer.git)
cd RunTrainer


Instale as dependências:

npm install


Prepare os Assets:
Certifique-se de que os arquivos de áudio (ex: countdown.mp3, audio_run.mp3) estão na pasta ./assets.

Execute em modo de desenvolvimento:

npx expo start


Use o app Expo Go no seu telemóvel para ler o QR Code ou pressione a para abrir no emulador Android.

📦 Como Gerar o APK (Android Build)

Este projeto está configurado para compilação local (Local Build) utilizando o Gradle, o que garante controle total e evita filas de servidores na nuvem.

Passo 1: Gerar a pasta nativa

Se você acabou de clonar o projeto ou instalou novas bibliotecas, sincronize a pasta Android:

npx expo prebuild


Passo 2: Compilar o APK de Release

Navegue até a pasta Android e execute o Gradle Wrapper:

Windows (PowerShell):

cd android
./gradlew assembleRelease


Linux / macOS:

cd android
./gradlew assembleRelease


Localização do APK

Após a mensagem BUILD SUCCESSFUL, o arquivo instalável estará em:
android/app/build/outputs/apk/release/app-release.apk

📂 Estrutura do Projeto

O projeto utiliza uma arquitetura de Arquivo Único (Single File Component) no App.js para simplificar a gestão de estado e compilação, ideal para manutenção rápida.

App.js: Contém toda a lógica de negócio, navegação (estado), renderização de UI e persistência.

assets/: Imagens, ícones e arquivos de áudio .mp3.

app.json: Configurações do Expo (Nome, Pacote, Ícones, Versão).

android/: Código nativo gerado (não deve ser editado manualmente a menos que necessário).

📄 Licença

Este projeto é de uso pessoal e educacional. Sinta-se à vontade para fazer um fork e adaptar para os seus treinos!
