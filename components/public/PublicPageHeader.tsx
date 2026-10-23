interface PublicPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function PublicPageHeader({
  eyebrow,
  title,
  description,
}: PublicPageHeaderProps) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">

        <div className="flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-emerald-500" />

          <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
            {eyebrow}
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-900 sm:text-3xl">
          {title}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          {description}
        </p>

      </div>
    </section>
  );
}
