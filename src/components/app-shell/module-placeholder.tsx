import { Construction } from "lucide-react";

import { PageHeader } from "./page-header";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  /** What the finished screen will contain, so the gap is explicit. */
  planned: string[];
};

function ModulePlaceholder({
  title,
  description,
  planned,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title={title} description={description} />

      <div className="border-border bg-card rounded-xl border p-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
          <Construction className="size-4" />
          Not built yet
        </div>
        <ul className="text-muted-foreground mt-3 list-inside list-disc space-y-1 text-sm">
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export { ModulePlaceholder };
