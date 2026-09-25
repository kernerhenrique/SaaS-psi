import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NotFoundError } from "@/server/errors";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getReportPageData, type ReportPageData } from "@/server/modules/report/report.service";

import { ReportEditor } from "./report-editor";

export const metadata: Metadata = { title: "Relatório" };

export default async function ReportPage({ params }: PageProps<"/admin/relatorios/[sessionId]">) {
  const session = await requireAdminSession();
  const { sessionId } = await params;

  let data: ReportPageData;
  try {
    data = await getReportPageData(session.businessId, sessionId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return <ReportEditor data={data} />;
}
