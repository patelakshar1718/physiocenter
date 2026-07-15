import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {action}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="text-center text-sm text-muted-foreground py-14">{message}</div>;
}

export function StatTile({
  label,
  value,
  badge,
  className,
}: {
  label: string;
  value: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm", className)}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {badge}
      </div>
    </div>
  );
}
