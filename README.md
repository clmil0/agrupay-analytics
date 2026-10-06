# AgruPay · Analítica

Panel web de la analítica de uso de AgruPay. Lee las vistas `analytics_*` de Supabase
(`supabase/sql/agrupay_analytics_v16.sql` en el repo de la app) con la sesión de Google
de un administrador. Sin sesión muestra datos de ejemplo con la misma forma.

**En vivo:** https://clmil0.github.io/agrupay-analytics/ · `?demo` fuerza los datos de ejemplo.

## Piezas

| Archivo | Qué hace |
|---|---|
| `index.html`, `styles.css` | Página y estilos (claro/oscuro, responsive). |
| `js/panel.js` | Datos de ejemplo, lectura de Supabase y armado de cada sección. |
| `js/app.js` | Estado, sesión de Google y dibujo en el DOM. |

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

La llave del panel es la **publicable**: sólo puede llamar `ingest_analytics`; leer exige una sesión
que esté en `analytics_admins`. Nunca pongas aquí la `service_role`.

## Local

```bash
python3 -m http.server 8765
```
