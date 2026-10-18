import { cn } from "@/lib/utils";

export type PrintReportHeaderProps = {
  reportTitle: string;
  /** Document number shown top-right. */
  refId?: string;
  /** Pre-formatted date shown under the document number. */
  date?: string;
  className?: string;
};

export function PrintReportHeader({
  reportTitle,
  refId,
  date,
  className,
}: PrintReportHeaderProps) {
  return (
    <div className={cn("pb-1", className)}>
      <div className="flex items-start justify-between gap-4">
        {/* biome-ignore lint/performance/noImgElement: static logo, also used in print */}
        <img
          src="/maruthi-logo.png"
          alt="MARUTHI IT SERVICES"
          className="h-20 w-auto rounded bg-white -ml-2"
        />
        <div className="text-right text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {refId ? (
            <div className="font-mono text-[13px] font-extrabold text-zinc-900 dark:text-zinc-100">
              {refId}
            </div>
          ) : null}
          {date ? <div>{date}</div> : null}
        </div>
      </div>
      <div className="mt-2 h-[3px] bg-blue-600" />
      <h1 className="mt-5 text-center text-[17px] font-extrabold tracking-[0.14em] text-zinc-900 uppercase dark:text-zinc-100">
        {reportTitle}
      </h1>
    </div>
  );
}
