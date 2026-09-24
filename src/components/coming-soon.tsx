import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

/** Página provisória das seções que ainda serão construídas. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState title="Em construção" description="Esta parte do sistema chega nas próximas etapas." />
    </div>
  );
}
