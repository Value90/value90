# Google AdSense

1. Añade el dominio público de Value90 a la cuenta AdSense y espera a que Google lo apruebe.
2. Configura `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-...` y `NEXT_PUBLIC_ADSENSE_SLOT_ID=...` en el entorno de producción y vuelve a desplegar. El bloque superior necesita ambos valores.
3. Activa Auto ads y configura la posición del anuncio ancla como **solo inferior** desde AdSense. La cuenta mantiene el control del formato, la posición y la activación.
4. En **Privacidad y mensajes**, publica el mensaje de normativa europea de Google para el tráfico del EEE, Reino Unido y Suiza. Google requiere una CMP certificada integrada con TCF para servir anuncios personalizados en esas regiones.
5. Comprueba `https://tu-dominio/ads.txt` y el estado del dominio en AdSense antes de dar por activa la publicidad.
6. Configura `NEXT_PUBLIC_SITE_OPERATOR` y `NEXT_PUBLIC_CONTACT_EMAIL`; completa y revisa el aviso legal y la información de privacidad y cookies antes de publicar.

El bloque superior aparece encima del menú público y se adapta al ancho disponible en móvil, tablet y escritorio. El anuncio ancla inferior de Auto ads permanece administrado desde la cuenta. El sitio no carga el script de anuncios si falta un identificador válido y un bloque.
