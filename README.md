# Consultório — SaaS para psicólogas

Sistema de gestão de consultório para psicólogas que atendem crianças, adolescentes e jovens: agenda, prontuário, controle de pagamentos, mensagens prontas para WhatsApp e relatórios pós-consulta. Só a psicóloga usa o sistema (não há agendamento público).

Escopo e regras de negócio: [`docs/escopo-consultorio.md`](docs/escopo-consultorio.md).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI), Lucide, Motion, Sonner
- API Routes do Next.js; PostgreSQL + Prisma
- Autenticação JWT (access + refresh) com bcrypt, em cookies `httpOnly`, e limite de tentativas no login
- Prontuário criptografado na aplicação (AES-256-GCM)
- Vitest (unitário) e Playwright (E2E)

## Rodando localmente

Pré-requisitos: Node 20+ e Docker.

```bash
npm install
cp .env.example .env        # gere JWT_SECRET e RECORDS_ENCRYPTION_KEY como indicado no arquivo
docker compose up -d        # Postgres na porta 5433
npx prisma migrate dev      # cria as tabelas
npx prisma db seed          # dados fictícios de exemplo
npm run dev
```

Login de desenvolvimento (só no banco local): `amanda@consultorio.dev` / `consultorio123`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
| `npm run test` | testes unitários |
| `npm run test:e2e` | testes end-to-end |

## Origem

Derivado do projeto [SaaS-agendamento](https://github.com/kernerhenrique/SaaS-agendamento) (remoto `upstream`, só leitura). Os dois projetos são independentes.
