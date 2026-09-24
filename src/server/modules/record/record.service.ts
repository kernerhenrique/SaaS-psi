import { prisma } from "@/server/db/prisma";
import { encryptOptional, encryptText } from "@/server/crypto/records-cipher";
import { NotFoundError } from "@/server/errors";
import { assertPatientOwnership } from "@/server/modules/patient/patient.service";

import type { FollowUpInput, ParentNoteInput, SessionNoteInput } from "./record.parse";

// Prontuário: nada aqui apaga registros de verdade — "excluir" só marca
// `deletedAt` (guarda mínima exigida pelo CFP). Todo texto é cifrado.

function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

// ---- Contato com os pais -------------------------------------------------

export async function addParentNote(businessId: string, patientId: string, input: ParentNoteInput) {
  await assertPatientOwnership(businessId, patientId);
  await prisma.parentIntakeNote.create({
    data: { businessId, patientId, date: dateOnly(input.date), content: encryptText(input.content) },
  });
}

async function findParentNote(businessId: string, noteId: string) {
  const note = await prisma.parentIntakeNote.findFirst({ where: { id: noteId, businessId, deletedAt: null } });
  if (!note) throw new NotFoundError("Anotação não encontrada");
  return note;
}

export async function updateParentNote(businessId: string, noteId: string, input: ParentNoteInput) {
  await findParentNote(businessId, noteId);
  await prisma.parentIntakeNote.update({
    where: { id: noteId },
    data: { date: dateOnly(input.date), content: encryptText(input.content) },
  });
}

export async function archiveParentNote(businessId: string, noteId: string) {
  await findParentNote(businessId, noteId);
  await prisma.parentIntakeNote.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
}

// ---- Anotações da consulta -----------------------------------------------

/** Salva (cria ou atualiza) a anotação de uma consulta como versão final revisada. */
export async function saveSessionNote(businessId: string, sessionId: string, input: SessionNoteInput) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, businessId, patient: { deletedAt: null } },
    select: { id: true },
  });
  if (!session) throw new NotFoundError("Consulta não encontrada");

  const data = {
    parentReport: encryptOptional(input.parentReport),
    patientSession: encryptOptional(input.patientSession),
    status: "FINAL" as const,
    deletedAt: null,
  };
  await prisma.sessionNote.upsert({
    where: { sessionId },
    create: { businessId, sessionId, ...data },
    update: data,
  });
}

// ---- Destaques para a próxima sessão -------------------------------------

export async function addFollowUp(businessId: string, patientId: string, input: FollowUpInput) {
  await assertPatientOwnership(businessId, patientId);
  await prisma.followUpItem.create({ data: { businessId, patientId, text: encryptText(input.text) } });
}

async function findFollowUp(businessId: string, followUpId: string) {
  const item = await prisma.followUpItem.findFirst({ where: { id: followUpId, businessId, deletedAt: null } });
  if (!item) throw new NotFoundError("Item não encontrado");
  return item;
}

export async function setFollowUpDone(businessId: string, followUpId: string, done: boolean) {
  await findFollowUp(businessId, followUpId);
  await prisma.followUpItem.update({ where: { id: followUpId }, data: { doneAt: done ? new Date() : null } });
}

export async function archiveFollowUp(businessId: string, followUpId: string) {
  await findFollowUp(businessId, followUpId);
  await prisma.followUpItem.update({ where: { id: followUpId }, data: { deletedAt: new Date() } });
}
