# E45 — Nuevas implementaciones (24/09/2026)

Pedido del usuario (6 puntos) y **decisiones tomadas con él** en preguntas de opción múltiple antes de implementar.
Este documento es el hilo conductor: plan, decisiones, modelo de datos, endpoints, pantallas y estado de avance.
Al terminar se resume en `CLAUDE.md` (E45) y `docs/ESTADO_ACTUAL.md`.

---

## 1. Decisiones del usuario

| # | Tema | Decisión |
|---|---|---|
| 1 | Control por convocatoria | **Rol nuevo "Admin de convocatoria"** (`admin_convocatoria`, id 5). Mismas pantallas del admin pero **solo sus convocatorias asignadas**. **Opera todo el flujo** (revisar, observar, asignar evaluadores, convenios, ministraciones, informes, publicar folios, chat). **No** crea/borra convocatorias ni edita programas, usuarios, carrusel, bitácora global ni configuración |
| 1+5 | Combinación | Sus convocatorias **filtradas** por sus periodos (intersección) si tiene periodos |
| 1 | Evaluadores asignables | **Todos los evaluadores activos** (solo nombre y foto) |
| 2 | Buzón con chat | **Hilos por tema** (asunto + categoría sugerencia/duda/problema, estado abierto/resuelto), chat en tiempo real, **solo texto** |
| 2 | Participantes | **Solicitantes** abren hilos con el admin de la convocatoria donde tienen solicitud; el **admin general también ve y responde** |
| 2 | Avisos | **Tiempo real (Reverb) + campana**, y **correo si sigue sin leerse a los 30 min** |
| 3 | Perfil | **Todos los roles** tienen "Mi cuenta" con foto y portada (referencia visual: portada ancha, avatar circular superpuesto, nombre grande, píldora, estado, indicadores; tarjetas "Editar tu perfil" y "Datos de tu cuenta") |
| 3 | Foto en todo el sistema | Barra, menú, listas, seguimiento, chat, bitácora, fichas de folio/usuario |
| 3 | Ficha completa (foto, portada, datos) | **Según alcance**: admin todo; admin de convocatoria, revisor, evaluador y consulta solo usuarios con solicitudes en su alcance; solicitante la suya. **Datos bancarios completos solo admin y admin de convocatoria** (enmascarados para los demás) |
| 3 | Fotos | Hasta **5 MB**, JPG/PNG/WebP, **se convierten a WebP** en el servidor para ahorrar espacio |
| 4 | Aprobados / no aprobados | **Por dictamen**: aprobado = `aprobada, convenio, ministracion, seguimiento, cerrada`; no aprobado = `rechazada, cancelada`; en proceso = el resto |
| 4 | Publicación en landing | **Por convocatoria, con confirmación** (revisa la lista y confirma; se puede despublicar; aprobados posteriores requieren volver a publicar) |
| 4 | Quién publica | **Admin general y admin de convocatoria** (este, solo las suyas) |
| 4 | Qué se ve en la landing | **Solo el folio**, agrupado por convocatoria. Confeti cada vez que se entra o regresa a la sección |
| 5 | Periodo | **Campo nuevo "Periodo" en el alta de la convocatoria** (catálogo administrado por el admin) |
| 5 | A quién aplica | Admin de convocatoria, revisores, evaluadores y **perfil nuevo "Consulta"** (`consulta`, id 6) |
| 5 | Sin periodos asignados | Revisor/evaluador: **ven todo** hasta que se les asigne. Consulta: **no ve nada** hasta que se le asigne. Admin de convocatoria: solo sus convocatorias |
| 5 | Consulta ve (solo lectura) | Dashboard e indicadores, solicitudes y fichas de folio, histórico de aprobados/no aprobados, reportes/Excel |
| 6 | Tipos por campo de archivo | PDF, imágenes (JPG/PNG/WebP), Word/Excel (DOCX/XLSX, sin macros), ZIP |
| 6 | Tamaño | El admin elige **1 a 20 MB** por campo |
| 6 | Alcance | Documentos de cada programa **y también los fijos** (carta compromiso, carátula bancaria, constancia fiscal, factura, informe final) |

---

## 2. Modelo de datos (migraciones)

| Tabla / columna | Para |
|---|---|
| `roles` + `admin_convocatoria` (5) y `consulta` (6); `config/comecyt.php` `roles.*` | Puntos 1 y 5 |
| `periodos` (`nombre`, `fecha_inicio`, `fecha_fin`, `activo`) | Punto 5 |
| `convocatorias.periodo_id` (FK nullable) | Punto 5 |
| `convocatoria_user` (pivote: admin de convocatoria ↔ convocatorias) | Punto 1 |
| `periodo_user` (pivote: usuario ↔ periodos visibles) | Punto 5 |
| `users.avatar_path`, `users.banner_path` (nombres aleatorios `.webp`, disco privado) | Punto 3 |
| `solicitud_historial` (`solicitud_id`, `estado_anterior`, `estado_nuevo`, `user_id`, `motivo`, `created_at`) — se llena solo desde el modelo `Solicitud` | Punto 4 (seguimiento) |
| `folios_publicados` (`convocatoria_id`, `solicitud_id`, `folio`, `publicado_por`, `publicado_at`) — instantánea de lo confirmado | Punto 4 |
| `conversaciones` (`convocatoria_id`, `solicitante_id`, `asunto`, `categoria`, `estado`, `ultimo_mensaje_at`, `resuelta_por`, `resuelta_at`) | Punto 2 |
| `conversacion_mensajes` (`conversacion_id`, `user_id`, `cuerpo`, `leido_at`) | Punto 2 |
| `programa_documentos.formato_permitido` → lista de tipos (`pdf,imagen,office,zip`); `tamaño_maximo_mb` 1–20 | Punto 6 |
| `documentos_fijos_config` (`clave`, `etiqueta`, `formatos`, `tamano_maximo_mb`) | Punto 6 |

## 3. Alcance (una sola regla, `App\Support\Alcance`)

`Alcance::convocatoriaIds(User)` devuelve `null` (sin restricción) o la lista de convocatorias visibles:

| Rol | Resultado |
|---|---|
| admin | `null` |
| admin_convocatoria | sus convocatorias ∩ (convocatorias de sus periodos, si tiene) — vacío si no tiene |
| revisor, evaluador | convocatorias de sus periodos — `null` si no tiene periodos |
| consulta | convocatorias de sus periodos — **vacío** si no tiene |

Todo listado y todo acceso a un registro (solicitud, convenio, ministración, informe, asignación, hilo, ficha) pasa
por esa regla. Nunca filtrar solo en el front.

## 4. Autorización por ruta

- **Solo admin:** programas, crear/editar/borrar convocatorias, prórroga, banners, usuarios, empresas (escritura),
  categorías, lista negra, carrusel, solicitudes de acceso, recuperación de contraseñas, bitácora, Reverb, **periodos**,
  **documentos fijos**.
- **Admin + admin de convocatoria (con alcance):** dashboard, convocatorias (lectura), solicitudes y sus transiciones,
  convenios, ministraciones, informes, asignación de evaluadores, Excel, histórico de folios, publicar folios, buzón.
- **Consulta (solo GET, con alcance):** dashboard, convocatorias (lectura), solicitudes y fichas, histórico, Excel.
- El front reutiliza las pantallas `/admin/*` para estos dos roles (menú filtrado y acciones ocultas); `proxy.ts`
  les abre solo las rutas permitidas.

## 5. Endpoints nuevos (resumen; detalle al implementar)

- Perfil: `GET/PUT /api/mi-perfil`, `POST/DELETE /api/mi-perfil/avatar|banner`, `GET /api/media/perfil/{archivo}`,
  `GET /api/perfiles/{user}` (ficha con alcance).
- Periodos: CRUD `/api/admin/periodos`. Asignaciones en `POST/PUT /api/admin/usuarios` (`convocatoria_ids`, `periodo_ids`).
- Folios: `GET /api/admin/folios` (histórico con filtros), `GET /api/admin/solicitudes/{id}/historial`,
  `GET|POST|DELETE /api/admin/convocatorias/{id}/folios-publicados`, público `GET /api/folios-aprobados`.
- Buzón: `GET/POST /api/buzon`, `GET /api/buzon/{hilo}`, `POST /api/buzon/{hilo}/mensajes`,
  `POST /api/buzon/{hilo}/leer`, `POST /api/buzon/{hilo}/resolver|reabrir`; canal privado `conversacion.{id}`.
- Archivos: `GET/PUT /api/admin/documentos-fijos`, `GET /api/config/documentos-fijos`.

## 6. Seguridad (regla §0 de CLAUDE.md)

Alcance en backend para todo; fotos con MIME real, dimensiones, re-codificación a WebP (elimina metadatos EXIF y
cualquier carga útil), nombre aleatorio y descarga con sesión; chat solo texto (React escapa), longitud máxima,
throttle, canal privado autorizado por participante; ZIP/DOCX/XLSX validados por contenido (sin macros, sin rutas `..`,
límite de entradas y de tamaño descomprimido) y descargados como adjunto; endpoint público de folios con lista blanca
(solo folio y nombre de convocatoria) y caché; toda acción administrativa en bitácora.

## 7. Avance

| Punto | Estado |
|---|---|
| Documentación del plan | ✅ |
| Backend: migración `2026_09_24_000003` (con respaldo previo), modelos, `Alcance`, middlewares `rol`/`alcance`, rutas en 3 grupos | ✅ (smoke test de los 4 roles OK) |
| 1 · 5 Roles, periodos, alcance (menú filtrado, paso "Alcance" en usuarios, `/admin/periodos`, periodo en el asistente) | ✅ |
| 3 Perfil, foto y portada (`/{rol}/cuenta`, fichas `/…/perfiles/{id}`, avatar en barra, listas, actividad y chat) | ✅ |
| 4 Historial, histórico y publicación (`/admin/folios`, Seguimiento en solicitud, sección con confeti en `/sigac`) | ✅ |
| 2 Buzón con chat (`/solicitante/buzon`, `/admin/buzon`, tiempo real por Reverb) | ✅ |
| 6 Límites de archivos (`/admin/documentos-fijos`, pestaña "Documentos" del programa, paso "Archivo" del asistente) | ✅ |
| Pruebas, despliegue y documentación final | ✅ |

## 8. Verificación (24/09/2026, producción, datos desechables ya borrados)

| Prueba | Resultado |
|---|---|
| `e2e_e45.php` — alcance (delegado, intersección con periodos, consulta, revisor con periodo), fichas y enmascarado bancario, folios y lista blanca pública, buzón y autorización del canal, fotos (SVG, PNG falso, diminuta), límites (DOCX con macros), historial, protecciones de usuarios y periodos | **72/72** |
| `e2e_seguridad.php` (regresión E44; la expectativa 403→404 cambió a propósito: el middleware `alcance` no confirma existencia) | **38/38** |
| Navegador real (Edge): menús por rol, redirección del delegado fuera de `/admin/usuarios`, consulta sin publicar ni acciones, Mi cuenta con foto y portada, **mensaje entre dos navegadores en tiempo real**, folio en la landing, **confeti al entrar y al regresar**, 375 px, sin errores de consola ni de CSP | **13/13** |
| vitest · tsc | 113/113 · 0 errores |

**Bugs de producción encontrados al probar con datos reales** (ninguno se había visto porque no había solicitudes):
1. `SolicitudController::store` usaba `Solicitud::create` con `folio`/`estado` en `$guarded` → violación NOT NULL: **nadie podía crear una solicitud**. Ahora `forceFill` (mismo patrón que E30/E31).
2. `adminShowFull` cargaba `criteriosEvaluacion` e `informe`, que no existían → 500 al abrir cualquier solicitud en admin. Corregido (`criterios`, relaciones `informes()`/`informe()`).
3. `throttle:*` corría **antes** que la autenticación: contaba por IP y con un contador compartido entre rutas. Prioridad de middlewares corregida en `bootstrap/app.php` + `setUserResolver` en `ApiAuthenticate`.
4. **Campana del buzón (reporte del usuario, 24/09 16:20):** los avisos de "nuevo mensaje" no sabían de qué hilo eran;
   al borrar los hilos de prueba quedaron 4 huérfanos y el buzón aparecía vacío. Ahora `conversacion_id` con borrado en
   cascada, clic → hilo abierto, leer el hilo apaga sus avisos, hilo inexistente → aviso claro. La campana del admin
   muestra solo sus notificaciones (antes las de todos, sin poder marcarlas leídas). Verificado en navegador 6/6.
5. En la vista: iniciales "P(" para nombres con paréntesis, botón "Nuevo" del buzón cortado a 375 px y el menú del delegado decía "Administrador". Corregidos.

## 9. Pendiente / fuera de alcance

- Vista previa en línea solo para PDF e imágenes; DOCX/XLSX/ZIP se descargan (a propósito: no se renderizan en el navegador).
- El correo de "mensaje sin leer" no incluye el texto del mensaje (a propósito: el correo sale del sistema).
- `style-src 'unsafe-inline'` sigue en la CSP (ver CLAUDE.md, Seguridad).
