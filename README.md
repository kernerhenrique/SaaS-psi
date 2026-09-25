# Consultório — SaaS para psicólogas

Sistema de gestão de consultório para psicólogas que atendem crianças, adolescentes e jovens. Só a psicóloga usa o sistema (não há agendamento público): ela combina as consultas com as famílias pelo WhatsApp e registra tudo aqui.

Escopo e regras de negócio: [`docs/escopo-consultorio.md`](docs/escopo-consultorio.md).

## O que o sistema faz

| Tela | Para quê |
|---|---|
| **Início** | Resumo do dia: consultas, a receber, recebido no mês, pacientes aguardando retorno, pontos para acompanhar e sugestões de cobrança. |
| **Agenda** | Semana (computador) ou dia (celular); marcar, concluir com pagamento, falta, remarcar e cancelar; impede horários sobrepostos. |
| **Pacientes** | Dados fixos, responsáveis, conversas com os pais, anotações de cada consulta (digitadas ou **ditadas**), pontos para acompanhar e pagamentos. |
| **Financeiro** | A receber, recebidos por mês/ano (pela data do recebimento), por forma de pagamento e por paciente; planilha CSV para o contador. |
| **Mensagens** | Lembretes, cobranças e convites de retorno prontos para copiar ou abrir no WhatsApp; modelos editáveis. |
| **Relatórios** | Relatório pós-consulta montado a partir das anotações, editável, para imprimir/salvar em PDF com o cabeçalho da psicóloga. |
| **Configurações** | Nome, CRP, contato, cor de destaque e valores/duração dos tipos de consulta. |

**Ditado + IA:** após o atendimento, a psicóloga dita o relato dos pais e o da sessão (reconhecimento de voz do navegador, sem gravar áudio). O texto pode ir direto para o prontuário ou ser organizado pelo Claude (opcional, requer `ANTHROPIC_API_KEY`); sempre há revisão antes de salvar. A transcrição fica atrás de `src/lib/transcription` para ser trocada por uma API paga sem mexer nas telas.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI), Lucide, Motion, Sonner
- API Routes do Next.js; PostgreSQL + Prisma
- Autenticação JWT (access + refresh) com bcrypt, em cookies `httpOnly`, e limite de tentativas no login
- Prontuário e relatórios criptografados na aplicação (AES-256-GCM); nada de dados clínicos em logs
- Claude API (`@anthropic-ai/sdk`) para organizar o ditado — opcional
- Vitest (unitário) e Playwright (E2E)

## Rodando localmente

Pré-requisitos: Node 20+ e Docker.

```bash
npm install
cp .env.example .env        # gere JWT_SECRET e RECORDS_ENCRYPTION_KEY como indicado no arquivo
docker compose up -d        # Postgres na porta 5433
npx prisma migrate dev      # cria as tabelas
npx prisma db seed          # dados fictícios de exemplo
npm run dev                 # http://localhost:3001
```

Login de desenvolvimento (só no banco local): `amanda@consultorio.dev` / `consultorio123`.

Para ativar a organização do ditado por IA, coloque sua chave em `ANTHROPIC_API_KEY` no `.env` e reinicie o servidor.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (porta 3001) |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
| `npm run test` | testes unitários |
| `npm run test:e2e` | testes end-to-end (usa o banco local e limpa os dados de teste ao terminar) |
| `npm run db:limpar-testes` | remove do banco local dados deixados pelos testes E2E |

## Origem

Derivado do projeto [SaaS-agendamento](https://github.com/kernerhenrique/SaaS-agendamento) (remoto `upstream`, só leitura). Os dois projetos são independentes.
