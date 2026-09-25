# SIDECyT — Sistema Digital de Emprendimiento, Ciencia y Talento Mexiquense

**Definido por el usuario el 25/09/2026.** Documento guía para no perder el hilo del sistema completo.

## 1. Qué es cada cosa

| Nombre | Significado | Dirección | Estado |
|---|---|---|---|
| **SIDECyT** | **Sistema Digital de Emprendimiento, Ciencia y Talento Mexiquense** — el paraguas y el nombre del dominio | `https://sidecyt-comecyt.edomex.gob.mx/` (portal de sistemas) | Publicado (E48/E49) |
| **SIGAE** | **Sistema de Gestión de Apoyo Empresarial** (antes SIGAC) — convocatorias de Apoyo Empresarial: solicitud, revisión, evaluación, convenio, ministración, cierre | `/sigae` (landing) y `/login` → paneles | En operación |
| **SICEI** | **Sistema de Impulso a la Ciencia, Educación e Innovación** — becas a estudiantes e impulso a la investigación | `/sicei` | **PENDIENTE** (página "Próximamente") |

Relación con el sitio oficial del COMECYT:

| Sistema | Páginas oficiales de referencia |
|---|---|
| SIGAE | https://comecyt.edomex.gob.mx/apoyo-empresarial |
| SICEI | https://comecyt.edomex.gob.mx/becas-estudiantes · https://comecyt.edomex.gob.mx/impulso-investigacion |

Contacto general del COMECYT (pie de todas las páginas): Paseo Colón núm. 112-A, col. Ciprés, C.P. 50120, Toluca,
Estado de México · (722) 3 19 00 09 al 15 · 800 2632 628 · 800 8132 628 · comecyt@edomex.gob.mx. Correo de
proyectos de Apoyo Empresarial (indicado por el usuario): proyectos.comecyt@edomex.gob.mx.

## 2. Rutas públicas

| Ruta | Qué muestra | Código |
|---|---|---|
| `/` | Portal SIDECyT: tarjetas SIGAE (con sus programas vigentes, en vivo) y SICEI, "¿Cuál es para mí?", accesos rápidos, pie COMECYT | `components/portal/Portal.tsx`, `portal.css` |
| `/sigae` | Landing de SIGAE (convocatorias en vivo, folios aprobados, programas, sectores, recorrido, documentos, acceso) | `app/sigae/*`, `docs/LANDING_SIGAE.md` |
| `/sigac` | Redirección 308 a `/sigae` (nombre anterior) | `proxy.ts` |
| `/sicei` | "Próximamente": qué será SICEI + enlaces a las dos páginas oficiales + programas SICEI **solo si el admin los activa** | `app/sicei/page.tsx`, `components/portal/ProgramasSistema.tsx` |

## 3. Regla: programas y convocatorias NO se escriben en el código

Pedido explícito del usuario (25/09/2026): *"lo que tenga que ver con programas o convocatorias no debe estar
hardcodeado, todo debe ser actualizable desde el panel de admin"*.

| Contenido | Dónde se edita | De dónde lo leen las páginas |
|---|---|---|
| Convocatorias (estado, fechas, prórroga, banner) | `/admin/convocatorias` (E40, E47) | `GET /api/convocatorias/publicas` |
| Folios aprobados publicados | `/admin/folios` (E45) | `GET /api/folios-aprobados` |
| **Programas** de SIGAE y SICEI (nombre, a quién va dirigido, descripción, correo, teléfono, página oficial, ícono, color, orden, visible) | **`/admin/sitio`** (E49) | `GET /api/sitio/{sigae|sicei}` |
| Sectores estratégicos, documentos que se preparan y notas (SIGAE) | **`/admin/sitio`** (E49) | `GET /api/sitio/sigae` |

Lo que **sí** queda en el código porque describe cómo funciona el sistema (no un programa): las 8 etapas del
recorrido, los roles, los pasos para obtener acceso y los textos de presentación de cada sistema.

## 4. Modelo de datos (E49, migración `2026_09_25_000001`)

- `programas_publicos`: `sistema` (`sigae`|`sicei`), `nombre`, `dirigido_a`, `resumen`, `correo`, `telefono`, `url_info`
  (solo https de `comecyt.edomex.gob.mx`, `sidecyt-comecyt.edomex.gob.mx` o `edomex.gob.mx`), `icono` (lista cerrada),
  `tono` (`sky`|`mint`|`peach`), `orden`, `activo`, `actualizado_por`.
- `contenido_sitio`: `clave` (lista blanca en `ContenidoSitio::CLAVES`: `sigae.sectores`, `sigae.documentos`,
  `sigae.documentos_notas`), `valor` (JSON), `actualizado_por`.
- No confundir con `tipo_programas`: esa es la configuración técnica 1:1 de cada convocatoria (campos, documentos,
  rubros, criterios del asistente).

## 5. Endpoints

```
GET  /api/sitio/{sigae|sicei}                 público · throttle 30/min · caché 5 min (se invalida al guardar) · lista blanca
GET  /api/admin/programas-publicos?sistema=   admin
POST /api/admin/programas-publicos            admin · crear
PUT  /api/admin/programas-publicos/{id}       admin · editar / ocultar
DELETE /api/admin/programas-publicos/{id}     admin
POST /api/admin/programas-publicos/orden      admin · { sistema, ids[] }
GET|PUT /api/admin/contenido-sitio/{clave}    admin · listas
```
Toda escritura queda en bitácora (`sitio.*`). Texto plano: el servidor quita HTML; el front vuelve a validar tipos,
longitudes, correos y enlaces (`lib/sitio.ts`) antes de pintar.

## 6. SIGAE — programas (carga inicial, 25/09/2026)

Fuente: https://comecyt.edomex.gob.mx/apoyo-empresarial y la página de cada programa. Todos editables en `/admin/sitio`.

| # | Programa | Página oficial | Contacto |
|---|---|---|---|
| 1 | Programa para el Desarrollo de Prototipos | /apoyo-desarrollo-prototipos (también /node/318) | dt.prototipos@edomex.gob.mx |
| 2 | Incorporación de Profesionistas para el Fortalecimiento Empresarial | /incorporacion-profesionistas-fortalecimiento-empresarial | focacyte@edomex.gob.mx |
| 3 | Jóvenes Emprendedores e Innovadores | /jovenes-emprendedores-innovadores | vinculacionempresas@edomex.gob.mx |
| 4 | Vinculación de Empresas con IEMS, IES y/o Centros de Investigación | /vinculacion-empresas | sceron.comecyt@edomex.gob.mx |
| 5 | Asistencia Técnica e Innovación | **/asistencia-tecnica-innovacion da 404** (se dejó sin enlace) | comecyt@edomex.gob.mx |
| 6 | Patentes e Invenciones (CEPIM-COMECYT) | /patentes-invenciones | comecyt@edomex.gob.mx |
| 7 | Protección de la Propiedad Industrial | /proteccion-propiedad-industrial | tecnologia.comecyt@edomex.gob.mx |
| 8 | Marcas (CEPIM-COMECYT) | /marcas | comecyt@edomex.gob.mx |
| 9 | Asesoría y Capacitación para la Propiedad Intelectual | /asesoria-capacitacion-propiedad-intelectual | sceron.comecyt@edomex.gob.mx |

Sectores estratégicos (30) y documentos (6) + 3 notas: los de las convocatorias 2026 (ver `/admin/sitio`).

## 7. SICEI — información reunida (PENDIENTE de definir)

El usuario indicará después cómo será SICEI. Mientras tanto:
- `/sicei` muestra "Próximamente", qué será y enlaces a las dos páginas oficiales.
- Sus programas están **cargados como inactivos** en `programas_publicos` (`sistema = 'sicei'`): no aparecen en ninguna
  página hasta que el admin active cada uno en `/admin/sitio` → "Programas SICEI". Al activarlos, `/sicei` los lista solo.
- Faltan por completar en cada uno: a quién va dirigido, descripción y contacto específico (las páginas de listado
  solo dan nombre y enlace).

**Becas a estudiantes** (https://comecyt.edomex.gob.mx/becas-estudiantes) — *"diversos programas de becas y apoyos
dirigidos a estudiantes mexiquenses con el propósito de fortalecer su formación académica"*:

| Programa | Página |
|---|---|
| Becas COMECYT — Modalidad Beca de Posgrado (Maestría) | /beca-posgrado-edomex-ciencias |
| Becas COMECYT — Modalidad Posgrado en Ciencias de la Salud | /posgrado-salud |
| Beca de Educación Dual | /educacion-dual |
| Beca Mujeres Indígenas y Rurales Mexiquenses (Maestría) | /mujeres-indigenas-mexiquenses |
| Beca Ciencia con Incidencia para el Bienestar COMECYT | /ciencias-edmex |
| Programa Becas COMECYT — Modalidad Beca Internacional | /beca-internacional-edomex |
| Programa de Estancias de Investigación COMECYT | /programa-estancias |
| Apoyo para Estudiantes, Profesores e Investigadores Destacados | /apoyo-estudiantes-destacados |
| Beca Ciencia Aplicada Titulación | /beca-ciencia-aplicada-titulacion-edomex |
| Programa MICELIOS COMECyT | /micelios-comecyt |

**Impulso a la investigación** (https://comecyt.edomex.gob.mx/impulso-investigacion) — *"otorga estímulos e impulsa la
investigación para ampliar el conocimiento y el desarrollo tecnológico en el Estado de México"*:

| Programa | Página |
|---|---|
| Eventos Científicos o Tecnológicos | /eventos-cientificos-o-tecnologicos |
| Programa Investigadoras e Investigadores COMECYT | /programa-investigadoras-investigadores |
| Fondo para la Investigación Científica y Desarrollo Tecnológico del Estado de México | /fondo-investigacion-cientifica-desarrollo-tecnologico |
| Premio Estatal de Ciencia y Tecnología | /premio-estatal-ciencia-tecnologia |
| Apoyos a la Publicación de Artículos Científicos de Profesores e Investigadores | /publicacion-articulos-cientificos |
| Premio Talento: Jóvenes Científicos e Investigadores | /premio-talento-edomex |
| Redes EDOMÉX | /redes-edomex |
| Mujeres Científicas EDOMÉX | /mujeres-cientificas |
| Fortalecimiento de Laboratorios Científicos de Instituciones Públicas de Nivel Medio Superior | /beca-ciencia-aplicada |

**Preguntas abiertas para cuando se defina SICEI:** ¿mismo login y paneles que SIGAE o separados? ¿mismos roles
(revisor, evaluador) o flujo distinto (becas: postulación → validación → asignación)? ¿convocatorias en la misma tabla
con un campo `sistema`? ¿qué datos pide una beca (CURP, promedio, institución, programa de posgrado)? Anotarlas aquí
con la respuesta del usuario antes de implementar.
