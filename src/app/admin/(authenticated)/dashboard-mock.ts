// Dados de exemplo para aprovar o visual do dashboard (Fase 1).
// Na Fase 2 este arquivo é substituído por consultas reais ao banco.

export type SessionTypeKind = "first-visit" | "return-visit";

export type TodaySession = {
  id: string;
  startTime: string;
  endTime: string;
  patientName: string;
  patientAge: number;
  guardianName: string;
  type: SessionTypeKind;
  status: "done" | "scheduled";
  paymentStatus: "paid" | "pending" | null;
};

export type PendingPayment = {
  id: string;
  patientName: string;
  guardianName: string;
  sessionDaysAgo: number;
  amountCents: number;
};

export type AwaitingReturn = {
  id: string;
  patientName: string;
  guardianName: string;
  lastSessionDaysAgo: number;
};

export type FollowUp = {
  id: string;
  patientName: string;
  text: string;
  nextSessionTime: string | null;
};

export const MOCK_TODAY_SESSIONS: TodaySession[] = [
  {
    id: "s1",
    startTime: "09:00",
    endTime: "09:50",
    patientName: "Lucas Almeida",
    patientAge: 8,
    guardianName: "Carla Almeida",
    type: "return-visit",
    status: "done",
    paymentStatus: "paid",
  },
  {
    id: "s2",
    startTime: "14:00",
    endTime: "14:50",
    patientName: "Beatriz Souza",
    patientAge: 13,
    guardianName: "Marcos Souza",
    type: "first-visit",
    status: "scheduled",
    paymentStatus: null,
  },
  {
    id: "s3",
    startTime: "16:30",
    endTime: "17:20",
    patientName: "Pedro Henrique Lima",
    patientAge: 11,
    guardianName: "Juliana Lima",
    type: "return-visit",
    status: "scheduled",
    paymentStatus: null,
  },
];

export const MOCK_PENDING_PAYMENTS: PendingPayment[] = [
  { id: "p1", patientName: "Sofia Martins", guardianName: "Renata Martins", sessionDaysAgo: 6, amountCents: 20000 },
  { id: "p2", patientName: "Gabriel Rocha", guardianName: "André Rocha", sessionDaysAgo: 4, amountCents: 25000 },
  { id: "p3", patientName: "Lucas Almeida", guardianName: "Carla Almeida", sessionDaysAgo: 1, amountCents: 20000 },
];

export const MOCK_AWAITING_RETURN: AwaitingReturn[] = [
  { id: "r1", patientName: "Helena Costa", guardianName: "Patrícia Costa", lastSessionDaysAgo: 24 },
  { id: "r2", patientName: "Miguel Ferreira", guardianName: "Fernanda Ferreira", lastSessionDaysAgo: 19 },
  { id: "r3", patientName: "Laura Nunes", guardianName: "Roberto Nunes", lastSessionDaysAgo: 15 },
];

export const MOCK_FOLLOW_UPS: FollowUp[] = [
  { id: "f1", patientName: "Pedro Henrique Lima", text: "Verificar se melhorou o sono", nextSessionTime: "16:30" },
  {
    id: "f2",
    patientName: "Pedro Henrique Lima",
    text: "Perguntar sobre a adaptação na nova escola",
    nextSessionTime: "16:30",
  },
  { id: "f3", patientName: "Sofia Martins", text: "Retomar o combinado das tarefas em casa", nextSessionTime: null },
];

export const MOCK_MONTH_RECEIVED_CENTS = 430000;
