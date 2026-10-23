import Link from "next/link";

export default function PublicFooter() {
  return <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><p>Value90 · Datos de rendimiento y fútbol</p><nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Información legal"><Link href="/public/aviso-legal" className="hover:text-emerald-700">Aviso legal</Link><Link href="/public/privacidad" className="hover:text-emerald-700">Privacidad</Link><Link href="/public/cookies" className="hover:text-emerald-700">Cookies y anuncios</Link></nav></div></footer>;
}
