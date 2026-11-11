# Recuperación de Supabase: estado actual

La migración al proyecto `value90-production` se completó. El proyecto nuevo es el destino activo de la web. El proyecto antiguo debe conservarse hasta que la publicación y el acceso administrativo estén comprobados.

## Configuración local

El archivo `.env.local` contiene la configuración local activa y no debe borrarse ni compartirse. Está excluido de Git. Ya no se necesita `.env.migration.local`: ese archivo solo se utilizó para importar el volcado de recuperación y se eliminó al terminar la importación.

La configuración de producción se administra en Vercel > Project > Settings > Environment Variables. Las variables que requieren los procesos de servidor son `SUPABASE_SECRET_KEY`, `HIGHLIGHTLY_API_KEY` y `CRON_SECRET`. Las variables públicas son `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o el nombre anterior `NEXT_PUBLIC_SUPABASE_ANON_KEY`). No se deben incluir claves secretas en variables `NEXT_PUBLIC_`.

## Sincronización programada

En Supabase Vault deben existir `value90_app_url` (URL base de producción de Vercel) y `value90_sports_cron_secret` (el mismo valor privado de `CRON_SECRET` en Vercel). El trabajo se crea o actualiza ejecutando `database/setup/highlightly_cron.sql` en SQL Editor. El cron sondea cada minuto y el endpoint usa la hora `Europe/Madrid` para ejecutar sincronizaciones solo en las ventanas configuradas: LaLiga viernes y lunes 23:15, sábado y domingo 16:15, 18:30, 20:45 y 23:15; Champions martes y miércoles 21:00 y 23:15. Si no hay partidos importados pendientes de la competición, no llama a Highlightly. Cada ventana permanece abierta 15 minutos y procesa como máximo un partido por minuto.

El cron da hasta 120 segundos a cada petición para permitir obtener marcador, alineaciones y box score sin cortar una sincronización que use varias llamadas. Para comprobar configuración y plazo sin mostrar secretos, ejecutar `database/setup/verify_highlightly_cron.sql`; debe devolver `status = ready` y `request_timeout_configured = true`.

Si el resultado es `not_ready`, revisar que el trabajo `value90-highlightly-match-sync` esté activo y que ambas entradas de Vault tengan valores. La consulta de verificación informa el estado de cada secreto, pero nunca su contenido.

## Archivos de importación

El volcado y los archivos auxiliares de importación fueron de uso puntual. Se conservaron las migraciones SQL y el importador como historial reproducible; no hace falta volver a ejecutar la importación ni configurar credenciales de migración para el funcionamiento normal.
