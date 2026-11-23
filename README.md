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
| `sql/altanto_analytics_v25_bitacora.sql` | Bitácora: hitos que anota el equipo y versiones de la app detectadas solas. |
| `js/guide.js` | La guía del «?»: para qué sirve cada sección y qué significa cada número. |
| `sql/altanto_analytics_v24_personas.sql` | Filtro por personas elegidas (ID o correo) en todas las secciones. |
| `sql/altanto_analytics_v26_rendimiento.sql` | Caché incremental: el panel carga en una llamada y Supabase procesa sólo los eventos nuevos. |
| `sql/altanto_analytics_v23_comercios.sql` | Cadenas de comercios, comercios por persona (Monitoreo de comercios) y el correo de entrada en el perfil. |
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
4. Corre [`sql/altanto_analytics_v23_comercios.sql`](sql/altanto_analytics_v23_comercios.sql) (después de v22) para
   Monitoreo de comercios y el correo de cada instalación.
5. Corre [`sql/altanto_analytics_v24_personas.sql`](sql/altanto_analytics_v24_personas.sql) para filtrar por personas
   elegidas.
6. Corre [`sql/altanto_analytics_v25_bitacora.sql`](sql/altanto_analytics_v25_bitacora.sql) para la Bitácora.
7. Corre [`sql/altanto_analytics_v26_rendimiento.sql`](sql/altanto_analytics_v26_rendimiento.sql) para que el panel
   cargue rápido (caché incremental). Sin ella el panel funciona igual, leyendo vista por vista.
   Si vuelves a correr v22, corre v26 otra vez después: v22 rehace `analytics_ev` con el filtro lento.

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
- **Rango**: Hoy, 7, 30 o 90 días, o desde y hasta exactos dentro de los 90 días cargados. Las flechas
  mueven el rango entero hacia atrás o adelante.
- **Personas**: «Elegir personas» filtra todas las secciones por una o varias instalaciones, buscadas por
  ID, correo, alias o user persona (se puede pegar una lista). Manda sobre Testers / No testers.
- **Menú**: en computadora, un menú lateral con las secciones agrupadas (se achica a sólo íconos con
  «Achicar menú»; en pantallas medianas empieza achicado) y un buscador de secciones con Ctrl K. En el
  celular, las secciones agrupadas están en «Más».
- **Hipótesis**: cada una contra su meta, con el desglose por user persona, género, edad o iPhone, el
  detalle persona por persona, su avance día a día y un mapa de las sesiones de cada tester del día 1
  al 14. Se miden al último día del rango; quien no llegó a su día 14 cuenta como «en curso». Las
  metas y definiciones están en `HYP`, en `js/panel.js`.

## Rendimiento (v26)

Antes, cada visita pedía ~58 vistas y cada una recorría todos los eventos desde cero. Ahora:

- **Caché incremental** (`analytics_cache`): el resultado de cada vista, ya calculado para Todos,
  Testers y No testers. `analytics_refresh()` mira sólo los eventos que llegaron desde la última vez
  (`received_at`) y recalcula sólo los días a los que pertenecen. Las vistas de «últimos 30 días» y
  las cohortes se rehacen enteras como mucho cada 15 minutos. pg_cron la corre cada 5 minutos y el
  panel también al abrir y al tocar Actualizar.
- **Una llamada**: `analytics_dashboard(aud)` devuelve todo el panel. El panel muestra primero lo
  último guardado en el navegador (IndexedDB, se borra al cerrar sesión) y luego lo pone al día.
- **Testers y cadenas**: al cambiar `analytics_testers` o `analytics_merchant_chains`, la próxima
  actualización rehace lo que depende de ellos.
- **Personas elegidas** siguen leyendo las vistas en vivo (no se pueden precalcular), pero
  `analytics_ev` ahora filtra la audiencia una vez por consulta y no una vez por evento.
- **Vista nueva**: créala como siempre, agrégala a `analytics_cache_views` (modo `inc` si cada fila
  depende sólo de los eventos de su día/semana/mes; `full` si depende de «hoy» o de toda la historia)
  y corre `select analytics_refresh(true);`. Para ver el estado: `select * from analytics_cache_state;`.

## Bitácora (v25) y guía

- **Bitácora**: calendario y línea de tiempo de lo que hace el equipo. Los hitos se anotan desde el panel
  (tabla `analytics_milestones`, sólo administradores) con tipo, fechas, grupo, versión, enlace y notas.
  Solos aparecen: cada versión de la app (primer día en TestFlight o App Store, vista
  `analytics_app_releases`) y el inicio y el día 14 de cada grupo de testers. Cada hito muestra
  «antes → después»: DAU y % de clasificación automática la semana previa contra la semana desde ese día.
- **Guía**: el «?» junto al título abre para qué sirve la sección, cómo leerla y qué significa cada
  número, con buscador en todo el glosario. Los KPI muestran su definición al pasar el cursor. El texto
  vive en `js/guide.js`.

## Monitoreo de comercios (v23)

- **Cadenas**: el banco escribe el mismo comercio de muchas formas («037 PVEA JOCKEY», «048 PVEA
  HIGUERETA»…). `analytics_merchant_chain` quita el número de tienda y el procesador («PAG*», «PYU*»…) y
  busca la cadena en la tabla `analytics_merchant_chains` (patrón → cadena). Si una cadena sale partida o
  mal unida, agrega o corrige un patrón ahí: el panel lo toma al actualizar.
- **Alertas**: cadenas a las que la gente les corrige la categoría que puso el motor. Alta: 2 personas o
  más y 20 % o más corregidas; Media: 10 % o más; Vigilar: el resto. Cada una abre el detalle persona por
  persona, con correo, si es tester y cómo la movió.
- **Candidatos para el directorio**: cadenas que llegan sin categoría y que la gente clasifica casi
  siempre igual.
- Sin pagos a personas (Yape, Plin, transferencias) ni retiros. El correo de entrada (`login_email`) sólo
  llega desde las versiones nuevas de la app y sólo lo ven los administradores.

## Local

```bash
python3 -m http.server 8765
```
