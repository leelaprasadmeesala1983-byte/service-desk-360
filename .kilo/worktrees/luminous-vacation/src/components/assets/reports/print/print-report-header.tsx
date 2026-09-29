import { cn } from "@/lib/utils";

export type PrintReportHeaderProps = {
  companyName?: string;
  subtitle?: string;
  reportTitle: string;
  className?: string;
};

export function PrintReportHeader({
  companyName = "MARUTHI IT SERVICES",
  subtitle = "SERVICE & REPAIR MATERIAL TRACKING SYSTEM",
  reportTitle,
  className,
}: PrintReportHeaderProps) {
  return (
    <div
      className={cn("border-b-2 border-zinc-900 pb-5 text-center", className)}
    >
      <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
        {companyName}
      </h1>
      <p className="text-xs font-semibold tracking-wider text-zinc-600 uppercase mt-0.5">
        {subtitle}
      </p>
      <div className="inline-block mt-3 px-4 py-1 rounded bg-zinc-100 text-zinc-900 font-bold text-xs tracking-wide uppercase border border-zinc-300">
        {reportTitle}
      </div>
    </div>
  );
}
