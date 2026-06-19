import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-8 p-6 sm:p-10">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-9 w-[250px] animate-pulse rounded-xl bg-slate-200" />
        <div className="h-5 w-[350px] animate-pulse rounded-xl bg-slate-100" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-[24px] border border-slate-200 bg-slate-50 p-6"
          >
            <div className="mb-4 h-10 w-10 rounded-2xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-1/2 rounded-lg bg-slate-200" />
              <div className="h-4 w-1/3 rounded-lg bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton (like a table or list) */}
      <div className="mt-8 flex h-[400px] w-full flex-col items-center justify-center rounded-[30px] border border-slate-200 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    </div>
  );
}
