# Modalidad "Apoyo en especie" (kits para clubes escolares) — requerimientos y plan (E52, DEFINIDO — SIN IMPLEMENTAR)

> **Estado:** requerimientos **definidos con el usuario el 28/09/2026** (§6) y plan por fases (§7). **Nada implementado
> todavía.** Registrado a pedido del usuario "para no perder el hilo". Siguiente paso: F1 cuando el usuario lo indique.
> Cualquier implementación debe cumplir la regla de ciberseguridad (CLAUDE.md §0) y la de identidad (docs/IDENTIDAD.md).

## 1. Contexto del sistema actual (lo que ya existe y se reutiliza)

| Pieza actual | Dónde | Cómo se relaciona |
|---|---|---|
| "Forma del apoyo" del programa: `tipo_apoyo` ∈ `reembolso`, `concurrente`, `honorarios` | `tipo_programas.tipo_apoyo`, `TipoProgramaController` (reglas `in:`), `AsistenteConvocatoriaController`, `ProgramasClient.tsx` (paso "El apoyo") | Se agrega el valor **`especie`** ("Apoyo en especie — kits") |
| Campos dinámicos por programa (el admin elige qué preguntar) | `programa_campos` + `DynamicFieldRenderer` + asistente de 7 pasos | Base para configurar el registro del líder y del equipo |
| Documentos por programa con límites (tipo/tamaño) | `programa_documentos`, `TiposArchivo` (E45) | Documentos del club y de los integrantes |
| Revisión documental con observaciones (revisor) | `RevisionController`, estado `observada`, `forceFill` (E31) | Base de las N revisiones / N subsanaciones configurables |
| Alcance por convocatoria/periodo y roles 5/6 (admin de convocatoria = "admin del programa") | `App\Support\Alcance` (E45) | El "admin del proyecto/programa" del requerimiento ≈ rol `admin_convocatoria` |
| Confeti al publicar folios en la landing | E45 (`FoliosAprobados`) | Mismo efecto en el panel del líder cuando su registro es aceptado |
| Fotos de perfil re-codificadas a WebP, disco privado | `PerfilController` (E45) | Logo/foto del club y foto de cada integrante |
| Correo SMTP M365 + campana (`CampanaChannel`) | E38/E46 | Avisos de aceptación, QR por correo, observaciones |

## 2. Requerimientos del usuario (textuales, ordenados)

1. **Nueva forma de pago "Apoyo en especie"** (kits o paquetes para desarrollar y dar continuidad al proyecto).
   Modalidad **exclusiva para escuelas, estatales o federales**.
   - **1.1** Flujo distinto: se registra una persona **líder del club**, que define todo. Los requisitos de registro se
     configuran como hoy se eligen los campos a pedir.
   - **1.2** El líder registra a su **equipo / integrantes del club** con todos sus datos (campos también configurables).
     Agregar **foto de perfil / logo del club** y **foto de cada integrante**; todo lo llena el líder.
   - **1.3** **QR del club** para asistencia e identificación; el sistema lo imprime.
   - **1.4** El QR solo se muestra en el panel del líder cuando el **admin o admin del programa lo habilita**.
   - **1.5** El registro pasa por **validación de documentación**: si no está al 100 %, observaciones con **24 h para
     subsanar** y **una sola subsanación**.
   - **1.6** Debe haber **2 revisiones**.
   - **1.7** Revisiones y subsanaciones **configurables**: definir **N validaciones/subsanaciones y N revisiones**; todo
     el flujo personalizado.
   - **1.8** El admin del proyecto ve **todos los aceptados**. Cuando el admin del programa marca el registro como dado de
     alta/aceptado, el panel del líder muestra **confeti** en cada recarga o desplazamiento (igual que los folios de la
     landing). El admin del programa decide si **muestra el QR** y se **envía correo** de aceptación.
     - **1.8.1** Después, **validación de comité**: solo indica si está validado por el **admin del proyecto** y por el
       **comité**; con **ambos checks** el registro queda aceptado.
   - **1.9** A cada registro aceptado el admin indica **cuándo y dónde se entrega el kit**. El admin del proyecto
     **carga la carta de aceptación de resguardo del kit** y con ella se **descarga el QR**, identificador para recoger el
     kit, el **box lunch** de cada integrante y la **confirmación de transporte**. El admin marca por registro:
     transporte, box lunch, registro de integrantes y club.
     - Box lunch y transporte **solo para escuelas del sistema ESTATAL**. Al dar de alta, el campo de transporte, y si lo
       rechazan, **doble confirmación** ("¿Estás seguro de que no quieres transporte?").
     - El admin del proyecto ve **quién necesita transporte**; al resto solo se le pide **confirmar box lunch**.
     - Se genera un **formato de solicitud**: transporte + lunch, solo lunch o solo transporte, para validar que lo
       requieren. El admin del proyecto define el **límite**.
   - **1.10** **Segundo escaneo del QR** el día del evento = entrega de **box lunch** (a quiénes, cuántos, historial). Al
     escanear, admin y admin de proyecto ven **todos los datos del club**.
   - **1.11** Registro de **asistencia y box lunch por QR o manual**.
2. **Registro de asistencia por programa** para el día del evento: el QR de asistencia llega **por correo al
   registrarse** y se muestra en el panel **solo si el admin lo habilita**.
3. a) Al configurar campos, poder agregar **municipio y código postal** con **autollenado al capturar el CP**.
   b) **Registro general único**: al entrar al panel el usuario **elige qué rol tomar** (evaluador, participante y en
      qué programa) y puede **cambiar de rol** según aplique.
4. **Pase a nacional**: marcar qué escuela pasó a nacional para **repetir todo el flujo** con configuración propia,
   siempre que el admin / admin de convocatoria habilite la **subconvocatoria nacional**; igual para **internacional**.
   **PENDIENTE POR DEFINIR** (no se implementa hasta que el usuario lo defina).

## 3. Flujo propuesto (borrador, sujeto a las respuestas de §5)

```
Convocatoria (tipo_apoyo = especie, solo escuelas)
  └─ Registro del LÍDER (campos configurables + logo del club)
       └─ Integrantes del club (campos configurables + foto por integrante)  ← los captura el líder
            └─ Validación documental  ── observaciones → subsanación (plazo y número configurables)
                 └─ Revisión 1 … Revisión N (configurable)
                      └─ Aceptación por admin del programa  → confeti en el panel del líder + correo
                           └─ Validación de comité: ✓ admin del proyecto + ✓ comité  = ACEPTADO
                                └─ Logística: fecha/lugar de entrega · carta de resguardo · (estatal) transporte / box lunch
                                     └─ QR habilitado por el admin → correo + panel del líder
                                          └─ Día del evento: escaneo 1 = asistencia · escaneo 2 = box lunch (o manual)
                                               └─ (futuro) Pase a nacional / internacional → subconvocatoria, flujo repetido
```

## 4. Consideraciones técnicas y de seguridad (a respetar al implementar)

- **QR:** debe contener un **token aleatorio opaco** (no el id ni datos personales), firmado y revocable; el escaneo
  solo funciona con sesión de admin/admin de programa (u operador autorizado) y queda en bitácora. Sin librerías por
  CDN (CSP): generación del lado del servidor o librería local.
- **Fotos de menores de edad:** los integrantes de un club escolar probablemente sean menores. Implica aviso de
  privacidad específico, consentimiento del padre/tutor o de la escuela, disco privado y acceso solo con sesión.
- **Código postal → municipio:** requiere un catálogo local (SEPOMEX) cargado en la base; **no** consultar un servicio
  externo en tiempo real (CSP, disponibilidad, privacidad).
- **Estados nuevos** en tablas nuevas o en `solicitudes` → toda transición con `forceFill()->save()` y en el historial
  (patrón E30/E31/E45). Un endpoint con transacción por operación compuesta (regla E47).
- **Escaneo el día del evento:** puede haber mala conectividad en la sede → evaluar modo sin conexión o captura manual.

## 5. Preguntas hechas al usuario (28/09/2026)

Se hicieron 32 preguntas en 8 bloques con el cuestionario de opciones: ubicación y roles, escuela y club, revisiones,
QR y evento, logística, registro general y CP, aceptación y kit, federal/catálogo/impresión y fases. Respuestas en §6.

## 6. Decisiones del usuario (28/09/2026)

### 6.1 Ubicación y roles
| Tema | Decisión |
|---|---|
| Dónde vive | **Dentro de SIGAE**: nuevo valor `especie` de `tipo_apoyo` ("Apoyo en especie — kits"). Reutiliza convocatorias, campos, documentos, revisión |
| "Admin del proyecto / programa" | **El admin de convocatoria** (rol 5, E45), con permisos nuevos de esta modalidad |
| Comité | **No entra al sistema.** El admin **sube el acta del comité** (PDF) y marca **sí / no** |

### 6.2 Escuela, club e integrantes
| Tema | Decisión |
|---|---|
| Escuela | **Catálogo de escuelas** que el admin carga con **Excel desde el panel** (CCT, nombre, municipio, nivel, sistema Estatal/Federal) y puede editar una por una. El líder busca y elige su escuela. Se entrega plantilla |
| Integrantes | **No tienen cuenta**: el líder captura a todos |
| Menores de edad | **Sí pueden ser menores** → aviso de privacidad para menores + documento de consentimiento del padre/tutor o de la escuela (fotos y datos), disco privado |
| Límites | **Configurables por convocatoria**: mínimo y máximo de integrantes por club, y si una escuela puede registrar más de un club |
| Fotos | Logo/foto del club y foto por integrante (WebP re-codificado, privado, como E45) |

### 6.3 Revisiones y subsanaciones
| Tema | Decisión |
|---|---|
| Estructura | **Etapas de revisión en secuencia**, configurables por convocatoria: N etapas, cada una con su revisor, plazo y número de subsanaciones. **Por defecto: 2 revisiones, 1 subsanación, 24 h** |
| Quién revisa | **Configurable por etapa: revisor documental, admin de convocatoria o ambos** |
| Plazo vencido sin subsanar | **Lo decide el revisor** (queda "vencido"; el revisor/admin rechaza o da prórroga) |
| Observaciones | **Comentario general** (el líder puede corregir cualquier dato mientras esté en subsanación) |
| Conteo del plazo | **Horas naturales**, hora de Toluca, con **cuenta regresiva** visible para el líder |

### 6.4 Aceptación, comité y avisos
| Tema | Decisión |
|---|---|
| Orden | **Revisiones → comité (acta + sí/no por el admin) → ACEPTADO** (check admin de convocatoria + check comité) |
| Confeti | En cada recarga/desplazamiento del panel del líder **desde que queda aceptado hasta que se entrega el kit** |
| Correos al líder | **Observaciones y plazo · Aceptación · QR habilitado · Fecha y lugar del kit** (además de la campana) |

### 6.5 Logística (solo escuelas aceptadas)
| Tema | Decisión |
|---|---|
| Kit | **Nombre y descripción** del kit por convocatoria; se marca **entregado** por club con fecha, lugar y quién entregó (sin inventario) |
| Fecha y lugar del kit | El admin los asigna por club → correo al líder |
| Carta de resguardo | **La genera el sistema** (PDF con datos del club y kit); **el líder la descarga, la firma y la sube**; queda historial para los admins. Subida = requisito para descargar el QR |
| Transporte y box lunch | **Solo escuelas ESTATALES**. **Federales: solo kit** (sin transporte ni lunch) |
| Cómo se piden | **Por club (cantidad de personas)**. Rechazar transporte pide doble confirmación ("¿Estás seguro de que no quieres transporte?") |
| Formato de solicitud | **PDF generado por el sistema** (transporte + lunch / solo lunch / solo transporte) que el líder firma y sube |
| Límites (admin de convocatoria) | **Cupo total de transporte, cupo total de box lunch, máximo por club y fecha límite para solicitar** |

### 6.6 QR, eventos y asistencia
| Tema | Decisión |
|---|---|
| QR | **Uno por club** (token opaco, revocable). Sirve para kit, asistencia y box lunch |
| Visibilidad | Solo cuando el **admin / admin de convocatoria lo habilita**; entonces se envía por correo y aparece en el panel |
| Impresión | **Credencial del club en PDF + hoja con la lista de integrantes y sus fotos** (con franja institucional) |
| Escaneo | **Staff con el celular**: pantalla "Escanear" (cámara) para admin, admin de convocatoria y un rol/permiso de operador de evento |
| Sin conexión | **Captura manual de respaldo** (buscar club por nombre/folio y marcar) |
| Eventos | **Configurable: un solo evento o varios** por convocatoria (fecha, sede, tipo). Escaneo 1 = asistencia; escaneo 2 = box lunch entregado (cantidad) |
| Datos al escanear | Admin y admin de convocatoria ven **todos los datos del club** |

### 6.7 Reportes (Excel)
Clubes aceptados · asistencia por evento · box lunch y transporte (solicitado vs entregado vs cupo) · kits entregados ·
**datos de contacto y todos los datos** del club e integrantes (respetando privacidad: solo roles con permiso).

### 6.8 Registro general y código postal
| Tema | Decisión |
|---|---|
| Registro general | **Nuevo registro único para todo SIDECyT** (reemplaza "Solicitar acceso"): una cuenta con datos generales; dentro del panel se elige **participar en un programa** o **ser evaluador**, puede tener varios roles y **cambiar entre ellos** |
| Aprobación | **Todo rol requiere aprobación de un admin** (como hoy) |
| CP → municipio | **Solo Estado de México** (catálogo local de CP de los 125 municipios, sin servicios externos) |
| Campo CP | **Tipo de campo nuevo** "Dirección por código postal", disponible en cualquier programa |

### 6.9 Panel del líder, fases y nacional
| Tema | Decisión |
|---|---|
| Panel del líder | **Línea de avance del club**: tarjeta del club (logo, escuela, integrantes) + etapas registro → revisiones → comité → aceptado → kit → evento, con lo pendiente y la cuenta regresiva |
| Implementación | **Por fases publicables** (§7) |
| Pase a nacional / internacional | **Solo documentado, pendiente por definir**. Las tablas se diseñan para agregar "subconvocatoria nacional" después sin rehacer |

## 7. Plan de implementación por fases

| Fase | Alcance | Depende de |
|---|---|---|
| **F1 — Base** | `tipo_apoyo = especie` (backend + asistente + editor de programa); catálogo de escuelas (Excel + CRUD); configuración de la modalidad por convocatoria (límites de integrantes, clubes por escuela, menores de edad); registro del líder: club (escuela del catálogo, logo) + integrantes (campos configurables + foto); aviso de privacidad y consentimiento de menores | — |
| **F2 — Revisión y aceptación** | Etapas de revisión configurables (revisor/admin/ambos, plazo en horas naturales, N subsanaciones), cuenta regresiva, estado "vencido" que decide el revisor; comité (acta + sí/no); ACEPTADO con confeti y correos; vista del admin con todos los aceptados; panel del líder con línea de avance | F1 |
| **F3 — Logística** | Kit (nombre/descripción, fecha y lugar por club, entregado); carta de resguardo generada → firmada y subida; transporte/box lunch solo estatales con cupos, máximo por club, fecha límite y doble confirmación; PDF de solicitud firmado | F2 |
| **F4 — QR y eventos** | QR por club (token opaco), habilitación por admin, credencial + lista PDF; eventos (uno o varios); escaneo con cámara (asistencia / box lunch) y captura manual; historial; reportes Excel | F3 |
| **F5 — Registro general y CP** | Registro único con elección y cambio de rol (aprobación de admin), campo "Dirección por código postal" (catálogo Edomex) | Independiente; puede ir antes si se prioriza |
| **Pendiente** | Pase a nacional / internacional (subconvocatorias) | Definición del usuario |

> **Orden real de implementación (decisión del usuario, 29/09/2026): F5 primero**, luego F1 → F2 → F3 → F4.

## 10. Fase 5 — Registro general con elección de rol ✅ PUBLICADA (29/09/2026)

### 10.1 Decisiones adicionales del usuario (29/09/2026)
| Tema | Decisión |
|---|---|
| Aprobación | **Solo la cuenta, con el rol elegido** al registrarse; pedir otro rol después = nueva aprobación |
| Roles que se pueden pedir | **Participante (SIGAE), Líder de club, Evaluador** (revisor, admin, admin de convocatoria y consulta solo los otorga un admin) |
| Datos de empresa | Solo al elegir **Participante** (como el formulario anterior, Responsable del proyecto obligatorio) |
| Datos personales | Nombre, correo, contraseña, teléfono (10 dígitos), **CURP única y obligatoria**, CP + colonia, cargo/ocupación |
| CP fuera del Edomex | **Se rechaza**: registro solo para el Estado de México |
| Evaluador | Área de conocimiento, institución, **CV en PDF** (≤ 5 MB) y grado académico |
| Ruta | **`/registro`**; `/solicitar-acceso` redirige (308) |
| Líder de club (para F1) | **Un club por convocatoria**; consentimiento de menores = **una carta por club (de la escuela)**; campos del club/integrantes **configurables incluida su obligatoriedad** |

### 10.2 Implementación
- **BD** (`2026_09_29_000001_registro_general`): rol `lider_club` (id 7); `codigos_postales` (SEPOMEX Edomex); `users` +
  `curp` (única, oculta en JSON), `codigo_postal`, `municipio`, `colonia`, `datos_registro` (oculto); `usuario_roles`
  (roles otorgados; backfill con el rol de cada cuenta); `solicitudes_acceso` + rol solicitado y datos personales;
  `solicitudes_rol` (pedir otro rol con cuenta).
- **Catálogo de CP:** `php artisan sidecyt:cargar-cp <TXT>` carga el archivo oficial de Correos de México (estado 15,
  TXT). Cargado: 2 284 CP, 8 360 asentamientos, 125 municipios. **El archivo NO se versiona** (licencia: prohibida su
  distribución; repositorio público): copia en `backups/sepomex/Mexico_20260929.txt` (fuera de git).
- **API pública:** `POST /auth/registro` (throttle 10 cada 10 min por IP; escuelas e instituciones comparten IP),
  `GET /codigos-postales/{cp}` (throttle 60/min, una consulta por código), `GET /registro/opciones` (áreas y grados).
  Municipio y colonia los resuelve el servidor contra el catálogo; CURP con patrón RENAPO; CV verificado por contenido y
  guardado en disco privado `registro/`; correo o CURP ya registrados reciben la misma respuesta (sin enumeración).
- **Roles múltiples:** `users.rol_id` = rol ACTIVO (el resto del sistema no cambió). `GET/POST /mis-roles`,
  `/mis-roles/solicitar`, `/mis-roles/cambiar` (reemite el JWT con el nuevo rol; el anterior queda invalidado).
  **Anti-escalada:** al cambiar el rol de una cuenta en Usuarios se retiran los roles de personal que no sean el nuevo
  (`UserController::sincronizarRoles`), y el admin puede retirar un rol otorgado (`DELETE /admin/usuarios/{u}/roles/{r}`).
- **Admin:** aprobar la cuenta crea el usuario con su rol (participante con empresa; evaluador con `datos_registro`);
  pestaña **"Solicitudes de rol"** en `/admin/solicitudes-acceso`; CV con descarga autenticada (`/cv`). Avisos por
  campana + correo (`RolSolicitudAviso`).
- **Front:** `/registro` (pasos: rol → datos → domicilio → datos del rol → contraseña → confirmar), "Mis roles" en Mi
  cuenta de todos los paneles, panel `/club` (inicio, Mi cuenta, Configuración) para el líder de club.
- **Verificado:** e2e backend **46/46** (`e2e_registro.php`: CP, validaciones, duplicados, CV falso, aprobación por rol,
  mis-roles, token anterior invalidado, escalada bloqueada, throttle), navegador real 11/11 (registro completo por UI a
  390 px, pedir rol, cambiar de rol → /club), vitest 133/133, sin errores de JavaScript.

## 8. Modelo de datos (borrador técnico, a validar en F1)

- `escuelas` (cct único, nombre, municipio, nivel, sistema `estatal|federal`, activo).
- `especie_config` por convocatoria (min/max integrantes, clubes por escuela, participan menores, kit nombre/descripción,
  cupos transporte/lunch, máximo por club, fecha límite, eventos único/múltiple).
- `clubes` (convocatoria, escuela, líder user_id, nombre, logo, estado, datos dinámicos JSON, qr_token hash, qr_habilitado,
  aceptado_at, comité acta/resultado, kit fecha/lugar/entregado, carta resguardo, transporte/lunch solicitados).
- `club_integrantes` (club, datos dinámicos JSON, foto, consentimiento).
- `revision_etapas` (convocatoria, orden, quién revisa, plazo_horas, max_subsanaciones) y `club_revisiones` (club, etapa,
  ronda, resultado, comentario, vence_at, revisor).
- `eventos` (convocatoria, nombre, fecha, sede, tipo) y `club_registros_evento` (club, evento, tipo `asistencia|lunch`,
  cantidad, método `qr|manual`, registrado_por, at).
- `codigos_postales_edomex` (cp, municipio, colonias).
- Preparado para nacional: `convocatorias.padre_id` / `nivel` (estatal/nacional/internacional) — sin usar hasta definirlo.

## 9. Diseño de interfaz (lineamientos)

Se aplican las skills (hallmark, frontend-design, ui-ux-pro-max, emil-design-eng) y el sistema de paneles (E39–E43):
todo formulario de crear/editar es un `StepFrame`; tarjetas pastel; píldoras de estado; confeti igual al de folios.
Panel del líder = "línea de avance del club" con la etapa actual resaltada en vino y cuenta regresiva en observaciones.
Pantalla de escaneo pensada para celular (cámara a pantalla completa, confirmación grande verde/roja, vibración) y
captura manual con buscador. Responsive móvil primero y verificado con la auditoría de encimados (E51).
