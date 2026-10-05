import { formatPhone } from "@/lib/phone";
import { isReportHeading } from "@/lib/report";
import type { PatientReportDocument } from "@/server/modules/report/report.service";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

/**
 * O prontuário completo do paciente, como fica no papel: mesmo cabeçalho e
 * estilo do relatório de uma consulta só (src/.../relatorios/[sessionId]/report-paper.tsx),
 * mas com um bloco "Sessão N" por consulta documentada, em ordem.
 */
export function PatientReportPaper({ data }: { data: PatientReportDocument }) {
  const { brand } = data;
  const contact = [brand.whatsapp ? formatPhone(brand.whatsapp) : null, brand.address].filter(Boolean).join(" · ");

  return (
    <article className="mx-auto w-full max-w-[210mm] rounded-2xl bg-white px-8 py-10 text-[#2b2720] shadow-soft ring-1 ring-foreground/5 sm:px-14 sm:py-14 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0">
      <header className="flex items-center gap-4 border-b border-[#e7e0d5] pb-6">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo enviado por cada psicóloga, de qualquer origem
          <img src={brand.logoUrl} alt="" className="size-14 object-contain" />
        ) : null}
        <div>
          <p className="font-display text-2xl leading-tight font-medium tracking-wide uppercase">{brand.name}</p>
          <p className="text-sm text-[#6b6252]">Psicóloga{brand.crp ? ` · ${brand.crp}` : ""}</p>
          {contact ? <p className="text-xs text-[#6b6252]">{contact}</p> : null}
        </div>
      </header>

      <h1 className="mt-8 text-center font-display text-xl font-medium tracking-wide uppercase">Prontuário psicológico</h1>

      <div className="mt-6 space-y-1 text-[15px] leading-relaxed">
        <p>
          <span className="font-medium">Paciente:</span> {data.patientName}
        </p>
        {data.birthDate ? (
          <p>
            <span className="font-medium">Data de nascimento:</span> {longDate(data.birthDate)}
          </p>
        ) : null}
        <p>
          <span className="font-medium">Psicóloga:</span> {brand.name}
          {brand.crp ? ` · ${brand.crp}` : ""}
        </p>
      </div>

      {data.entries.map((entry) => (
        <section key={entry.sessionNumber} className="mt-10 break-inside-avoid">
          <h2 className="border-b border-[#e7e0d5] pb-2 font-display text-base font-medium tracking-wide">
            Sessão {entry.sessionNumber} — {longDate(entry.date)}
          </h2>
          <div className="mt-4 space-y-1 text-[15px] leading-relaxed">
            {entry.content.split("\n").map((line, index) =>
              isReportHeading(line) ? (
                <h3 key={index} className="pt-4 text-xs font-semibold tracking-[0.12em] text-[#6b6252] first:pt-0">
                  {line.trim()}
                </h3>
              ) : line.trim() === "" ? (
                <div key={index} className="h-2" aria-hidden />
              ) : (
                <p key={index} className="whitespace-pre-wrap">
                  {line}
                </p>
              ),
            )}
          </div>
        </section>
      ))}

      <footer className="mt-16 flex flex-col items-center text-center text-sm break-inside-avoid">
        <p className="text-[#6b6252]">Documento gerado em {longDate(data.generatedAt)}</p>
        <div className="mt-12 w-64 border-t border-[#2b2720]/60" />
        <p className="mt-2 font-medium">{brand.name}</p>
        <p className="text-xs text-[#6b6252]">Psicóloga{brand.crp ? ` · ${brand.crp}` : ""}</p>
      </footer>
    </article>
  );
}
