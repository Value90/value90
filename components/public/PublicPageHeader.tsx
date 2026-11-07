import type { ReactNode } from "react";

interface PublicPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export default function PublicPageHeader({
  eyebrow,
  title,
  description,
  children,
}: PublicPageHeaderProps) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-8 sm:py-5 lg:px-10 lg:py-6">

        <div className={children ? "grid gap-4 lg:grid-cols-[minmax(15rem,0.9fr)_minmax(0,1.8fr)] lg:items-center lg:gap-8" : ""}>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-emerald-500" />

              <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
                {eyebrow}
              </span>
            </div>

            <h1 className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-slate-900 sm:text-3xl">
              {title}
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-500">
              {description}
            </p>
          </div>

          {children && <div className="min-w-0 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">{children}</div>}
        </div>

      </div>
    </section>
  );
}
