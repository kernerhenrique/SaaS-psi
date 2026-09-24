# Escopo — Sistema de consultório de psicologia

## Público e contexto

- Psicóloga que atende **crianças, adolescentes e jovens**, presencialmente. Há muito contato com os **pais/responsáveis**: normalmente existe uma conversa com eles antes do primeiro atendimento da criança.
- Só a psicóloga usa o sistema. Não há agendamento público: as consultas são combinadas pelo WhatsApp e lançadas por ela.
- A usuária não é de tecnologia: telas didáticas, poucos passos, textos de ajuda.
- Produto revendável: cada psicóloga é um `Business` com marca própria.

## a. Serviços

| Tipo | Valor padrão |
|---|---|
| Primeira consulta | R$ 250,00 |
| Consulta de retorno | R$ 200,00 |

Valores editáveis nas configurações.

## b. Sessões

Não são recorrentes: cada paciente volta em dias e intervalos diferentes. Cada consulta é lançada individualmente.

## c. Pagamento

Por sessão.

## d. Faltas e cancelamentos

Apenas marcados na agenda (Cancelada / Faltou). A psicóloga resolve o resto pelo WhatsApp.

## e. Prontuário

- **Dados fixos do paciente**: nome, idade (calculada), data de nascimento, informações importantes de saúde. Preenchidos uma vez, editáveis depois. Inclui responsáveis (nome, parentesco, WhatsApp).
- **Primeiro contato com os pais/responsáveis**: campo próprio.
- **Primeira consulta com o paciente**: anotações.
- **Consultas de retorno**: histórico por data.
- **Destaques para a próxima sessão**: itens a acompanhar (ex.: "verificar se melhorou o sono"), que podem ser marcados como resolvidos.

Regras: dado sensível (LGPD, resoluções do CFP) → sem exclusão definitiva, guarda mínima de 5 anos, campos criptografados, nada em logs.

## f. Relatórios pós-consulta

Gerados a partir da nota estruturada da sessão (não escritos do zero), editáveis, prontos para imprimir/PDF com cabeçalho da psicóloga (nome, CRP).

## g. Mensagens de WhatsApp

Modelos prontos para copiar e colar (e link "abrir no WhatsApp"):
- Lembrete de consulta.
- Pergunta se fará consulta de retorno.
- **Cobrança**: sugerida automaticamente quando uma sessão realizada fica com pagamento **Pendente** há alguns dias (padrão: 3, configurável).

## h. Identidade visual

`docs/id-visual.pdf`. Aplicar a cor só onde ajuda; o resto neutro, para ser reaproveitável com a marca de outra psicóloga.

## i. Ditado + IA de notas

Não se grava a sessão (consentimento de menores; ludoterapia é pouco verbal). Fluxo:
1. Ao fim do atendimento, a psicóloga aciona o ditado no prontuário do paciente.
2. Dois blocos separados: **resumo do relato dos pais/responsáveis** e **resumo da sessão com o paciente**.
3. A IA organiza o texto nos campos do prontuário (contato com pais / sessão do paciente / destaques), gerando um **rascunho**.
4. A psicóloga revisa e edita antes de salvar.
5. Nenhum áudio é armazenado; só o texto final.
6. O relatório pós-consulta (f) pode ser gerado a partir dessa nota.

Implementação: transcrição atrás da interface `TranscriptionProvider` (hoje: reconhecimento de voz do navegador, pt-BR; depois: API paga de transcrição, sem mexer no resto). Organização via Claude API.

## j. Controle de pagamento

Pagamento feito diretamente à psicóloga (fora da plataforma). O sistema só registra.

Por sessão:
- Status: **Pago / Pendente / Não vai pagar** (ex.: falta).
- Valor pré-preenchido pelo tipo de consulta, editável (desconto, negociação).
- Forma: PIX, dinheiro, cartão, transferência.
- Data em que o pagamento foi recebido (pode ser diferente da data da sessão).

Visão geral:
- Lista **"A receber"**: sessões realizadas sem pagamento confirmado.
- **Total recebido por período** (mês etc.), útil para o IR de autônoma.
- **Histórico** filtrável por paciente.
