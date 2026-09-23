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
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">

        <div className="flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-emerald-500" />

          <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
            {eyebrow}
          </span>
        </div>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-900 sm:text-5xl">
          {title}
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          {description}
        </p>

      </div>
    </section>
  );
}