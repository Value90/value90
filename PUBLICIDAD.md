# Google AdSense

## Datos que hay que obtener de la cuenta

- **ID de editor** (`ca-pub-...`): AdSense → Cuenta → Información de la cuenta.
- **ID de unidad publicitaria** (solo números): la unidad de display superior que se cree en Anuncios → Por bloque de anuncios.
- **Dominio de producción** (por ejemplo, `https://www.ejemplo.com` o el dominio `*.vercel.app` que se vaya a usar): se añade en AdSense → Sitios y debe quedar aprobado antes de servir anuncios.
- **Auto ads**: activar el formato de ancla y elegir posición inferior. No hace falta otro ID de bloque para el ancla inferior.
- **Privacidad y mensajes**: publicar un mensaje europeo y comprobar la CMP que atenderá a usuarios del EEE, Reino Unido y Suiza. Para anuncios personalizados en esas regiones, Google exige una CMP certificada por Google e integrada con TCF.

No hace falta compartir contraseña, clave secreta ni acceso a la cuenta de Google. El ID de editor y el ID de bloque no son credenciales privadas, pero conviene añadirlos directamente en Vercel.

## Configuración en Vercel

En Settings → Environment Variables, para Production añade:

```text
NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-1234567890123456
NEXT_PUBLIC_ADSENSE_SLOT_ID=1234567890
```

El bloque superior necesita ambos IDs. Si solo se configura el ID de editor, se carga el script de AdSense para Auto ads, pero no se renderiza el bloque superior. Cambiar variables requiere un nuevo despliegue.

El bloque superior es adaptable a móvil, tablet y escritorio. El anuncio ancla inferior se administra desde Auto ads de la cuenta. El script solo se carga cuando hay un ID de editor válido.

## Comprobación antes de activar

1. Publica el sitio y añádelo en AdSense → Sitios.
2. Espera a que el estado sea **Listo**; Google no sirve anuncios antes de aprobar el sitio.
3. Comprueba que `https://TU_DOMINIO/ads.txt` responde públicamente y contiene la línea con tu publisher ID. El archivo se genera a partir de la variable de entorno.
4. Revisa el mensaje de consentimiento europeo desde móvil y escritorio antes de activar anuncios personalizados.
5. Comprueba que el espacio superior no altera el menú y que el ancla inferior aparece solo en la ubicación elegida.

El estado del sitio y de `ads.txt` puede tardar en actualizarse en AdSense tras su rastreo.
