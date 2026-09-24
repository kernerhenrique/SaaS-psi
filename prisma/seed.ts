import "dotenv/config";

import bcrypt from "bcryptjs";

import {
  MessageTemplateKind,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  SessionStatus,
} from "../src/generated/prisma/client.js";
import { addDaysToIsoDate, localMinutesToUtc, todayInTimeZone } from "../src/lib/date.js";
import { DEFAULT_MESSAGE_TEMPLATES } from "../src/lib/message-template.js";
import { encryptText } from "../src/server/crypto/records-cipher.js";

// Dados fictícios para desenvolvimento. As datas são relativas a "hoje" para
// o dashboard sempre ter consultas do dia, pendências e pacientes aguardando retorno.

const prisma = new PrismaClient();
const TIMEZONE = "America/Sao_Paulo";
const today = todayInTimeZone(TIMEZONE);

function at(daysFromToday: number, time: string, durationMin = 50) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = addDaysToIsoDate(today, daysFromToday);
  const startAt = localMinutesToUtc(date, hours * 60 + minutes, TIMEZONE);
  return { startAt, endAt: new Date(startAt.getTime() + durationMin * 60_000) };
}

function dateOnly(daysFromToday: number): Date {
  return new Date(`${addDaysToIsoDate(today, daysFromToday)}T00:00:00Z`);
}

type SeedSession = {
  day: number;
  time: string;
  first?: boolean;
  status?: SessionStatus;
  payment?: PaymentStatus;
  method?: PaymentMethod;
  paidDay?: number;
  amountCents?: number;
  note?: { parentReport?: string; patientSession: string };
};

type SeedPatient = {
  fullName: string;
  birthDate: string;
  healthInfo?: string;
  guardians: { name: string; relationship: string; phone: string; isPrimary?: boolean }[];
  parentIntake?: { day: number; content: string };
  sessions: SeedSession[];
  followUps?: string[];
};

const PATIENTS: SeedPatient[] = [
  {
    fullName: "Lucas Almeida",
    birthDate: "2018-03-10",
    healthInfo: "Rinite alérgica. Sem medicação contínua.",
    guardians: [{ name: "Carla Almeida", relationship: "Mãe", phone: "27999110001", isPrimary: true }],
    sessions: [
      { day: -35, time: "09:00", first: true, status: "DONE", payment: "PAID", method: "PIX", paidDay: -35 },
      { day: -21, time: "09:00", status: "DONE", payment: "PAID", method: "PIX", paidDay: -20 },
      { day: -8, time: "09:00", status: "DONE", payment: "PAID", method: "CASH", paidDay: -8 },
      {
        day: 0,
        time: "09:00",
        status: "DONE",
        payment: "PAID",
        method: "PIX",
        paidDay: 0,
        note: {
          parentReport: "Mãe conta que a semana foi mais tranquila e que as birras antes de dormir diminuíram.",
          patientSession: "Brincou de montar a casa com blocos; falou espontaneamente sobre a escola e o novo amigo.",
        },
      },
    ],
  },
  {
    fullName: "Beatriz Souza",
    birthDate: "2013-06-02",
    guardians: [
      { name: "Marcos Souza", relationship: "Pai", phone: "27999110002", isPrimary: true },
      { name: "Aline Souza", relationship: "Mãe", phone: "27999110003" },
    ],
    parentIntake: {
      day: -5,
      content: "Pais relatam ansiedade antes de provas e dificuldade para dormir nas últimas semanas.",
    },
    sessions: [{ day: 0, time: "14:00", first: true }],
  },
  {
    fullName: "Pedro Henrique Lima",
    birthDate: "2015-01-20",
    healthInfo: "TDAH diagnosticado em 2024; acompanhamento com neuropediatra.",
    guardians: [{ name: "Juliana Lima", relationship: "Mãe", phone: "27999110004", isPrimary: true }],
    parentIntake: {
      day: -60,
      content: "Mãe busca apoio por dificuldades de atenção e irritabilidade em casa após mudança de escola.",
    },
    sessions: [
      { day: -56, time: "16:30", first: true, status: "DONE", payment: "PAID", method: "CARD", paidDay: -56 },
      { day: -42, time: "16:30", status: "DONE", payment: "PAID", method: "PIX", paidDay: -41 },
      {
        day: -14,
        time: "16:30",
        status: "DONE",
        payment: "PAID",
        method: "PIX",
        paidDay: -14,
        note: {
          parentReport: "Mãe relata que ele tem acordado várias vezes à noite.",
          patientSession: "Mais agitado no início; acalmou com o jogo de tabuleiro. Citou a nova escola com desconforto.",
        },
      },
      { day: 0, time: "16:30" },
    ],
    followUps: ["Verificar se melhorou o sono", "Perguntar sobre a adaptação na nova escola"],
  },
  {
    fullName: "Sofia Martins",
    birthDate: "2016-11-15",
    guardians: [{ name: "Renata Martins", relationship: "Mãe", phone: "27999110005", isPrimary: true }],
    sessions: [
      { day: -30, time: "10:00", first: true, status: "DONE", payment: "PAID", method: "PIX", paidDay: -30 },
      { day: -6, time: "10:00", status: "DONE", payment: "PENDING" },
      { day: 8, time: "10:00" },
    ],
    followUps: ["Retomar o combinado das tarefas em casa"],
  },
  {
    fullName: "Gabriel Rocha",
    birthDate: "2011-04-08",
    guardians: [{ name: "André Rocha", relationship: "Pai", phone: "27999110006", isPrimary: true }],
    sessions: [{ day: -4, time: "15:00", first: true, status: "DONE", payment: "PENDING" }],
  },
  {
    fullName: "Helena Costa",
    birthDate: "2017-08-30",
    guardians: [{ name: "Patrícia Costa", relationship: "Mãe", phone: "27999110007", isPrimary: true }],
    sessions: [
      { day: -50, time: "11:00", first: true, status: "DONE", payment: "PAID", method: "TRANSFER", paidDay: -49 },
      { day: -24, time: "11:00", status: "DONE", payment: "PAID", method: "PIX", paidDay: -24 },
    ],
  },
  {
    fullName: "Miguel Ferreira",
    birthDate: "2014-02-14",
    guardians: [{ name: "Fernanda Ferreira", relationship: "Mãe", phone: "27999110008", isPrimary: true }],
    sessions: [
      { day: -40, time: "17:30", first: true, status: "DONE", payment: "PAID", method: "PIX", paidDay: -40 },
      { day: -19, time: "17:30", status: "DONE", payment: "PAID", method: "CARD", paidDay: -19 },
      { day: -12, time: "17:30", status: "NO_SHOW", payment: "WONT_PAY" },
    ],
  },
  {
    fullName: "Laura Nunes",
    birthDate: "2009-10-05",
    guardians: [{ name: "Roberto Nunes", relationship: "Pai", phone: "27999110009", isPrimary: true }],
    sessions: [
      { day: -29, time: "08:00", first: true, status: "DONE", payment: "PAID", method: "PIX", paidDay: -29 },
      { day: -15, time: "08:00", status: "DONE", payment: "PAID", method: "PIX", paidDay: -15, amountCents: 18000 },
    ],
  },
  {
    fullName: "Davi Oliveira",
    birthDate: "2019-07-22",
    guardians: [{ name: "Camila Oliveira", relationship: "Mãe", phone: "27999110010", isPrimary: true }],
    sessions: [
      { day: -10, time: "14:00", first: true, status: "DONE", payment: "PAID", method: "PIX", paidDay: -10 },
      { day: -3, time: "14:00", status: "CANCELLED", payment: "WONT_PAY" },
      { day: 2, time: "14:00" },
    ],
  },
];

async function main() {
  // Ordem de exclusão respeita as relações (prontuário usa onDelete: Restrict).
  await prisma.sessionReport.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.followUpItem.deleteMany();
  await prisma.parentIntakeNote.deleteMany();
  await prisma.session.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.sessionType.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  const business = await prisma.business.create({
    data: {
      name: "Amanda Ribeiro",
      timezone: TIMEZONE,
      crp: "CRP 16/11644",
      whatsapp: "27998142609",
      logoUrl: "/brand/borboleta.svg",
      users: {
        create: {
          email: "amanda@consultorio.dev",
          name: "Amanda Ribeiro",
          passwordHash: await bcrypt.hash("consultorio123", 10),
        },
      },
      messageTemplates: {
        create: [
          { kind: MessageTemplateKind.REMINDER, content: DEFAULT_MESSAGE_TEMPLATES.reminder },
          { kind: MessageTemplateKind.RETURN_INVITE, content: DEFAULT_MESSAGE_TEMPLATES["return-invite"] },
          { kind: MessageTemplateKind.PAYMENT_REMINDER, content: DEFAULT_MESSAGE_TEMPLATES["payment-reminder"] },
        ],
      },
    },
  });

  const firstVisit = await prisma.sessionType.create({
    data: { businessId: business.id, name: "Primeira consulta", priceCents: 25000, isFirstVisit: true, sortOrder: 0 },
  });
  const returnVisit = await prisma.sessionType.create({
    data: { businessId: business.id, name: "Retorno", priceCents: 20000, sortOrder: 1 },
  });

  for (const p of PATIENTS) {
    const patient = await prisma.patient.create({
      data: {
        businessId: business.id,
        fullName: p.fullName,
        birthDate: new Date(`${p.birthDate}T00:00:00Z`),
        healthInfo: p.healthInfo ? encryptText(p.healthInfo) : null,
        guardians: {
          create: p.guardians.map((g) => ({ ...g, businessId: business.id, isPrimary: g.isPrimary ?? false })),
        },
      },
    });

    if (p.parentIntake) {
      await prisma.parentIntakeNote.create({
        data: {
          businessId: business.id,
          patientId: patient.id,
          date: dateOnly(p.parentIntake.day),
          content: encryptText(p.parentIntake.content),
        },
      });
    }

    let lastDoneSessionId: string | null = null;
    for (const s of p.sessions) {
      const type = s.first ? firstVisit : returnVisit;
      const session = await prisma.session.create({
        data: {
          businessId: business.id,
          patientId: patient.id,
          sessionTypeId: type.id,
          ...at(s.day, s.time, type.durationMin),
          status: s.status ?? "SCHEDULED",
          amountCents: s.amountCents ?? type.priceCents,
          paymentStatus: s.payment ?? "PENDING",
          paymentMethod: s.method ?? null,
          paidAt: s.paidDay !== undefined ? dateOnly(s.paidDay) : null,
        },
      });
      if (s.status === "DONE") lastDoneSessionId = session.id;

      if (s.note) {
        await prisma.sessionNote.create({
          data: {
            businessId: business.id,
            sessionId: session.id,
            parentReport: s.note.parentReport ? encryptText(s.note.parentReport) : null,
            patientSession: encryptText(s.note.patientSession),
            status: "FINAL",
          },
        });
      }
    }

    for (const text of p.followUps ?? []) {
      await prisma.followUpItem.create({
        data: {
          businessId: business.id,
          patientId: patient.id,
          sourceSessionId: lastDoneSessionId,
          text: encryptText(text),
        },
      });
    }
  }

  console.log({
    login: "amanda@consultorio.dev / consultorio123",
    patients: PATIENTS.length,
    sessions: PATIENTS.reduce((sum, p) => sum + p.sessions.length, 0),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
