import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

const pages = {
  legal: {
    title: "Aviso legal",
    description: "Información sobre el titular y las condiciones de uso del sitio Value90.",
    sections: [
      ["Titular del sitio", "Value90 es un portal de consulta de estadísticas deportivas. El titular y sus datos de contacto deben configurarse antes de publicar el dominio."],
      ["Uso del sitio", "La información se ofrece con fines informativos y puede actualizarse a medida que se incorporen o revisen datos de partidos."],
    ],
  },
  privacy: {
    title: "Privacidad",
    description: "Información sobre los datos tratados al usar Value90.",
    sections: [
      ["Datos del portal", "Las páginas públicas muestran registros deportivos de jugadores, equipos, competiciones, partidos y valoraciones V90."],
      ["Acceso de administración", "Si inicia sesión para usar el panel, Supabase procesa los datos necesarios para autenticar la cuenta y mantener la sesión."],
      ["Publicidad", "Si se activa Google AdSense, Google puede tratar datos del dispositivo y señales publicitarias conforme a las opciones de consentimiento mostradas por la CMP configurada en AdSense."],
      ["Contacto y derechos", "Antes de publicar, el responsable del sitio debe añadir su identidad y un medio de contacto para consultas o solicitudes sobre datos personales."],
    ],
  },
  cookies: {
    title: "Cookies y anuncios",
    description: "Información sobre almacenamiento técnico y publicidad de Google.",
    sections: [
      ["Sesión de administración", "El acceso al panel utiliza cookies de sesión de Supabase para autenticar al usuario."],
      ["Google AdSense", "Cuando se configura el identificador de editor, se carga el código de Google AdSense en las páginas públicas. La cuenta puede administrar anuncios ancla inferiores y los mensajes de consentimiento desde AdSense."],
      ["Opciones de consentimiento", "Para usuarios del Espacio Económico Europeo, Reino Unido y Suiza, el titular debe publicar en AdSense un mensaje de normativa europea mediante una CMP certificada por Google e integrada con TCF cuando se sirvan anuncios personalizados."],
    ],
  },
} as const;

export default function PublicInformationPage({ kind }: { kind: keyof typeof pages }) {
  const page = pages[kind];
  const operator = process.env.NEXT_PUBLIC_SITE_OPERATOR;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return <div className="min-h-screen bg-slate-50 text-slate-900"><PublicHeader /><main><section className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-4xl px-4 py-5 sm:px-8 sm:py-7"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Value90</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{page.title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{page.description}</p></div></section><section className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-8 sm:py-12">{(kind === "legal" || kind === "privacy") && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Información pendiente de completar:</strong> {operator || "titular legal del sitio"}{email ? ` · ${email}` : " · correo de contacto"}. Configure estos datos antes de publicar.</div>}{page.sections.map(([heading, content]) => <article key={heading} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="font-bold">{heading}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{content}</p>{heading === "Titular del sitio" && operator && <p className="mt-2 text-sm font-semibold">{operator}{email ? ` · ${email}` : ""}</p>}{heading === "Contacto y derechos" && email && <p className="mt-2 text-sm font-semibold">{email}</p>}</article>)}</section></main><PublicFooter /></div>;
}
