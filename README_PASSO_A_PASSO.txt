MRG iPhone - GitHub Actions / Mac na nuvem

OBJETIVO
Compilar o app iPhone usando GitHub Actions com macOS, sem precisar ter Mac em casa.

IMPORTANTE
Este pacote compila um APP DE SIMULADOR primeiro, para validar se o projeto monta.
Para instalar em iPhone real, depois precisa assinatura Apple/Apple Developer ou serviço de distribuição.
A primeira etapa é só provar que o projeto iOS compila na nuvem.

PASSO A PASSO NO GITHUB

1. Criar repositório novo no GitHub
   Nome sugerido:
   mrg-iphone-aviator

2. Entrar no repositório novo.

3. Clicar em:
   Add file > Upload files

4. Arrastar TODOS os arquivos e pastas deste ZIP extraído para dentro do GitHub:
   - pasta .github
   - pasta MRGAviatorIPhone
   - pasta MRGAviatorIPhone.xcodeproj
   - README_PASSO_A_PASSO.txt

5. Embaixo, no commit, escrever:
   cria app iphone wkwebview

6. Clicar em Commit changes.

7. Ir na aba:
   Actions

8. Clicar no workflow:
   Build MRG iPhone

9. Clicar em:
   Run workflow

10. Aguardar terminar.

11. Se ficar verde, clicar no workflow finalizado e baixar o artifact:
   MRGAviatorIPhone-SIMULATOR-DEBUG

SE DER ERRO
Mande print da tela vermelha do GitHub Actions.
Eu corrijo o projeto.

PRÓXIMA ETAPA
Depois que compilar verde, vamos para instalação em iPhone real.
