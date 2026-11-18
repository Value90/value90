# Recuperación de Supabase: estado actual

La migración al proyecto `value90-production` se completó. El proyecto nuevo es el destino activo de la web. El proyecto antiguo debe conservarse hasta que la publicación y el acceso administrativo estén comprobados.

## Configuración local

El archivo `.env.local` contiene la configuración local activa y no debe borrarse ni compartirse. Está excluido de Git. Ya no se necesita `.env.migration.local`: ese archivo solo se utilizó para importar el volcado de recuperación y se eliminó al terminar la importación.

La configuración de producción se administra en Vercel > Project > Settings > Environment Variables. Las variables que requieren los procesos de servidor son `SUPABASE_SECRET_KEY` y `HIGHLIGHTLY_API_KEY`. Las variables públicas son `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o el nombre anterior `NEXT_PUBLIC_SUPABASE_ANON_KEY`). No se deben incluir claves secretas en variables `NEXT_PUBLIC_`.

## Sincronización de partidos

La consulta automática de resultado, alineaciones, minutos y estadísticas está disponible para LaLiga, Premier League y Champions League. Se programa para dos horas después del inicio del partido. Si Highlightly aún no ha publicado datos importables, el sistema reintenta cada 30 minutos hasta un máximo de cinco llamadas automáticas por partido. El cron de Supabase consulta los vencimientos cada cinco minutos; no consume llamadas a Highlightly si no hay partidos pendientes.

Para activarlo en el proyecto nuevo, guardar en Supabase Vault los secretos `value90_app_url` (`https://www.value90.es`) y `value90_cron_secret` (el mismo valor que `CRON_SECRET` en Vercel Production), y ejecutar `database/setup/highlightly_automatic_sync.sql` en SQL Editor. `database/setup/verify_highlightly_cron.sql` debe mostrar `status = automatic_sync_ready`. El cron mensual de valor de mercado se mantiene independiente.

## Archivos de importación

El volcado y los archivos auxiliares de importación fueron de uso puntual. Se conservaron las migraciones SQL y el importador como historial reproducible; no hace falta volver a ejecutar la importación ni configurar credenciales de migración para el funcionamiento normal.
