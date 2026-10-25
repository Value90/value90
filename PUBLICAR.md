# Publicación de Value90 en Vercel

Value90 es una sola aplicación Next.js. La portada pública vive en `/`, las páginas públicas en `/public/...` y la administración autenticada en `/admin`. No hace falta crear un segundo proyecto de Vercel.

## Vercel y GitHub

1. En Vercel, confirma que el proyecto conectado usa el repositorio `Value90/value90`, la raíz del repositorio y el gestor npm.
2. Confirma qué rama está configurada como rama de producción.
3. Sube primero los cambios a una rama de revisión y comprueba el despliegue Preview.
4. Cuando esté revisado, integra los cambios en la rama de producción. Vercel creará el despliegue de producción automáticamente si la integración Git está activa.
5. Asigna el dominio público en Vercel y configura `NEXT_PUBLIC_SITE_URL` con la URL canónica completa, incluido `https://`.

## Variables de entorno

Configura en **Production** y, si se prueban funciones que las necesiten, también en **Preview**:

| Variable | Necesaria | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | API de la base de datos y sesión. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Acceso público de la aplicación, siempre limitado por políticas RLS de Supabase. |
| `OPENAI_API_KEY` | Solo para IA del administrador | Secreto de servidor; no debe llevar prefijo `NEXT_PUBLIC_`. |
| `OPENAI_VISION_MODEL` | No | Modelo para extracción de capturas; valor local por defecto `gpt-4o`. |
| `OPENAI_PARTICIPATION_MODEL` | No | Modelo alternativo para la importación de participaciones. |
| `NEXT_PUBLIC_SITE_URL` | Recomendable | Dominio canónico, sitemap y metadatos de producción. |
| `NEXT_PUBLIC_SITE_OPERATOR` | Antes de publicar | Nombre o razón social en páginas legales. |
| `NEXT_PUBLIC_SITE_TAX_ID` | Si corresponde | NIF/CIF del titular. |
| `NEXT_PUBLIC_SITE_ADDRESS` | Antes de publicar | Domicilio del titular. |
| `NEXT_PUBLIC_SITE_REGISTRATION` | Si corresponde | Datos del registro público. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Antes de publicar | Contacto general y de privacidad. |
| `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` | Para publicidad | ID de editor `ca-pub-...`; activa el script de AdSense y genera `ads.txt`. |
| `NEXT_PUBLIC_ADSENSE_SLOT_ID` | Para el bloque superior | ID numérico del bloque de display superior. El ancla inferior se configura en Auto ads. |

Los cambios en las variables solo llegan a un despliegue nuevo. No subas `.env.local` a GitHub.

## Comprobaciones tras el despliegue Preview

- `/` carga la portada pública y `/public` su ruta equivalente.
- `/public/jugadores`, `/public/equipos`, `/public/partidos` y `/public/rankings` cargan los datos y sus filtros.
- `/admin` y las rutas de gestión llevan a `/login` si no hay sesión.
- `/api/public` responde sin sesión; las API de administración siguen exigiendo autenticación.
- `/robots.txt` y `/sitemap.xml` son accesibles sin sesión. El sitemap usa el dominio canónico configurado.
- `/ads.txt` es accesible sin sesión. Cuando AdSense esté configurado, contiene el publisher ID correcto.
- Las páginas legales muestran los datos reales del titular, sin el aviso amarillo de información pendiente.
- En móvil y escritorio, el bloque superior no tapa el menú; el ancla inferior se controla desde AdSense.

## Dependencias pendientes de Supabase

Las páginas públicas consultan el proyecto de Supabase configurado por las variables de entorno. Si la cuenta o el proyecto no están disponibles, la lectura de datos fallará aunque el despliegue de Vercel termine correctamente. Las migraciones de equipos y de valoraciones de mercado de `database/migrations/` deben aplicarse en la base de datos antes de usar esos campos. El cálculo de mercado no producirá estimaciones hasta que existan valoraciones de la temporada.

## Estado legal y publicitario

Las páginas legales incluyen textos estándar adaptados a las funciones visibles en el código, pero su publicación requiere completar la identidad y domicilio del titular y revisar que los proveedores, plazos y prácticas descritos coincidan con las cuentas reales. No actives publicidad para tráfico del EEE, Reino Unido o Suiza hasta haber configurado en AdSense una CMP certificada por Google e integrada con TCF para los anuncios personalizados que vayas a servir. El dominio también debe estar aprobado por AdSense.
