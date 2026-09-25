-- Remove do banco LOCAL os dados criados pelos testes E2E (pacientes "João Teste…",
-- consultas canceladas em datas futuras sorteadas pelo teste da agenda e relatórios).
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
DELETE FROM "Session" WHERE status = 'CANCELLED' AND "startAt" > now() + interval '50 days';
COMMIT;
