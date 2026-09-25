# Pendências

Situação em 24/09/2026: as 9 fases do plano inicial estão concluídas e no GitHub (commit `edc7ef6`).
Itens abaixo ficaram para depois, em ordem sugerida.

## 1. Testar com uso real

- [ ] **Ditado com microfone de verdade** (Chrome): Pacientes → um paciente → consulta de hoje ou passada → "Ditar anotações" → "Ditar". Na primeira vez o Chrome pede permissão do microfone. Testar também no celular (Android/Chrome; no iPhone o reconhecimento de voz do navegador é instável).
- [ ] **Organização do ditado por IA**: colocar a chave em `ANTHROPIC_API_KEY` no `.env` (criar em console.anthropic.com — não compartilhar a chave em chat), reiniciar o servidor e testar "Organizar com IA". Esse caminho ainda **não foi testado de verdade** (sem chave, o botão fica desativado).
  - Antes de usar com pacientes reais: conferir os termos de uso de dados da Anthropic e mencionar o uso de IA no termo de consentimento com as famílias (dados de saúde de menores — LGPD).

## 2. Deploy (colocar no ar)

- [ ] Escolher onde hospedar (app + banco PostgreSQL) e planejar em modo de planejamento.
- [ ] Definir como a psicóloga cria a própria conta e senha (hoje só existe o usuário do seed de desenvolvimento).
- [ ] Gerar `JWT_SECRET` e `RECORDS_ENCRYPTION_KEY` próprios de produção. **A chave de criptografia nunca pode ser trocada depois de haver dados** (os prontuários ficariam ilegíveis) — guardar com segurança e fazer backup dela.
- [ ] Backups do banco.
- [ ] Rate limit do login hoje é em memória (vale para um servidor só); com mais de uma instância, trocar por armazenamento compartilhado (ex.: Redis).

## 3. Funcionalidades sugeridas

- [ ] **CPF de quem paga** no cadastro do responsável e na planilha do Financeiro — para recibos/Receita Saúde. Confirmar a regra com o contador da psicóloga antes.
- [ ] **Envio do logo** pela tela de Configurações (hoje o logo vem do seed: `public/brand/borboleta.svg`). Se a psicóloga tiver o arquivo original do logo, usar no lugar da versão redesenhada.
- [ ] Trocar a transcrição do navegador por uma API paga, se a qualidade do ditado não for suficiente: criar outro provider em `src/lib/transcription/` e trocar uma linha em `src/lib/transcription/index.ts`.

## 4. Qualidade / manutenção

- [ ] Banco separado só para os testes E2E (hoje usam o banco local e limpam o que criam ao terminar; se sobrar algo: `npm run db:limpar-testes`).
- [ ] Remover ou proteger a página `/admin/design-system` antes do deploy (é só referência visual).

## Anotações da conversa com a psicóloga

_Use este espaço para anotar pedidos e impressões da demonstração._

-
