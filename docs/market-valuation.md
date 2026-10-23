# Estimación de mercado Value90

## Modelo V90-MV-1.0

La cifra que muestra Value90 es una **estimación orientativa propia**, no una predicción del precio de un traspaso ni una cotización externa.

1. V90 reciente: media ponderada de los hechos calculados en los últimos 30 días.
2. V90 de temporada: media ponderada de los hechos calculados en la temporada activa.
3. Nota del modelo: 60% del V90 reciente y 40% de la temporada. Si no hay valoraciones recientes, se utiliza el promedio de la temporada.
4. Referencia económica inicial: 1.000.000 € a una nota V90 de 5; cada punto multiplica o divide por 3,25. La escala sitúa una nota 10 en torno a 417 M€ con el factor de edad máximo, tomando como referencia superior el rango mundial publicado por CIES para 2026 (no como dato de entrenamiento ni equivalencia individual).
5. Ajuste por edad: curva definida en la migración, con el tramo de mayor valor entre 22 y 27 años.
6. Redondeo: múltiplos de 50.000 €, con límites de 50.000 € y 500.000.000 €.

Se conservan la valoración reciente, la de temporada, la nota combinada, los partidos incluidos, el importe anterior y el histórico de cada ejecución. La tarea automática se comprueba a diario y solo se ejecuta el primer martes del mes según la fecha de Madrid. El administrador también permite recalcular manualmente.

## Alcance y límites

El resultado usa únicamente información que Value90 ya tiene: edad, valoraciones V90, fecha/temporada y club actual. La base actual está limitada a LaLiga. El cálculo no tiene contratos, minutos internacionales, transferencias pagadas ni una muestra de otras ligas; por tanto, el valor aún no está calibrado con el mercado internacional observado. Al incorporar más ligas, la población de jugadores y sus comparaciones crecerán sin cambiar el flujo de carga.

Los modelos publicados de estimación de traspasos suelen considerar, además del rendimiento y la edad, factores como duración contractual, posición, nivel deportivo/económico del club y contexto de mercado. Value90 no dispone de todos esos datos, por lo que esta versión evita presentarse como una tasación fiable del precio de traspaso. La estimación y sus factores son visibles en el administrador para facilitar revisión.

Referencia mundial de escala (consulta 21/10/2026): [CIES Football Observatory, valores estimados](https://football-observatory.com/IMG/sites/values/?pubDate=20250727). CIES presenta rangos de estimación y documenta el uso de variables adicionales como contrato, edad, posición, rendimiento y contexto del club; Value90 no reutiliza su modelo ni sus datos individuales.

## Puesta en marcha

Aplicar `database/migrations/20261023_market_valuation.sql` en Supabase antes de desplegar el código. Después, abrir **Administrador → Mercado** y ejecutar **Actualizar estimaciones** para generar el primer conjunto. La actualización automática queda programada por `pg_cron` para el primer martes de cada mes a las 06:00–07:00 hora de Madrid.
