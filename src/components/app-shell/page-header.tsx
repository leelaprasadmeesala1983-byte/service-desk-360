type PageHeaderProps = {
  title: string;
  count?: number;
  badge?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
};

function PageHeader({
  title,
  count,
  badge,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex flex-col">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-foreground text-xl font-extrabold sm:text-2xl">
            {title}
          </h1>
          {count !== undefined && count > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              {count}
            </span>
          )}
          {badge}
        </div>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export { PageHeader };
