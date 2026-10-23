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
> Estado: **F5 ✅ (§10) · F1 ✅ (§11) · F2 ✅ (§12) · F3 ✅ (§13)** · F4 pendiente.

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

## 11. Fase 1 — Base de la modalidad ✅ PUBLICADA (29/09/2026)

### 11.1 Decisiones del usuario (29/09/2026)
| Tema | Decisión |
|---|---|
| Asistente | En especie **no** pide monto, conceptos de gasto ni criterios; pide **kit y configuración del club** (5 pasos en lugar de 7) |
| Escuelas | Catálogo cargado por **Excel desde el panel**; nivel primaria/secundaria/media superior/superior; sistema estatal/federal |
| Clubes | **Uno por líder por convocatoria**; en captura hasta "Enviar a revisión"; **después no se edita** (la subsanación es F2) |
| Carta de consentimiento | **Una por club, de la escuela**: el sistema genera el PDF, la escuela firma y sella, el líder lo sube |
| Siempre obligatorio | Nombre del club, escuela y nombre de cada integrante; lo demás es configurable (no pedir / opcional / obligatorio) |
| Predefinidos | Integrante: foto, fecha de nacimiento, sexo, CURP, grado y grupo, correo, teléfono. Club: logo, descripción |
| Líder | **Cuenta como integrante**: se agrega solo como el primero y entra al mínimo y máximo |
| Documentos | Los del programa (configurables por convocatoria) **más** la carta de la escuela, siempre obligatoria |

### 11.2 Implementación
- **BD** (`2026_09_29_000002_apoyo_especie_f1`): `escuelas`, `especie_config` (1 por convocatoria), `especie_campos`
  (preguntas del club o del integrante), `clubes` (folio `CLUB-AAAA-XXXXXX`, único por convocatoria + líder),
  `club_integrantes`, `club_documentos`.
- **Reglas en un solo lugar:** `App\Support\Especie` (predefinidos, validación de respuestas personalizadas, folio) y
  `App\Support\ImagenSegura` (logo y fotos: MIME real, ≤ 5 MB, ≤ 40 MP, re-codificadas a WebP cuadrado, disco privado).
- **API admin:** `/admin/escuelas` (CRUD, `importar` .xlsx sin evaluar fórmulas y con informe por fila, `plantilla`);
  `GET /admin/convocatorias/{c}/especie` (admin, admin de convocatoria y consulta, con alcance) y `PUT` (solo admin);
  `/admin/especie/convocatorias`, `/admin/convocatorias/{c}/clubes`, `/admin/clubes/{club}` (lectura con alcance).
  El asistente (`POST /admin/asistente-convocatoria`) acepta `tipo_apoyo=especie` con el bloque `especie` y preguntas
  con `ambito`; `TipoProgramaController` permite "En especie" sin monto y no deja cambiar de/a especie con registros.
- **API líder** (`/club/*`, rol `lider_club`, propiedad revisada en cada acción → 404 si no es suyo): convocatorias,
  buscador de escuelas (≥ 3 letras, 20 resultados), club (crear, editar solo en captura, logo), integrantes (+ foto),
  documentos (carta: PDF o imagen ≤ 10 MB; los demás con los límites del programa), carta generada
  (`pdfs/carta_escuela_club`), enviar (lista de faltantes legible; aviso por campana a admins y admins de la
  convocatoria). Descargas: `/api/media/club/{40}.webp` y `/api/clubes/{club}/documentos/{clave}`, con sesión y permiso.
- **Front:** asistente con elección de modalidad en el paso 1 (`lib/asistente-convocatoria.ts` `pasosDe`), paso
  "Club y kit" con `components/admin/especie/ConfigEspecieForm.tsx` (también en la ficha de la convocatoria:
  `EspecieConvocatoriaPanel`), programas con la opción "En especie", `/admin/escuelas` y `/admin/clubes` (+ ficha) en el
  menú, panel del líder `/club/dashboard` y `/club/clubes/[id]` con línea de avance (`LineaAvanceClub`), buscador de
  escuelas accesible (`EscuelaPicker`), preguntas dinámicas (`CampoDinamico`) y vista de solo lectura común
  (`ClubResumen`). Lógica y validación en `lib/especie.ts` (mismos límites que el backend).
- **Correo a dominios reservados bloqueado** (`BloquearCorreoDominiosReservados`): las pruebas usan `.invalid`; antes
  llegaban a Microsoft 365 (rechazos 501/421). Avisos en cola con `deleteWhenMissingModels` (no fallan si el registro se
  borró antes de enviarse).
- **Verificado:** e2e backend **53/53** (`e2e_especie_f1.php`: escuelas y Excel malicioso, asistente, límites, un club por
  líder, cupo por escuela, IDOR entre líderes, archivos disfrazados, faltantes, envío y bloqueo de edición, vista del
  personal con alcance), navegador real **39/40** (importar escuelas, crear la convocatoria con el asistente, editar su
  configuración, líder en 390 px: registrar, completar, fotos, carta, HTML disfrazado rechazado, enviar; admin: lista,
  ficha y aviso en la campana; el único fallo fue de sincronía de la propia prueba, la imagen sí se ve), vitest
  **145/145**, sin errores de JavaScript.

### 11.3 Aviso de privacidad del club (decidido 29/09/2026)
- **Sí:** casilla obligatoria al enviar el club, con enlace al aviso de privacidad del sistema ("Confirmo que tengo el
  consentimiento…"); queda registrado con fecha. Se implementa junto con F2.

## 12. Fase 2 — Decisiones adicionales del usuario (29/09/2026)
| Tema | Decisión |
|---|---|
| Etapas de revisión | **Configurables por convocatoria**: 1, 2 o más en orden, cada una con quién revisa (revisor, admin de convocatoria o ambos), plazo en horas naturales y número de subsanaciones (§6) |
| Resultado de una etapa | **Aprobar, observar (pedir correcciones) o rechazar**; rechazar exige motivo, avisa al líder y el club termina ahí |
| Comité | **Un acta por convocatoria** (la sesión) y **sí/no por club** entre los aprobados en revisión |
| Etapa con «ambos» | **Cualquiera de los dos resuelve**: aparece en la bandeja del revisor y del admin de convocatoria; el primero que resuelve la cierra |
| Aceptación | **Dos marcas separadas**: tras las revisiones el admin de convocatoria da su **visto bueno**; luego el **comité** (acta + sí/no). Solo con las dos queda ACEPTADO |
| Prórroga por plazo vencido | **El revisor escribe las horas** (1 a 168) y el motivo; se reinicia la cuenta regresiva y el líder recibe aviso y correo |

### 12.1 Implementación ✅ PUBLICADA (29/09/2026)
- **BD** (`2026_09_29_000003_apoyo_especie_f2`): `especie_etapas` (orden, nombre, `revisa` revisor|admin_convocatoria|ambos,
  `plazo_horas`, `max_subsanaciones`; por defecto 2 etapas, 1 corrección, 24 h, también creadas para las convocatorias
  que ya existían); `club_revisiones` (historial inmutable: enviado, aprobado, observado, rechazado, prórroga,
  subsanado, visto_bueno, comite_*); `clubes` + etapa actual, ronda, `vence_at`, visto bueno, comité, aceptación,
  rechazo (origen y motivo) y `aviso_privacidad_at`; `especie_config` + acta del comité (disco privado).
- **Estados:** borrador → enviado (etapa N) → observado (plazo) → subsanado → … → aprobado_revision → aceptado |
  rechazado. **"Vencido" no se guarda**: es observado con el plazo pasado (`Club::vencido()`), así no depende de un
  proceso programado. El líder edita en borrador y en observado dentro del plazo.
- **Reglas en un solo lugar:** `App\Support\RevisionClub` (quién resuelve, transiciones con `lockForUpdate` para que
  "el primero que resuelve" gane y el segundo reciba 422, historial y avisos) y `App\Support\EtapasEspecie` (validar y
  guardar etapas; con clubes enviados la estructura queda fija y solo cambian sus datos).
- **API:** `/revision/*` (admin, admin de convocatoria, revisor; alcance en el controlador): bandeja
  (`vista=pendientes|comite|todos`), ficha, `resolver` (aprobar/observar/rechazar), `prorroga`, `visto-bueno`,
  `comite`, acta (subir: admin y admin de convocatoria; ver: también revisor y consulta). El envío del líder exige
  `acepto_privacidad` la primera vez; en observado, el mismo botón envía las correcciones.
- **Avisos:** campana para el personal (`club_por_revisar`, `club_subsanado`, `club_aprobado_revision`) y para el líder
  (`etapa_aprobada`, `rechazado`); **correo** al líder en observaciones (con el comentario y el plazo), prórroga y
  aceptación. Los avisos de clubes llevan a la bandeja del revisor, a `/admin/clubes` o al panel del líder.
- **Front:** editor de etapas en `ConfigEspecieForm` (asistente y ficha); `/revisor/clubes` (+ ficha) en el menú del
  revisor; `/admin/clubes` con pestañas Por revisar / Comité (acta) / Todos; ficha compartida `FichaClubPersonal` con
  `RevisionClubPanel` e `HistorialClub`; líder: `AvisoEstadoClub` (observaciones con `CuentaRegresiva`, vencido,
  aceptado con **confeti** `lib/confeti.ts` cada vez que entra en pantalla, no aceptado con motivo), línea de avance de 6
  pasos (registro → revisiones → comité → aceptado → kit → evento) y casilla del aviso de privacidad.
- **Verificado:** e2e backend **57/57** (`e2e_especie_f2.php`: permisos por etapa, "ambos", alcance, límite de
  correcciones, vencido/prórroga/rechazo, visto bueno, acta falsa, comité, etapas fijas, avisos), navegador real
  **23/23** (flujo completo líder → revisora → líder → revisora → admin de convocatoria → líder, 390 y 1440 px),
  vitest **158/158**, regresión F1 53/53, registro 46/46, errores 13/13.

## 13. Fase 3 — Logística: decisiones adicionales del usuario (29/09/2026)
| Tema | Decisión |
|---|---|
| Cupos totales (transporte y box lunch) | El admin o admin de convocatoria **elige por convocatoria si el cupo es de la convocatoria o de cada evento**, y en cada uno escribe el tope; **vacío = sin tope** |
| Límites por club (configurables) | **Máximo de transporte por club, máximo de box lunch por club, "no pasar del número de integrantes" y acompañantes permitidos** (se suman a los integrantes) |
| Cambios del líder | **Sí, hasta la fecha límite**; al cambiar debe volver a descargar, firmar y subir el formato (la versión anterior queda en el historial) |
| Formato con cupos por evento | **Uno por evento**: cada evento tiene su solicitud, su PDF, su firma y su validación |
| Apartado del cupo | **Al enviar la solicitud** (orden de llegada); si el admin la rechaza o el líder la baja, se libera; sin cupo, el sistema lo dice antes de enviar |
| Validación de documentos firmados | **El admin o admin de convocatoria aprueba o rechaza** (con motivo) la carta de resguardo y cada formato de solicitud; con historial de versiones |
| Fecha y lugar del kit | **Por club y a varios a la vez**; cada líder recibe su correo |
| Kit entregado | Lo marca **admin o admin de convocatoria**: fecha, lugar, quién entregó y quién recibió; al marcarlo se detiene el confeti del líder |
| Eventos | Como los cupos pueden ser por evento, **F3 crea el catálogo básico de eventos** (nombre, fecha, sede, cupos); F4 agrega el escaneo |

### 13.1 Implementación ✅ PUBLICADA (29/09/2026)
- **BD** (`2026_09_29_000004_apoyo_especie_f3`): `especie_config` + modo de cupos, cupos totales, máximos por club, tope
  por integrantes + acompañantes y fecha límite; `especie_eventos`; `club_logistica` (una por club o por club y evento;
  estados enviada → firmada → aprobada | rechazada | cancelada; aparta cupo en enviada/firmada/aprobada);
  `club_firmados` (versiones de la carta de resguardo y de cada formato: pendiente / aprobado / rechazado /
  reemplazado); `clubes` + fecha y lugar del kit y datos de la entrega. Estado nuevo del club: `kit_entregado`.
- **Reglas:** `App\Support\LogisticaClub`. El cupo se revisa **bajo bloqueo de la configuración** (dos líderes no
  pueden pasarse del tope al mismo tiempo); federales → 422; transporte en 0 exige `confirmo_sin_transporte`; cambiar
  una solicitud reemplaza su formato firmado (hay que firmar el nuevo); rechazar un formato rechaza la solicitud y
  libera el cupo; no se cambia de modo con solicitudes activas ni se quita un evento con solicitudes.
- **PDF generados:** `pdfs/carta_resguardo_club` y `pdfs/solicitud_logistica_club` (tipo: transporte y box lunch /
  solo transporte / solo box lunch), con la franja institucional.
- **API:** líder `/club/clubes/{club}/logistica` (pedir, bajar, formato), `/resguardo`, `/firmados`; personal
  `/revision/convocatorias/{c}/logistica` (tablero y configuración), `/revision/firmados/{f}/revisar`,
  `/revision/kit/asignar` (varios clubes), `/revision/clubes/{club}/kit-entregado`; descarga de versiones
  `/clubes/{club}/firmados/{f}` (dueño o personal con alcance). Solo admin y admin de convocatoria operan la logística.
- **Avisos:** correo al líder con la fecha y el lugar del kit; campana para documentos subidos (personal), aprobados o
  rechazados (líder) y kit entregado.
- **Front:** pestaña **Logística** en `/admin/clubes` (`LogisticaConvocatoria`: configuración, eventos, uso de cupos,
  clubes aceptados y asignación masiva), `LogisticaPersonal` en la ficha del club, `LogisticaLider` en el panel del líder
  (kit, carta de resguardo y transporte/box lunch con "¿Estás seguro que no quieres transporte?") y `VersionesFirmadas`.
- **Verificado:** e2e backend **57/57** (`e2e_especie_f3.php`), navegador real **19/19** (admin de convocatoria, líder
  estatal y federal, 390 y 1440 px), vitest **162/162**, regresión F2 57/57, F1 53/53, registro 46/46, errores 13/13.

## 14. Fase 4 — QR, eventos y reportes: decisiones adicionales del usuario (29/09/2026)
| Tema | Decisión |
|---|---|
| Quién escanea | **Admin, admin de convocatoria y un rol nuevo «Operador de evento»** (lo da de alta un admin, con convocatorias asignadas; solo ve escaneo y captura manual de sus convocatorias) |
| Requisito del QR | La carta de resguardo **aprobada** por el admin |
| Modo de escaneo | **El operador elige evento y modo**: Asistencia, Box lunch o Kit |
| Sin conexión | **Respaldo con internet**: si la cámara falla o el QR no se lee, búsqueda por nombre o folio y registro manual |
| Asistencia | **Cuántas personas llegaron** (propone el número de integrantes; se ajusta); un registro por club y evento, corregible |
| Box lunch | **Lo aprobado, ajustable hacia abajo**; sin solicitud aprobada no se entrega (en modo "convocatoria" el aprobado es el máximo por evento) |
| Habilitar QR | **Por club y a varios a la vez**, revocable; cada líder recibe su correo |
| Cámara | **Permitida solo para el propio sitio** (política de permisos) + librería **jsQR** para iPhone; el navegador siempre pide permiso |
| Kit por escaneo | Registra la entrega con fecha y hora actuales, **quién entregó = el operador** y **quién recibió** (se escribe) |

### 14.1 Implementación ✅ PUBLICADA (29/09/2026)
- **BD** (`2026_09_29_000005_apoyo_especie_f4`): rol **`operador_evento` (id 8)**; `clubes.qr_token` (token cifrado),
  `qr_hash` (sha256, único), `qr_habilitado_at/por`; `club_registros_evento` (club, evento, tipo asistencia|lunch,
  cantidad, método qr|manual, quién; **único por club + evento + tipo**: volver a registrar corrige y queda en bitácora).
- **QR** (`App\Support\QrClub`): el código lleva `SIDECYT-CLUB:` + 40 caracteres aleatorios; **nada del club viaja en
  él**. Se guarda cifrado (para volver a pintarlo al líder) y como hash (para encontrarlo al escanear). Solo se habilita
  con el club aceptado y la carta de resguardo aprobada; revocar lo invalida al instante y rehabilitar genera otro. El
  token y el hash nunca salen en JSON (`$hidden`). La imagen se sirve **PNG** (no SVG) con sesión y `no-store`.
- **Escaneo** (`App\Support\EventoClub`, `Club\EscaneoController`, `/api/escaneo/*`): eventos de las convocatorias del
  alcance, lectura del QR, búsqueda manual (folio, nombre, escuela o CCT; solo aceptados), ficha y registro. QR ajeno,
  revocado o de otra convocatoria → **404 genérico**; el `club_id` del cuerpo se revisa a mano contra el alcance. El
  operador ve lo mínimo (sin correos ni teléfonos); admin y admin de convocatoria, todo y enlace a la ficha. Box lunch ≤
  lo aprobado de ese evento (modo evento) o de la convocatoria; sin aprobado → 422. Kit: reutiliza
  `LogisticaClub::entregarKit` (entregó = operador; lugar = sede del evento).
- **Alcance del operador:** solo sus convocatorias asignadas (`Alcance`, igual que el admin de convocatoria, sin
  periodos). Se asignan al darlo de alta en Usuarios. Rutas: `rol:admin,admin_convocatoria,operador_evento`.
- **Líder:** `GET /club/clubes/{club}/qr` (PNG) y `/credencial` (PDF `pdfs/credencial_club`: franja, QR, datos y fotos de
  los integrantes convertidas de WebP a PNG). Sin QR habilitado → 404; en su panel ve qué le falta.
- **Personal:** `POST /revision/qr/habilitar` (varios; responde habilitados y omitidos con el motivo),
  `POST /revision/clubes/{club}/qr/revocar`, `GET /revision/convocatorias/{c}/reporte` (Excel de 5 hojas: clubes
  aceptados con contacto, integrantes con todos sus datos, asistencia por evento, transporte y box lunch solicitado /
  entregado / cupo, kits entregados; texto saneado contra inyección de fórmulas; queda en bitácora). Solo admin y admin
  de convocatoria.
- **Avisos:** correo + campana al líder al habilitar (`qr_habilitado`); campana al revocar (`qr_revocado`).
- **Seguridad (cambio aprobado por el usuario):** `Permissions-Policy: camera=(self)` **solo en el front**
  (`next.config.ts`); la API conserva `camera=()`. Throttles con prefijo propio en cada ruta nueva.
- **Front:** `/operador/escanear` (panel propio del operador, con Mi cuenta y Configuración) y `/admin/escanear` (menú
  «Escanear en eventos», también para admin de convocatoria); `EscanerEventos` (evento + modo, cámara con
  `BarcodeDetector` o **jsqr** bajo demanda, búsqueda manual, ficha con fotos para identificar al club, confirmación,
  «Siguiente club» que vuelve a la cámara e ignora 4 s el mismo QR), hook `useLectorQr`, `lib/escaneo.ts` (validación de
  respuestas). `QrLider` en el panel del líder; QR por club en `LogisticaPersonal` (habilitar / revocar con
  confirmación); en `LogisticaConvocatoria`, selección única para kit y QR masivos y botón «Reporte en Excel». El escaneo
  no enciende la pantalla de carga global (`lib/api.ts`).
- **Verificado:** e2e backend **84/84** (`e2e_especie_f4.php`: permisos por rol, alcance, QR falso / revocado / ajeno /
  largo, token cifrado, límites, correcciones, kit, revocar y rehabilitar, Excel con fórmula saneada, cabeceras),
  navegador real **25/25** con **cámara que lee un QR real** (video falso de Edge) a 390 y 1440 px, sin errores de
  consola; vitest **170/170**; regresión F1 53/53, F2 57/57, F3 57/57, registro 46/46, errores 13/13.

## 15. E55 — Solicitud de registro de escuela y participación previa (02/10/2026)

**Pedido del usuario:** si la escuela no está en el catálogo, en lugar de «comunícate con el COMECYT» debe haber un apartado
«Solicitar registro de escuela» cuyo formulario llegue como solicitud (notificación y correo) al panel, donde se acepta con
«¿Estás seguro de que quieres aceptar?» o se rechaza con motivo y «¿Estás seguro de que no quieres aceptar?». Además, en
`/admin/escuelas`, una marca de que la escuela ya participó y en qué temporada(s), como identificador.

| Tema | Decisión |
|---|---|
| Datos del formulario | Los del catálogo (CCT, nombre, municipio del Edomex, nivel, sistema) **+ contacto**: dirección, teléfono, directora/director |
| Mientras se revisa | El líder **avanza con su club** con la escuela «en revisión»; no puede enviarlo ni descargar la carta de la escuela. Al aceptarla, **se asigna sola** |
| Quién resuelve | **Admin y admin de convocatoria** (este, solo las de sus convocatorias; las demás → 404) |
| Al aceptar | Puede **corregir** los datos antes; confirma «¿Estás seguro…?» |
| Al rechazar | Motivo obligatorio y confirmación; el líder **corrige y vuelve a solicitar, o elige otra** escuela |
| CCT ya en el catálogo o ya solicitada | **Aviso** de que ya se registró y de contactar a la dirección escolar o a un admin del COMECYT (se bloquea) |
| Avisos | **Campana + correo** al personal (nueva) y al líder (aceptada / rechazada con motivo) |
| Dónde se revisa | **En Escuelas**, pestaña «Solicitudes de registro» con contador; la campana y el correo llevan ahí |
| Participación previa | Marca «Ya ha participado» + **varias temporadas** (texto del admin, etiquetas) |

**Implementación**
- **BD** (`2026_10_02_000002`): `escuela_solicitudes` (datos + contacto, `estado` pendiente/aceptada/rechazada, motivo,
  quién y cuándo, escuela creada; **índice único parcial: una pendiente por CCT**); `clubes.escuela_id` pasa a nulo +
  `clubes.escuela_solicitud_id` (en `$guarded`); `escuelas.participo_antes` + `temporadas` (JSON).
- **API:** líder `GET|POST /club/escuelas/solicitudes` (POST con throttle 5 cada 10 min y máx. 3 pendientes por líder);
  personal `GET /admin/escuelas/solicitudes?estado=` (con conteo), `POST …/{id}/aceptar` (datos corregibles; transacción
  con bloqueo; crea la escuela y la asigna a los clubes que esperaban) y `POST …/{id}/rechazar` (motivo ≥10). El alta y la
  edición del club aceptan `escuela_solicitud_id` (solo una solicitud **propia**, de esa convocatoria, no rechazada).
- **Validación:** CCT del Edomex (`15` + 3 letras + 4 dígitos + letra), municipio contra el catálogo SEPOMEX, teléfono de
  10 dígitos, textos sin HTML ni arranque de fórmula (`Escuela::textoSeguro`).
- **Avisos:** `EscuelaSolicitudAviso` (campana `escuela_solicitud` para el personal → `/admin/escuelas?tab=solicitudes`;
  `club_escuela_aceptada|rechazada` para el líder → su club). Bitácora: `escuela.solicitud_enviada|aceptada|rechazada`,
  `escuela.creada` (con «corregida» si el personal cambió datos).
- **Front:** `EscuelaPicker` ofrece «Solicitar registro de esta escuela» **dentro de la lista** cuando no hay resultados (la
  lista tapaba el enlace; se detectó en el navegador) y reutilizar una solicitud propia en revisión; `SolicitarEscuela`
  (formulario en línea, sin modal anidado); ficha del club con el aviso de rechazo y su motivo. Panel: `/admin/escuelas`
  con pestañas `CatalogoEscuelas` (solo admin; participación previa con `TemporadasInput` y filtro «ya participaron») y
  `SolicitudesEscuelas` (también admin de convocatoria).
- **Pruebas sin correos reales:** los admins tienen correo institucional; las pruebas detienen `comecyt-queue`, descartan
  los trabajos de **correo** de estos avisos, procesan solo los de campana y reinician la cola.

**Verificado:** backend **45/45** (`e2e_escuelas.php`: alta, duplicados, validaciones, 429, club en revisión, envío y carta
bloqueados, alcance del admin de convocatoria, aceptar con corrección, asignación automática, rechazo y nueva solicitud,
límite de pendientes, temporadas), navegador **15/15** (líder a 390 px, admin de convocatoria con confirmación, admin con
temporadas).

## 16. E57 — Solo PDF, modalidad, topes de logística y celebración (02/10/2026)

**Pedidos y decisiones del usuario:**
- «Todos los formatos que digan "Súbela escaneada" que sea específicamente… obligatorio en PDF» → carta de la escuela,
  carta de resguardo y formatos de transporte/box lunch solo en PDF (front y servidor, por contenido real).
- «En transporte y clubes así como el resto de apartados debe indicar para la modalidad que se están registrando» →
  la modalidad **es de la convocatoria** y se elige entre **estatal, nacional o internacional** (asistente y edición de la
  convocatoria). El líder ve «Modalidad: …» junto al folio y en cada apartado (datos, integrantes, documentos, envío,
  logística, kit, transporte y box lunch).
- «Al definir el total de transporte y/o box lunch deberá limitarse…» → **transporte:** los lugares por club los define y
  edita el personal; **box lunch:** como máximo, el número de integrantes definido al crear la convocatoria (el personal
  puede bajarlo, nunca subirlo).
- «Cuando dice "Tu club fue aceptado"… no me da la animación de confeti… hacerla más llamativa» → tarjeta de celebración
  rediseñada con confeti al cargar, al volver con scroll y con «Celebrar otra vez»; también con «reducir movimiento»
  (versión suave), porque en escritorio remoto Windows apaga las animaciones y el navegador lo reporta así.

**Técnico:** ver `CLAUDE.md` E57 (`especie_config.modalidad`, `LogisticaClub::limitesClub`, `useConfetiAlVer` con
`ultimo = -Infinity`, `ModalidadChip`, `.celebra-club`).

## 17. E79–E92 — Formatos, kit diferenciado, logística, edición por pasos y cambio de integrante (20/10/2026)

Decisiones del usuario de esta jornada (detalle técnico en `CLAUDE.md`, entradas E79 a E92):
- **Formatos institucionales (E79):** carta de la escuela, Formato A, B, C y permiso de uso de imagen (infantil o adulto,
  uno por integrante). Se descargan llenos con lo que exista (lo demás, línea para llenar a mano), con la franja de
  convivencia, en PDF sin edición; el líder los firma y sube; cada uno se aprueba o rechaza con motivo. Casillas «Pedir» y
  «Obligatorio» por convocatoria. Datos nuevos: director(a), lugar, grado, grupo, domicilio y tutor. Texto justificado y
  nombre del director donde firma la autoridad escolar, o línea para escribirlo (E91). **Vista previa** de cada formato
  con un club de ejemplo al crear o editar la convocatoria (20/10). Los textos son plantillas del código: cambiar su
  redacción es un cambio de desarrollo (no se editan desde el panel).
- **Folios (E80/E81):** incluyen los clubes (también en captura) y se publican; vista previa con todos los datos y la
  etiqueta Nueva escuela / Ya participó; exportación PDF y Excel completa, parcial o individual.
- **Kit diferenciado (E86):** «Kit Nueva escuela» (uno por integrante) y «Kit» para escuelas que ya participaron (número
  fijo por club), con lista de artículos editable; el perfil sale de la escuela y se cambia por club. **Sin kit en
  nacional ni internacional (E89).**
- **Transporte y box lunch (E87/E91):** salida definida por el líder (lugar, Google Maps y hora propuesta), regreso por el
  COMECYT; formato «Solicitud de Transporte y Box Lunch» (o «y/o» con un solo apoyo) con los dos renglones y «para
  cuántos»; no aparece al líder hasta que el personal lo habilita para toda la convocatoria.
- **Formatos siempre al día (E90):** líderes A y B cuentan como integrantes; si cambian los datos, lo firmado antes se
  marca «Desactualizado» y se pide de nuevo.
- **Configuración editable y por pasos (E88, 20/10):** datos propios por columna, etapas que se agregan, reordenan y quitan
  (salvo las que tienen clubes o historial). Editar la convocatoria es un marco por pasos (datos generales, modalidad e
  integrantes, kit, transporte, etapas, datos, formatos y documentos) y los pasos se pueden pulsar; también en el
  asistente de alta.
- **Cambio de integrante (E92):** ver la sección siguiente.

## 18. E92 — Solicitud de cambio de integrante (20/10/2026)

**Decisiones del usuario (cuestionario):**
- Se pide **desde que el club se envía y hasta una fecha límite** que define el admin en la convocatoria
  («Modalidad e integrantes» → «Fecha límite para cambios de integrante»). Sin fecha, no hay cambios. Mientras el club
  se puede editar (captura u observaciones en plazo), los integrantes se cambian directo.
- **Aprueban o rechazan el admin y el admin de convocatoria** (con alcance); rechazar exige motivo, que ve el líder.
- El nuevo integrante entrega **lo mismo que el anterior y sus formatos**: los datos que pide la convocatoria
  (obligatorios incluidos, CURP comparada con nombre y fecha), foto si se pide y el permiso de uso de imagen firmado, que
  se descarga ya lleno con sus datos.
- Quien sale queda de **baja con historial** (fecha y justificación), no se borra.
- Los líderes A y B no se cambian con esta solicitud (se cambian en «Acompañantes del club»). Una solicitud pendiente por
  club; el líder la puede cancelar.
- Al aprobar, el nuevo integrante entra con su permiso ya aprobado y los formatos que listan integrantes (carta, A, B, C)
  quedan desactualizados para volver a firmarlos.

## 19. E94 — Base de escuelas de robótica 2026-2027 (23/10/2026)

**Pedido:** cargar el Excel «BASE DE DATOS ROBÓTICA 2026-2027» (250 escuelas con su equipo) al catálogo, con el
identificador de participación y las temporadas, y que al elegir la escuela se recuperen sus datos para registrar el club.

**Decisiones del usuario (cuestionario):**
- **Temporadas:** Primera = 2022-2023, Segunda = 2023-2024, Tercera = 2024-2025, Cuarta = 2025-2026, Quinta = 2026-2027. Una
  escuela participó en **todas** las temporadas desde la suya hasta la actual (nunca dejó de participar).
- **Quinta = «Nueva escuela»** (60): conserva 2026-2027 en su historial pero no lleva «Ya participó». Primera a Cuarta (189)
  llevan «Ya participó».
- **Subsistema:** ESTATAL y SEB → estatal; Federalizado y SEIEM → federal. El texto original queda en un campo propio.
- **Campos nuevos** en `escuelas`: tipo de secundaria (general, técnica, telesecundaria) y zona (Indígena, Toluca,
  Ecatepec, Atlacomulco… de las 49 filas con columna extra), además de equipo, domicilio, ubicación (enlace y
  coordenadas), matrícula (total, hombres, mujeres), subsistema original y observaciones.
- **El admin ve todo** en Escuelas (tarjeta y formulario). **El líder** solo ve equipo, domicilio, ubicación y matrícula, y
  **solo después de elegir la escuela** (la lista de búsqueda no los trae).
- **Nombre del club:** se sugiere con el equipo de la escuela y el líder puede cambiarlo; la escuela va antes que el nombre
  en el registro y lo ya escrito por la persona nunca se pisa.
- **Temporadas al día:** cuando el comité acepta un club, la temporada de su convocatoria (su periodo `AAAA-AAAA`) entra sola
  al historial de la escuela. «Ya participó» se enciende solo si la escuela ya tenía otra temporada.
- Las 4 escuelas de prueba del catálogo se **desactivaron** (no se borraron: los 4 clubes existentes las usan).

**Cómo quedó la carga** (`php artisan escuelas:cargar-robotica "archivo.xlsx"` prueba sin guardar; con `--aplicar` guarda en una
sola transacción): 249 escuelas cargadas (189 «Ya participó», 60 «Nueva escuela»), 233 con equipo, 224 con enlace de mapa y
43 con coordenadas. Antes se sacó un respaldo de la BD (`backups\comecyt_antes-carga-escuelas_*.dump`).
- **No se cargó 1:** NP 141 (`15EPR0390`: a la CCT le falta un carácter). Hay que pedir la clave correcta.
- **Con observación visible al admin (46):** 16 sin equipo, 16 secundarias sin tipo, 8 con hombres + mujeres distinto de la
  matrícula general, 1 sin matrícula, 3 enlaces que no eran de mapas (acortar.link, escuelasmex.com, desysa.net, se
  descartaron), 1 coordenada sin signo menos (NP 103, descartada) y NP 131 con subsistema «BASICO» (se asignó estatal por la
  clave CCT `15EPR`; revisar).
- Municipios corregidos al nombre oficial: ACAMBAY → Acambay de Ruíz Castañeda, TUTLTITLÁN → Tultitlán, SANTO TOMÁS DE LOS
  PLATANOS → Santo Tomás, SANTA MARÍA RAYÓN → Rayón.

**Seguridad:** `ubicacion_url` solo acepta https de Google Maps o Apple Maps (`Escuela::urlMapaSegura`, espejo en
`urlMapaSegura` del front); se valida al guardar, al importar, al entregar al líder y al pintar el enlace
(`target="_blank"` con `rel="noopener noreferrer"`). Textos sin HTML ni arranque de fórmula (`Escuela::textoSeguro`);
coordenadas acotadas al Estado de México; matrícula entera 0–100 000.

**Piezas:** migración `2026_10_23_000001_escuelas_datos_carga`; `Escuela` (`urlMapaSegura`, `temporadaDeConvocatoria`,
`registrarTemporada`); `Admin\EscuelaController` (campos nuevos, búsqueda por equipo, importación con columnas
opcionales y plantilla ampliada); `GET club/escuelas/{escuela}/datos` (throttle 60/min, solo escuelas activas);
`RevisionClub::comite` (temporada al aceptar); `EscuelaPicker` (tarjeta con datos y `onDatos`), `CatalogoEscuelas` y
`TemporadasInput` (siempre visible, obligatoria solo con «Ya participó»); comando `CargarEscuelasRobotica`.

**Ajustes del mismo día (confirmados por el usuario):** NP 141 cargada con su CCT completa `15EPR0390D` (ya son 250 escuelas
activas: 189 «Ya participó» y 61 «Nueva escuela»); NP 131 confirmada como estatal (sin observación); el tipo de las 16
secundarias sin tipo se asignó por la clave CCT (letras 4-5: ES general, ST técnica, TV telesecundaria), regla que
coincidía con los 110 tipos que sí traía el Excel. Respaldo previo: `backups\comecyt_antes-ajustes-escuelas_*.dump`.

**Pendiente de datos:** los nombres de equipo de las 17 escuelas que no lo traen (el líder los escribe al registrar su club;
el admin puede completarlos en Escuelas → Editar).

**Verificado:** servidor 56/56 (`e2e_escuelas_e94.php` en transacción: enlaces maliciosos, HTML y fórmulas en equipo y
zona, coordenadas fuera de rango, matrícula negativa, importación con filas malas, qué ve el líder, escuela inactiva 404,
temporada al aceptar un club); navegador 60/60 a 1440 y 390 px (admin y líder, datos de prueba borrados); vitest 196/196.

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
