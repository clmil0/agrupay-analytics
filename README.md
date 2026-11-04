# AlTanto Analytics

Panel web de la analítica de uso de AlTanto. Lee las vistas `analytics_*` de Supabase
(`supabase/sql/agrupay_analytics_v16.sql` y, para Comercios, la hoja de clasificar y Suscripciones,
`agrupay_analytics_v21_merchants.sql`, ambos en el repo de la app) con la sesión de Google
de un administrador. Sin sesión muestra datos de ejemplo con la misma forma.

**En vivo:** https://clmil0.github.io/agrupay-analytics/ · `?demo` fuerza los datos de ejemplo.

## Piezas

| Archivo | Qué hace |
|---|---|
| `index.html`, `styles.css` | Página y estilos (claro/oscuro, responsive). |
| `js/panel.js` | Datos de ejemplo, lectura de Supabase y armado de cada sección. |
| `js/app.js` | Estado, sesión de Google y dibujo en el DOM (escritorio ≥ 900 px; debajo, app de iPhone con pestañas). |
| `sql/altanto_analytics_v22_testers.sql` | Testers, audiencia y las vistas por persona de Hipótesis y Testers. |
| `manifest.webmanifest`, `icons/` | Ícono del panel, de la pestaña del navegador y de «Añadir a inicio». |

Sin dependencias ni compilación: GitHub Pages sirve la rama `main` tal cual.

## Conexión con Supabase

Proyecto propio de analítica: `Agrupay_Analytics` (`https://zxfeixwrruclypwjuhnl.supabase.co`),
separado de la base de la app.

1. **Authentication › URL Configuration › Redirect URLs** (o `scripts/supabase-redirect.sh`): agrega
   `https://clmil0.github.io/agrupay-analytics/` (y `http://localhost:8765/` para probar en local).
   Si falta, Google vuelve al *Site URL* del proyecto en lugar del panel.
2. Hazte administrador (editor SQL):
   ```sql
   insert into public.analytics_admins (user_id)
   select id from auth.users where email = 'tu-correo@gmail.com';
   ```
   La cuenta tiene que haber entrado al panel al menos una vez para existir en `auth.users`.

3. Corre [`sql/altanto_analytics_v22_testers.sql`](sql/altanto_analytics_v22_testers.sql) (después de v16 y v21) para
   Hipótesis, Testers y el filtro de audiencia.

La llave del panel es la **publicable**: sólo puede llamar `ingest_analytics`; leer exige una sesión
que esté en `analytics_admins`. Nunca pongas aquí la `service_role`.

## Testers e hipótesis (v22)

- **Testers**: marca cada instalación como tester y guarda su alias, grupo, día 1 de la prueba, perfil
  (edad, género, iPhone, user persona) y lo que respondió en la encuesta o la entrevista. Queda en la
  tabla `analytics_testers`. Cada tester encuentra el inicio de su ID en la app, en Configuración ›
  Ayuda › «Enviar estadísticas ahora». Usa un alias, no el nombre completo.
- **Audiencia** (Todos · Testers · No testers): el panel manda el encabezado `x-audience` y
  `analytics_ev`, de la que salen todas las vistas, se queda sólo con esa audiencia. Así cada sección
  se puede ver por separado.
- **Rango**: Hoy, 7, 30 o 90 días, o «Fechas» con desde y hasta dentro de los 90 días cargados.
- **Hipótesis**: cada una contra su meta, con el desglose por user persona, género, edad o iPhone, el
  detalle persona por persona, su avance día a día y un mapa de las sesiones de cada tester del día 1
  al 14. Se miden al último día del rango; quien no llegó a su día 14 cuenta como «en curso». Las
  metas y definiciones están en `HYP`, en `js/panel.js`.

## Local

```bash
python3 -m http.server 8765
```
