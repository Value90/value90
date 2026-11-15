# Recuperación de Supabase: estado actual

La migración al proyecto `value90-production` se completó. El proyecto nuevo es el destino activo de la web. El proyecto antiguo debe conservarse hasta que la publicación y el acceso administrativo estén comprobados.

## Configuración local

El archivo `.env.local` contiene la configuración local activa y no debe borrarse ni compartirse. Está excluido de Git. Ya no se necesita `.env.migration.local`: ese archivo solo se utilizó para importar el volcado de recuperación y se eliminó al terminar la importación.

La configuración de producción se administra en Vercel > Project > Settings > Environment Variables. Las variables que requieren los procesos de servidor son `SUPABASE_SECRET_KEY` y `HIGHLIGHTLY_API_KEY`. Las variables públicas son `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o el nombre anterior `NEXT_PUBLIC_SUPABASE_ANON_KEY`). No se deben incluir claves secretas en variables `NEXT_PUBLIC_`.

## Sincronización de partidos

La importación de calendario y la consulta de resultado, alineaciones, minutos y estadísticas se hacen manualmente desde el administrador. Al sincronizar un partido finalizado, el sistema calcula la nota propia desde las estadísticas, actualiza la columna de valoración final y ejecuta el cálculo V90. No es necesario configurar `CRON_SECRET`, Vault ni un cron de Highlightly.

Para retirar trabajos antiguos de sincronización, ejecutar `database/setup/highlightly_cron.sql` en SQL Editor. Para confirmar que no queda ninguno, ejecutar `database/setup/verify_highlightly_cron.sql`; debe devolver `status = manual_only`. El trabajo mensual de valor de mercado no se elimina: se comprueba diariamente y solo se ejecuta el primer martes en `Europe/Madrid`.

## Archivos de importación

El volcado y los archivos auxiliares de importación fueron de uso puntual. Se conservaron las migraciones SQL y el importador como historial reproducible; no hace falta volver a ejecutar la importación ni configurar credenciales de migración para el funcionamiento normal.
