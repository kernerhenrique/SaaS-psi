-- Remove do banco LOCAL os dados criados pelos testes E2E (pacientes "João Teste…",
-- e consultas em datas futuras distantes sorteadas pelo teste da agenda).
-- Uso: npm run db:limpar-testes
BEGIN;
CREATE TEMP TABLE t AS SELECT id FROM "Patient" WHERE "fullName" LIKE 'João Teste %';
DELETE FROM "SessionReport" WHERE "sessionId" IN (SELECT id FROM "Session" WHERE "patientId" IN (SELECT id FROM t));
DELETE FROM "SessionNote" WHERE "sessionId" IN (SELECT id FROM "Session" WHERE "patientId" IN (SELECT id FROM t));
DELETE FROM "FollowUpItem" WHERE "patientId" IN (SELECT id FROM t);
DELETE FROM "Session" WHERE "patientId" IN (SELECT id FROM t);
DELETE FROM "ParentIntakeNote" WHERE "patientId" IN (SELECT id FROM t);
DELETE FROM "Guardian" WHERE "patientId" IN (SELECT id FROM t);
DELETE FROM "Patient" WHERE id IN (SELECT id FROM t);
-- Consultas a mais de 50 dias no futuro só existem nos testes da agenda (o seed marca no máximo ~1 semana).
-- Pega também as de testes interrompidos no meio (que podem ter ficado realizadas e pagas).
CREATE TEMP TABLE futuras AS SELECT id FROM "Session" WHERE "startAt" > now() + interval '50 days';
DELETE FROM "SessionReport" WHERE "sessionId" IN (SELECT id FROM futuras);
DELETE FROM "SessionNote" WHERE "sessionId" IN (SELECT id FROM futuras);
DELETE FROM "Session" WHERE id IN (SELECT id FROM futuras);
COMMIT;
