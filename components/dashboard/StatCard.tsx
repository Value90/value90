interface StatCardProps {
  title: string;
  value: string;
  compactValue?: boolean;
}

export default function StatCard({
  title,
  value,
  compactValue = false,
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow sm:p-5 md:p-6">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p
        className={
          compactValue
            ? "mt-2 break-words text-lg font-bold leading-tight sm:text-xl md:text-2xl"
            : "mt-2 break-words text-2xl font-bold sm:text-3xl"
        }
      >
        {value}
      </p>
    </div>
  );
}
