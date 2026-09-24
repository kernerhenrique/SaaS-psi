# Project Context

Sistema de gestão de consultório para psicólogas (primeira cliente: Amanda Ribeiro, psicóloga infantil/adolescente/jovem, CRP 16/11644). É um fork do projeto `SaaS-agendamento` (remoto `upstream`), mas **sem agendamento público**: só a psicóloga usa o sistema. Ela combina as consultas pelo WhatsApp e as lança na agenda, registra prontuário, pagamentos, mensagens prontas e relatórios.

A usuária **não é de tecnologia**: toda tela deve ser o mais didática possível (textos de ajuda curtos, poucos passos, linguagem do dia a dia, nada de jargão técnico).

Produto revendável para outras psicólogas: multi-tenant (`Business`) com marca configurável (logo, cor de destaque, nome, CRP). Nunca deixar a identidade da Amanda fixa no código.

Escopo completo e regras de negócio: `docs/escopo-consultorio.md`. Identidade visual: `docs/id-visual.pdf`.

Antes de qualquer mudança de arquitetura ou de schema, pare e proponha um plano.

## Referências visuais (apenas visual, não copiar)

1. https://www.psicomanager.com.br/individual
2. https://uaicare.com.br/para-psicologos

<!-- BEGIN orientações de design -->
## Orientações de Design

*DIREÇÃO DE DESIGN / UI*
O sistema deve ter aparência de SaaS moderno (referências: SimplePractice,
Linear, Notion, Cal.com), e não de painel administrativo tradicional
com cara de HTML puro.

*Estilo geral*
- Layout arejado, com bastante espaço em branco e respiro entre blocos
- Cantos arredondados (cards, botões, inputs, modais)
- Sombras suaves e sutis em vez de bordas duras e linhas de tabela
- Hierarquia visual clara: títulos fortes, textos secundários em tom
  mais claro, poucas cores de destaque
- Tom acolhedor e leve, adequado a uma psicóloga infantil, mas
  profissional (nada infantilizado)

*Componentes*
- Sidebar lateral fixa com ícones + texto para navegação (Agenda,
  Pacientes, Financeiro, Mensagens, Relatórios), recolhível
- Cards no lugar de tabelas sempre que possível; quando tabela for
  necessária, sem grade pesada, com linhas espaçadas e hover suave
- Badges/tags coloridas para status (Pago, Pendente, Primeira consulta,
  Retorno, Cancelado)
- Avatares com iniciais do paciente
- Estados vazios ilustrados e com orientação ("Nenhum paciente ainda —
  cadastre o primeiro")
- Skeleton loading em vez de telas brancas carregando
- Toasts/notificações discretas para confirmações ("Pagamento
  registrado", "Mensagem copiada")
- Botão de copiar mensagem do WhatsApp com feedback visual imediato

*Interação*
- Microanimações e transições suaves (abrir modal, trocar de aba,
  hover), sem exageros
- Agenda visual em formato de calendário semanal/diário com blocos
  coloridos por tipo de consulta, não uma lista
- Dashboard inicial com resumo do dia: próximas consultas, pagamentos
  pendentes, pacientes aguardando retorno
- Totalmente responsivo: a psicóloga provavelmente vai usar muito no
  celular entre atendimentos
- Modo claro como padrão; modo escuro opcional

Identidade visual (cartão da Amanda): fundo creme, texto marrom-oliva, títulos em fonte serifada, borboleta em pastéis (amarelo, verde-sálvia, salmão, cinza quente). Aplicar a cor apenas onde ajuda a psicóloga (botão primário, item ativo, badges) — o resto neutro, para funcionar com a marca de outra cliente.

Antes de construir todas as telas, crie primeiro o design system
(cores, tipografia, espaçamentos, componentes base) e uma tela de
referência (o dashboard) para aprovação do visual.
<!-- END orientações de design -->

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui, ícones Lucide, animações Framer Motion, toasts `sonner`
- API Routes do Next.js; PostgreSQL via Prisma
- Auth: JWT + bcrypt (só a psicóloga faz login)
- IA: ditado da psicóloga **após** o atendimento (nunca gravar a sessão). Transcrição atrás da interface `TranscriptionProvider` (hoje Web Speech API do navegador; trocável por API paga). Organização do texto nos campos do prontuário via Claude API. Áudio nunca é armazenado; o resultado é sempre rascunho revisado pela psicóloga.
- Testes: Vitest (unitário) + Playwright (E2E)
- Banco local: `docker compose up -d` (porta **5433**, para não conflitar com o projeto base na 5432)

## Standards

- TypeScript estrito (`strict: true`), sem `any` não justificado.
- Isolamento multi-tenant: toda query deve filtrar por `businessId` — nunca confiar apenas no ID do recurso filho.
- Prontuário é dado sensível de saúde de menores (LGPD / CFP): sem exclusão definitiva (soft delete), campos de prontuário criptografados na aplicação, nada de dados clínicos em logs.
- Pagamentos são feitos fora da plataforma: o sistema só registra e organiza, não processa transações.
- Componentes de UI seguem o design system do shadcn/ui; evitar CSS solto fora do Tailwind.
- Commits pequenos e descritivos (Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`).
- Nunca commitar `.env`, chaves de API ou strings de conexão do banco.
- Nunca alterar o repositório base (`upstream`); correções da base entram via `git cherry-pick`.

## Common Commands

```bash
docker compose up -d     # sobe o Postgres local (porta 5433)
npm run dev              # servidor de desenvolvimento
npm run build            # build de produção
npx prisma migrate dev   # aplicar migrations em dev
npx prisma studio        # inspecionar dados
npm run test             # testes unitários
npm run test:e2e         # testes end-to-end (Playwright)
```

## Verificação

Toda tela nova é conferida no navegador pela extensão Claude in Chrome (largura de desktop e de celular) e sem erros no console, além de lint, build e testes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
