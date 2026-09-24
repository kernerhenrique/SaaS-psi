import { todayInTimeZone } from "@/lib/date";
import { prisma } from "@/server/db/prisma";

/** Data de hoje (YYYY-MM-DD) no fuso horário da psicóloga. */
export async function getBusinessToday(businessId: string): Promise<string> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } });
  return todayInTimeZone(business.timezone);
}
