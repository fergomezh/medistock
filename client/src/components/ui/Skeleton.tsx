export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-100 dark:bg-slate-700 rounded-full w-3/4" />
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-16" />
        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-20" />
      </div>
      <div className="h-px bg-slate-50 dark:bg-slate-700 w-full" />
      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full w-1/3" />
    </div>
  )
}

export function SkeletonDoseRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 animate-pulse">
      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-slate-100 dark:bg-slate-700 rounded-full w-1/2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full w-1/3" />
      </div>
      <div className="h-7 w-14 bg-slate-100 dark:bg-slate-700 rounded-lg" />
    </div>
  )
}
