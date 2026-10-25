import Link from "next/link";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

type PageKind = "legal" | "privacy" | "cookies";

function InformationSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-6 text-slate-600">{children}</div>
    </article>
  );
}

export default function PublicInformationPage({ kind }: { kind: PageKind }) {
  // The owner authorized publishing this contact address. Keep other identifying
  // details private until they explicitly provide and authorize them.
  const email = "pastues@icloud.com";
  const legalIdentityIncomplete = true;

  const title = kind === "legal" ? "Aviso legal" : kind === "privacy" ? "Privacidad" : "Cookies y publicidad";
  const description = kind === "legal"
    ? "Identificación del titular y condiciones de uso de Value90."
    : kind === "privacy"
      ? "Información sobre el tratamiento de datos personales en Value90."
      : "Información sobre cookies, almacenamiento local y publicidad."

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />
      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-5 sm:px-8 sm:py-7">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Value90</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            <p className="mt-2 text-xs text-slate-500">Última actualización: 24 de octubre de 2026</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-8 sm:py-12">
          {kind !== "cookies" && legalIdentityIncomplete && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <strong>Faltan datos obligatorios del titular para publicar esta página.</strong>
              <span> El titular ha autorizado publicar solo el correo de contacto. Faltan el nombre o razón social y el domicilio profesional para completar la información exigida antes de publicar.</span>
            </div>
          )}

          {kind === "legal" && <>
            <InformationSection title="1. Titular del sitio">
              <p><strong>Titular:</strong> Información no publicada por decisión del titular.</p>
              <p><strong>Domicilio:</strong> Información no publicada por decisión del titular.</p>
              <p><strong>Correo de contacto:</strong> <a className="font-semibold text-emerald-700 underline" href={`mailto:${email}`}>{email}</a></p>
            </InformationSection>
            <InformationSection title="2. Finalidad del sitio y condiciones de uso">
              <p>Value90 ofrece información, consultas y herramientas relacionadas con el rendimiento futbolístico, incluyendo datos de jugadores, equipos, partidos y valoraciones. El usuario se compromete a utilizar el sitio de forma lícita y a no interferir con su funcionamiento, seguridad o disponibilidad.</p>
              <p>Las valoraciones y estimaciones tienen finalidad informativa y no constituyen asesoramiento profesional, una oferta de contratación ni una garantía de resultado. Los datos pueden corregirse o actualizarse.</p>
            </InformationSection>
            <InformationSection title="3. Propiedad intelectual y contenidos de terceros">
              <p>La estructura, el diseño, los textos originales, el software y los signos propios de Value90 están protegidos por la normativa aplicable. Los escudos, fotografías y otros materiales de terceros pertenecen a sus respectivos titulares y se muestran conforme a la fuente y licencia indicadas cuando corresponde.</p>
              <p>Para comunicar una posible infracción o solicitar la revisión de un dato, escribe a {email ? <a className="font-semibold text-emerald-700 underline" href={`mailto:${email}`}>{email}</a> : "la dirección de contacto pendiente de publicar"} e identifica el contenido afectado y el motivo de la solicitud.</p>
            </InformationSection>
            <InformationSection title="4. Responsabilidad y disponibilidad">
              <p>Se procura mantener el servicio y la información actualizados, pero no se garantiza la disponibilidad ininterrumpida ni la ausencia de errores. Value90 podrá corregir contenidos, realizar mantenimiento o limitar temporalmente el acceso cuando resulte necesario para proteger el servicio.</p>
            </InformationSection>
          </>}

          {kind === "privacy" && <>
            <InformationSection title="1. Responsable del tratamiento">
              <p><strong>Responsable:</strong> Información no publicada por decisión del titular.</p>
              <p><strong>Contacto para privacidad:</strong> <a className="font-semibold text-emerald-700 underline" href={`mailto:${email}`}>{email}</a></p>
              <p>El delegado de protección de datos, si fuera legalmente exigible o se hubiera designado, se identificará aquí.</p>
            </InformationSection>
            <InformationSection title="2. Datos y finalidades">
              <ul className="list-disc space-y-2 pl-5">
                <li><strong>Visita pública:</strong> las páginas muestran información deportiva y pueden recibir parámetros de búsqueda y filtros. Los proveedores de alojamiento pueden registrar datos técnicos de conexión para prestar y proteger el servicio.</li>
                <li><strong>Acceso de administración:</strong> se tratan los datos de cuenta y sesión necesarios para autenticar al personal autorizado y permitir la gestión de registros deportivos.</li>
                <li><strong>Datos deportivos:</strong> el administrador puede introducir o corregir información de jugadores, equipos, partidos, participaciones y valoraciones. Parte de esta información puede proceder de fuentes deportivas públicas.</li>
                <li><strong>Análisis asistido por IA:</strong> si el administrador solicita reconocer datos de una captura, la imagen y la información necesaria para analizarla se envían a la API de OpenAI. El resultado es una sugerencia que debe ser revisada por una persona antes de guardarse.</li>
                <li><strong>Publicidad:</strong> si se activa Google AdSense, Google y sus socios podrán tratar identificadores, datos del dispositivo y señales de consentimiento para servir y medir anuncios conforme a la configuración de la cuenta.</li>
              </ul>
            </InformationSection>
            <InformationSection title="3. Base jurídica">
              <p>La autenticación y las funciones del administrador se utilizan para prestar y proteger el servicio solicitado. La seguridad y el mantenimiento pueden basarse en el interés legítimo del responsable, tras la ponderación correspondiente. Las cookies o tecnologías publicitarias no necesarias se habilitarán conforme al consentimiento y a la normativa aplicable. Las obligaciones legales se atenderán cuando correspondan.</p>
            </InformationSection>
            <InformationSection title="4. Proveedores y transferencias">
              <p>El servicio utiliza Supabase para la base de datos y autenticación, Vercel para alojamiento y despliegue, y OpenAI para el análisis de imágenes solicitado por el administrador. Si se activa la publicidad, Google AdSense interviene como proveedor publicitario. Estos proveedores pueden tratar datos conforme a sus condiciones, contratos y ubicaciones de servicio; las transferencias internacionales y garantías aplicables deberán verificarse en la configuración contractual efectiva de cada cuenta.</p>
            </InformationSection>
            <InformationSection title="5. Conservación">
              <p>Los datos de administración y deportivos se conservan mientras sean necesarios para mantener el servicio, atender correcciones y cumplir obligaciones legales. Los registros técnicos se conservan según los periodos configurados por el proveedor de alojamiento y seguridad. Las imágenes enviadas para análisis se gestionan conforme a la configuración y condiciones aplicables al servicio de IA. Los datos se suprimirán o limitarán cuando dejen de ser necesarios, salvo conservación legal.</p>
            </InformationSection>
            <InformationSection title="6. Derechos y reclamaciones">
              <p>Puedes solicitar acceso, rectificación, supresión, limitación, oposición o portabilidad cuando proceda, y retirar el consentimiento sin afectar a tratamientos previos. Contacta con {email ? <a className="font-semibold text-emerald-700 underline" href={`mailto:${email}`}>{email}</a> : "el correo de privacidad pendiente de completar"}. También puedes reclamar ante la autoridad de protección de datos competente; en España, la <a className="font-semibold text-emerald-700 underline" href="https://www.aepd.es/" target="_blank" rel="noreferrer">Agencia Española de Protección de Datos</a>.</p>
            </InformationSection>
          </>}

          {kind === "cookies" && <>
            <InformationSection title="1. Tecnologías necesarias">
              <p>El área de administración utiliza cookies técnicas de sesión de Supabase para iniciar sesión y mantener el acceso autorizado. No se crea una cuenta de usuario para navegar por las páginas públicas.</p>
            </InformationSection>
            <InformationSection title="2. Publicidad de Google">
              <p>La publicidad permanece desactivada hasta configurar un identificador válido de editor y, para el bloque superior, un identificador de espacio publicitario. El anuncio ancla inferior se gestiona mediante Auto ads en la cuenta de AdSense.</p>
              <p>Antes de servir publicidad personalizada a usuarios del Espacio Económico Europeo, Reino Unido o Suiza, configura en AdSense una CMP certificada por Google e integrada con TCF, y publica el mensaje de consentimiento correspondiente. Google exige esa CMP para servir anuncios personalizados en esas regiones. Si no se configura, no actives los anuncios.</p>
            </InformationSection>
            <InformationSection title="3. Cómo gestionar el consentimiento">
              <p>Las opciones de consentimiento se mostrarán mediante la solución configurada en Google AdSense. Podrás modificar tu decisión desde el mensaje o los controles de privacidad que se habiliten en el sitio. También puedes bloquear o eliminar cookies desde el navegador; esto puede cerrar la sesión del administrador o limitar funciones.</p>
            </InformationSection>
            <InformationSection title="4. Más información">
              <p>La guía de cookies de la <a className="font-semibold text-emerald-700 underline" href="https://www.aepd.es/guias/guia-cookies.pdf" target="_blank" rel="noreferrer">AEPD</a> explica los requisitos generales de información y consentimiento. La configuración efectiva depende de los servicios que el titular active en producción.</p>
            </InformationSection>
          </>}

          <p className="px-1 text-xs leading-5 text-slate-500">Estas páginas describen el funcionamiento previsto en el código de Value90. El titular debe comprobar que coinciden con sus proveedores, contratos, configuraciones y prácticas reales antes de activar la web pública y la publicidad.</p>
          <div><Link href="/public" className="text-sm font-bold text-emerald-700 hover:underline">← Volver a Value90</Link></div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
