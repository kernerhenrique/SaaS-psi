"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import {
  ArrowLeft,
  CalendarPlus,
  ClipboardList,
  HeartPulse,
  MessageCircle,
  Pencil,
  Repeat,
  Sparkles,
  Star,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { FadeIn } from "@/components/fade-in";
import { PatientAvatar } from "@/components/patient-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { formatFullDate } from "@/lib/date";
import { buildWhatsAppLink } from "@/lib/message-template";
import { formatPhone } from "@/lib/phone";
import type { PatientRecord } from "@/server/modules/patient/patient.service";

import { PatientFormDialog } from "../patient-form-dialog";
import { FollowUpsPanel } from "./follow-ups-panel";
import { ParentNotesPanel } from "./parent-notes-panel";
import { PaymentsPanel } from "./payments-panel";
import { SessionNotesList } from "./session-note-card";

export function PatientRecordView({
  record,
  today,
  aiEnabled,
}: {
  record: PatientRecord;
  today: string;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const firstVisitSessions = record.sessions.filter((s) => s.isFirstVisit);
  const returnSessions = record.sessions.filter((s) => !s.isFirstVisit);
  const openFollowUps = record.followUps.filter((f) => !f.doneAt).length;

  return (
    <div className="space-y-8">
      <FadeIn className="space-y-5">
        <Link
          href="/admin/pacientes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Pacientes
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <PatientAvatar name={record.fullName} size="lg" />
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{record.fullName}</h1>
              <p className="text-sm text-muted-foreground">
                {record.age !== null && record.birthDate
                  ? `${record.age} anos · nasceu em ${formatFullDate(record.birthDate)}`
                  : "Data de nascimento não informada"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PatientFormDialog
              patientId={record.id}
              initialValues={record}
              onSaved={refresh}
              trigger={
                <Button variant="outline" className="h-10 rounded-xl px-4">
                  <Pencil />
                  Editar dados
                </Button>
              }
            />
            <Link
              href={`/admin/agenda?nova=1&paciente=${record.id}`}
              className={cn(buttonVariants(), "h-10 rounded-xl px-4")}
            >
              <CalendarPlus />
              Marcar consulta
            </Link>
          </div>
        </div>

        {record.guardians.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {record.guardians.map((g) => (
              <div
                key={g.id}
                className="inline-flex items-center gap-2 rounded-full bg-card py-1 pr-1 pl-3 text-sm shadow-soft ring-1 ring-foreground/5"
              >
                {g.isPrimary ? <Star className="size-3.5 fill-current text-tone-honey-foreground" /> : null}
                <span>
                  <span className="text-muted-foreground">{g.relationship}:</span> {g.name}
                </span>
                {g.phone ? (
                  <a
                    href={buildWhatsAppLink(g.phone, "")}
                    target="_blank"
                    rel="noreferrer"
                    title={`Abrir conversa no WhatsApp: ${formatPhone(g.phone)}`}
                    className="inline-flex size-7 items-center justify-center rounded-full bg-tone-sage text-tone-sage-foreground transition hover:brightness-95"
                  >
                    <MessageCircle className="size-3.5" />
                    <span className="sr-only">WhatsApp de {g.name}</span>
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </FadeIn>

      <FadeIn delay={0.05}>
        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTab value="dados">
              <UserRound />
              Dados
            </TabsTab>
            <TabsTab value="pais">
              <Users />
              Contato com os pais
            </TabsTab>
            <TabsTab value="primeira">
              <ClipboardList />
              Primeira consulta
            </TabsTab>
            <TabsTab value="retornos">
              <Repeat />
              Retornos{returnSessions.length ? ` (${returnSessions.length})` : ""}
            </TabsTab>
            <TabsTab value="destaques">
              <Sparkles />
              Para acompanhar{openFollowUps ? ` (${openFollowUps})` : ""}
            </TabsTab>
            <TabsTab value="pagamentos">
              <Wallet />
              Pagamentos
            </TabsTab>
          </TabsList>

          <TabsPanel value="dados">
            <div className="grid gap-4 lg:grid-cols-2">
              <InfoCard icon={<HeartPulse className="size-4" />} title="Informações importantes de saúde">
                {record.healthInfo ?? "Nada registrado. Use “Editar dados” para incluir alergias, medicamentos ou diagnósticos."}
              </InfoCard>
              <InfoCard icon={<UserRound className="size-4" />} title="Outras observações">
                {record.notes ?? "Nada registrado."}
              </InfoCard>
              <InfoCard icon={<Users className="size-4" />} title="Responsáveis" className="lg:col-span-2">
                {record.guardians.length === 0 ? (
                  "Nenhum responsável cadastrado."
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {record.guardians.map((g) => (
                      <li key={g.id} className="rounded-xl bg-muted/60 p-3">
                        <p className="font-medium text-foreground">
                          {g.name} <span className="font-normal text-muted-foreground">· {g.relationship}</span>
                        </p>
                        <p className="text-xs">
                          {g.phone ? formatPhone(g.phone) : "Sem telefone"}
                          {g.email ? ` · ${g.email}` : ""}
                        </p>
                        {g.isPrimary ? <p className="mt-1 text-xs text-tone-honey-foreground">Recebe as mensagens</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </InfoCard>
              <p className="text-xs text-muted-foreground lg:col-span-2">
                Paciente cadastrado em {formatFullDate(record.createdAt.slice(0, 10))}.
              </p>
            </div>
          </TabsPanel>

          <TabsPanel value="pais">
            <ParentNotesPanel patientId={record.id} notes={record.parentNotes} today={today} onChanged={refresh} />
          </TabsPanel>

          <TabsPanel value="primeira">
            <SessionNotesList
              sessions={firstVisitSessions}
              patientId={record.id}
              today={today}
              aiEnabled={aiEnabled}
              onChanged={refresh}
              emptyText="A primeira consulta ainda não foi marcada. Quando você marcar na agenda, as anotações aparecem aqui."
            />
          </TabsPanel>

          <TabsPanel value="retornos">
            <SessionNotesList
              sessions={returnSessions}
              patientId={record.id}
              today={today}
              aiEnabled={aiEnabled}
              onChanged={refresh}
              emptyText="Nenhuma consulta de retorno ainda."
            />
          </TabsPanel>

          <TabsPanel value="destaques">
            <FollowUpsPanel patientId={record.id} items={record.followUps} onChanged={refresh} />
          </TabsPanel>

          <TabsPanel value="pagamentos">
            <PaymentsPanel patientId={record.id} sessions={record.sessions} />
          </TabsPanel>
        </Tabs>
      </FadeIn>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  className,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/5 ${className ?? ""}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h2>
      <div className="text-sm whitespace-pre-line text-muted-foreground">{children}</div>
    </section>
  );
}
