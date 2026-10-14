<?php
// E72 paso 5 — Prueba de punta a punta del backend de evaluación de SIGAE contra producción, con datos desechables.
// Notification::fake(): no sale ningún correo ni aviso real. Todo lo creado se borra en el finally.
chdir('F:\\comecyt\\apps\\api');
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AsignacionEvaluador;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

Notification::fake();
$ok = 0; $total = 0; $ids = ['users' => [], 'empresas' => [], 'tipo' => null, 'conv' => null, 'sol' => [], 'tokens' => []];
function caso(string $n, bool $c, string $d = ''): void { global $ok, $total; $total++; if ($c) { $ok++; } echo ($c ? '[OK] ' : '[FALLA] ').$n.($d !== '' ? " ($d)" : '')."\n"; }
function pedir(string $m, string $uri, ?User $u, array $body = []): array {
    global $kernel, $ids;
    $h = ['HTTP_ACCEPT' => 'application/json', 'CONTENT_TYPE' => 'application/json', 'REMOTE_ADDR' => '127.0.0.1'];
    if ($u) { $t = auth('api')->login($u); $ids['tokens'][] = $t; $h['HTTP_AUTHORIZATION'] = 'Bearer '.$t; }
    $r = Request::create('/api'.$uri, $m, [], [], [], $h, $body ? json_encode($body) : null);
    // JWTAuth guarda el token de la primera petición en su singleton; en producción cada petición arranca limpia.
    PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth::unsetToken();
    PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth::setRequest($r);
    $res = $kernel->handle($r); $kernel->terminate($r, $res);
    if ($res->getStatusCode() === 404 && property_exists($res, 'exception') && $res->exception) {
        $e = $res->exception; $p = $e->getPrevious();
        $GLOBALS['ultimo404'] = get_class($e).': '.$e->getMessage().($p ? ' <- '.get_class($p).': '.$p->getMessage().' @ '.basename($p->getFile()).':'.$p->getLine() : ' @ '.basename($e->getFile()).':'.$e->getLine());
    }
    auth('api')->forgetUser(); app('auth')->forgetGuards();
    $GLOBALS['ultimaResp'] = json_decode((string) $res->getContent(), true);
    return [$res->getStatusCode(), $GLOBALS['ultimaResp']];
}
$hoy = App\Models\Convocatoria::hoy();
$mk = function (string $nombre, int $rol, ?int $empresa = null, array $extra = []) use (&$ids) {
    $u = new User; $u->forceFill(['name' => $nombre, 'email' => 'e72.'.uniqid().'@example.invalid', 'password' => Hash::make('Prueba-E72-'.uniqid()),
        'rol_id' => $rol, 'activo' => true, 'empresa_id' => $empresa] + $extra)->save();
    $ids['users'][] = $u->id; return $u;
};
try {
    $emp = DB::table('empresas')->insertGetId(['nombre' => 'Empresa E72 Prueba Uno', 'activo' => true, 'created_at' => now(), 'updated_at' => now()]);
    $emp2 = DB::table('empresas')->insertGetId(['nombre' => 'Empresa E72 Prueba Dos', 'activo' => true, 'created_at' => now(), 'updated_at' => now()]);
    $ids['empresas'] = [$emp, $emp2];
    $admin = $mk('Admin E72', 1);
    $eva = $mk('Evaluadora E72', 3, null, ['datos_registro' => ['institucion' => 'empresa e72 prueba uno']]);
    $eva2 = $mk('Evaluador Dos E72', 3);
    $sol = $mk('Solicitante E72', 4, $emp);
    $sol2 = $mk('Solicitante Dos E72', 4, $emp2);

    $tipo = DB::table('tipo_programas')->insertGetId(['clave' => 'E72'.random_int(100, 999), 'nombre' => 'Programa E72', 'tipo_apoyo' => 'reembolso',
        'puntaje_minimo_aprobatorio' => 75, 'activo' => true, 'created_at' => now(), 'updated_at' => now()]);
    $ids['tipo'] = $tipo;
    $cr1 = DB::table('programa_criterios_evaluacion')->insertGetId(['tipo_programa_id' => $tipo, 'nombre' => 'Técnica', 'ponderacion' => 50, 'puntaje_maximo' => 30, 'orden' => 1, 'activo' => true, 'created_at' => now(), 'updated_at' => now()]);
    $cr2 = DB::table('programa_criterios_evaluacion')->insertGetId(['tipo_programa_id' => $tipo, 'nombre' => 'Impacto', 'ponderacion' => 50, 'puntaje_maximo' => 20, 'orden' => 2, 'activo' => true, 'created_at' => now(), 'updated_at' => now()]);
    $conv = DB::table('convocatorias')->insertGetId(['nombre' => 'Convocatoria E72', 'ejercicio_fiscal' => '2026', 'fecha_apertura' => $hoy, 'fecha_cierre' => $hoy,
        'estado' => 'borrador', 'tipo_programa_id' => $tipo, 'created_at' => now(), 'updated_at' => now()]);
    $ids['conv'] = $conv;
    $mkSol = function (User $u, int $e, string $estado = 'en_evaluacion') use ($conv, &$ids) {
        $id = DB::table('solicitudes')->insertGetId(['folio' => 'E72-'.uniqid(), 'convocatoria_id' => $conv, 'user_id' => $u->id, 'empresa_id' => $e,
            'titulo_proyecto' => 'Proyecto E72', 'descripcion_proyecto' => 'Descripción de prueba', 'estado' => $estado, 'created_at' => now(), 'updated_at' => now()]);
        $ids['sol'][] = $id; return App\Models\Solicitud::find($id);
    };
    $s1 = $mkSol($sol, $emp);
    $s2 = $mkSol($sol2, $emp2);
    $sBorrador = $mkSol($sol2, $emp2, 'borrador');
    $fecha = Illuminate\Support\Carbon::parse($hoy)->addDays(5)->toDateString();

    // ── Asignación ──
    [$c] = pedir('POST', '/admin/asignaciones-evaluador', $admin, ['solicitud_id' => $sBorrador->id, 'evaluador_id' => $eva2->id, 'fecha_limite' => $fecha]);
    caso('Asignar una solicitud que no está en evaluación → 422', $c === 422, "HTTP $c");
    [$c] = pedir('POST', '/admin/asignaciones-evaluador', $admin, ['solicitud_id' => $s1->id, 'evaluador_id' => $eva2->id, 'fecha_limite' => $hoy]);
    caso('Fecha límite hoy o pasada → 422', $c === 422, "HTTP $c");
    [$c, $j] = pedir('GET', "/admin/solicitudes/{$s1->id}/candidatos-evaluador", $admin);
    $fila = collect($j)->firstWhere('id', $eva->id);
    caso('Candidatos marcan "misma_institucion" (institución del registro = empresa del solicitante)', $c === 200 && in_array('misma_institucion', array_column($fila['conflictos'] ?? [], 'tipo'), true), "HTTP $c");
    [$c, $j] = pedir('POST', '/admin/asignaciones-evaluador', $admin, ['solicitud_id' => $s1->id, 'evaluador_id' => $eva->id, 'fecha_limite' => $fecha]);
    caso('Con conflicto sin confirmar → 409 con la lista', $c === 409 && ($j['conflictos'][0]['tipo'] ?? '') === 'misma_institucion', "HTTP $c");
    [$c] = pedir('POST', '/admin/asignaciones-evaluador', $admin, ['solicitud_id' => $s1->id, 'evaluador_id' => $eva->id, 'fecha_limite' => $fecha, 'acepto_conflictos' => true]);
    caso('Confirmando el conflicto → 201', $c === 201, "HTTP $c");
    [$c] = pedir('POST', '/admin/asignaciones-evaluador', $admin, ['solicitud_id' => $s1->id, 'evaluador_id' => $eva2->id, 'fecha_limite' => $fecha]);
    caso('Segundo evaluador sin conflictos → 201', $c === 201, "HTTP $c");
    caso('La persona evaluadora recibe el aviso EvaluacionAsignada (correo + campana)', Notification::sent($eva, App\Notifications\EvaluacionAsignada::class)->count() === 1);
    $a1 = AsignacionEvaluador::where('solicitud_id', $s1->id)->where('evaluador_id', $eva->id)->first();
    $a2 = AsignacionEvaluador::where('solicitud_id', $s1->id)->where('evaluador_id', $eva2->id)->first();
    caso('asignado_por y conflictos_aceptados quedan guardados', (int) $a1->asignado_por === $admin->id && ($a1->conflictos_aceptados[0]['tipo'] ?? '') === 'misma_institucion');

    // Bloqueo: el admin decide no asignar a eva en toda la convocatoria; ya no puede asignarse a s2
    [$c] = pedir('POST', "/admin/solicitudes/{$s2->id}/bloquear-evaluador", $admin, ['evaluador_id' => $eva->id, 'alcance' => 'convocatoria', 'motivo' => 'Conflicto declarado']);
    [$c2, $j] = pedir('POST', '/admin/asignaciones-evaluador', $admin, ['solicitud_id' => $s2->id, 'evaluador_id' => $eva->id, 'fecha_limite' => $fecha, 'acepto_conflictos' => true]);
    caso('Bloqueada para la convocatoria → 422 aunque confirme', $c === 200 && $c2 === 422, "HTTP $c / $c2");
    // Autoevaluación
    $evaSol = $mk('Evaluador que solicita E72', 3, $emp2);
    $sPropia = $mkSol($evaSol, $emp2);
    [$c] = pedir('POST', '/admin/asignaciones-evaluador', $admin, ['solicitud_id' => $sPropia->id, 'evaluador_id' => $evaSol->id, 'fecha_limite' => $fecha, 'acepto_conflictos' => true]);
    caso('Propia solicitud → 422 siempre', $c === 422, "HTTP $c");

    // ── Evaluador ──
    [$c, $j] = pedir('GET', '/evaluador/asignaciones', $eva);
    $json = json_encode($j, JSON_UNESCAPED_UNICODE);
    caso('Lista del evaluador con lista blanca (sin correo ni notas internas)', $c === 200 && ($j['sistema'] ?? '') === 'sigae' && ! str_contains($json, '@example.invalid') && ! str_contains($json, 'notas_internas'), "HTTP $c");
    [$c, $j] = pedir('GET', "/evaluador/asignaciones/{$a1->id}", $eva);
    $json = json_encode($j, JSON_UNESCAPED_UNICODE);
    caso('Expediente: rúbrica dinámica 30+20=50 y mínimo 75 %', $c === 200 && ($j['rubrica']['maximo'] ?? 0) == 50 && ($j['rubrica']['minimo_aprobatorio'] ?? 0) == 75, "HTTP $c ".mb_substr(json_encode($j, JSON_UNESCAPED_UNICODE), 0, 300));
    if ($c === 404) {
        $ex = null;
        try { $ctl = app(App\Http\Controllers\Evaluaciones\EvaluadorController::class); $rq = Request::create('/x'); $rq->setUserResolver(fn () => $eva); $ctl->show($rq, AsignacionEvaluador::find($a1->id)); }
        catch (Throwable $e) { $ex = get_class($e).': '.$e->getMessage().' @ '.basename($e->getFile()).':'.$e->getLine(); }
        echo "   directo: ".($ex ?? 'sin excepción')."\n";
        echo '   excepcion http: '.($GLOBALS['ultimo404'] ?? 'no capturada')."\n";
        [$cm, $jm] = pedir('GET', '/auth/me', $eva);
        echo "   /auth/me como eva ({$eva->id}): HTTP $cm id=".json_encode($jm['user']['id'] ?? $jm['id'] ?? null).' a1.evaluador_id='.$a1->evaluador_id."\n";
        [$cl, $jl] = pedir('GET', '/evaluador/asignaciones', $eva);
        echo '   lista como eva: '.json_encode(array_column($jl['datos'] ?? [], 'id'))." (a1={$a1->id}, a2={$a2->id})\n";
        $evaFresca = User::find($eva->id);
        echo '   rol_id='.json_encode($evaFresca->rol_id).' tieneRol(evaluador)='.json_encode($evaFresca->tieneRol('evaluador'))
            .' alcanceIds='.json_encode(App\Support\Alcance::convocatoriaIds($evaFresca))
            .' directo='.AsignacionEvaluador::where('evaluador_id', $eva->id)->count()
            .' conAlcance='.App\Support\Alcance::aplicarPorSolicitud(AsignacionEvaluador::where('evaluador_id', $eva->id), $evaFresca)->count()."\n";
        $rq2 = Request::create('/x'); $rq2->setUserResolver(fn () => $evaFresca);
        $resp = app(App\Http\Controllers\Evaluaciones\EvaluadorController::class)->asignaciones($rq2);
        echo '   controlador directo: '.mb_substr($resp->getContent(), 0, 400)."\n";
        echo '   sql: '.App\Support\Alcance::aplicarPorSolicitud(AsignacionEvaluador::where('evaluador_id', $eva->id)->orderByRaw("case estado when 'evaluando' then 0 when 'asignado' then 1 else 2 end")->orderBy('fecha_limite'), $evaFresca)->toRawSql()."\n";
        try { App\Support\Alcance::olvidar(); App\Support\Alcance::exigirSolicitud($eva, App\Models\Solicitud::find($s1->id)); echo "   alcance: ok\n"; }
        catch (Throwable $e) { echo '   alcance: '.get_class($e).': '.$e->getMessage()."\n"; }
        $ruta = app('router')->getRoutes()->match(Request::create("/api/evaluador/asignaciones/{$a1->id}", 'GET'));
        echo '   ruta: '.$ruta->uri().' -> '.$ruta->getActionName().' mw='.implode(',', $ruta->gatherMiddleware())."\n";
    }
    caso('Expediente sin datos de contacto ni otros evaluadores', ! str_contains($json, '@example.invalid') && ! str_contains($json, 'Evaluador Dos E72') && ! str_contains($json, 'promedio'));
    [$c] = pedir('GET', "/evaluador/asignaciones/{$a2->id}", $eva);
    caso('Asignación de otra persona → 404', $c === 404, "HTTP $c");
    [$c] = pedir('GET', "/evaluador/asignaciones/{$a1->id}", $sol);
    caso('Un solicitante no entra al panel de evaluador', in_array($c, [403, 404], true), "HTTP $c");

    $k1 = 'c'.$cr1; $k2 = 'c'.$cr2;
    [$c] = pedir('POST', "/evaluador/asignaciones/{$a1->id}/dictamen", $eva, ['puntajes' => [$k1 => 25], 'comentarios_justificacion' => 'Falta un criterio por calificar.', 'carta_imparcialidad_aceptada' => true]);
    caso('Dictamen sin calificar todos los criterios → 422', $c === 422, "HTTP $c");
    [$c] = pedir('POST', "/evaluador/asignaciones/{$a1->id}/dictamen", $eva, ['puntajes' => [$k1 => 35, $k2 => 10], 'comentarios_justificacion' => 'Puntaje por encima del máximo.', 'carta_imparcialidad_aceptada' => true]);
    caso('Criterio por encima de su máximo → 422', $c === 422, "HTTP $c");
    [$c] = pedir('POST', "/evaluador/asignaciones/{$a1->id}/dictamen", $eva, ['puntajes' => [$k1 => 25, $k2 => 15], 'comentarios_justificacion' => 'Sin carta de imparcialidad.']);
    caso('Sin carta de imparcialidad → 422', $c === 422, "HTTP $c");
    [$c] = pedir('POST', "/evaluador/asignaciones/{$a1->id}/dictamen", $eva, ['puntajes' => [$k1 => 25, $k2 => 15], 'comentarios_justificacion' => '<script>alert(1)</script> Proyecto con buena base técnica.', 'carta_imparcialidad_aceptada' => true]);
    caso('Dictamen válido (40/50 = 80 %) → 201', $c === 201, "HTTP $c ".mb_substr(json_encode($GLOBALS['ultimaResp'] ?? null, JSON_UNESCAPED_UNICODE), 0, 400));
    [$c] = pedir('POST', "/evaluador/asignaciones/{$a1->id}/dictamen", $eva, ['puntajes' => [$k1 => 30, $k2 => 20], 'comentarios_justificacion' => 'Intento de cambiar el dictamen.', 'carta_imparcialidad_aceptada' => true]);
    caso('Reenviar el dictamen → 409 (se cierra al enviarlo)', $c === 409, "HTTP $c");
    caso('El dictamen NO cambió el estado de la solicitud', $s1->fresh()->estado === 'en_evaluacion');

    // ── Fecha límite vencida ──
    $a2->forceFill(['fecha_limite' => Illuminate\Support\Carbon::parse($hoy)->subDay()->toDateString()])->save();
    [$c, $j] = pedir('GET', "/evaluador/asignaciones/{$a2->id}", $eva2);
    [$c2] = pedir('POST', "/evaluador/asignaciones/{$a2->id}/dictamen", $eva2, ['puntajes' => [$k1 => 20, $k2 => 10], 'comentarios_justificacion' => 'Fuera de la fecha límite.', 'carta_imparcialidad_aceptada' => true]);
    caso('Vencida: estado "vencida" y no se puede enviar', ($j['estado'] ?? '') === 'vencida' && $c2 === 422, "HTTP $c2");
    // Con a2 vencida no cuenta como pendiente: el admin podría decidir; primero la amplía y la persona envía
    [$c] = pedir('PUT', "/admin/asignaciones-evaluador/{$a2->id}/fecha", $admin, ['fecha_limite' => $fecha]);
    [$cd] = pedir('POST', "/admin/solicitudes/{$s1->id}/evaluacion/decidir", $admin, ['resultado' => 'aprobada', 'motivo' => 'Intento de decidir con un dictamen pendiente']);
    caso('El admin no decide con un dictamen pendiente (no vencido) → 422', $cd === 422 && $s1->fresh()->estado === 'en_evaluacion', "HTTP $cd");
    [$c2] = pedir('POST', "/evaluador/asignaciones/{$a2->id}/dictamen", $eva2, ['puntajes' => [$k1 => 20, $k2 => 10], 'comentarios_justificacion' => 'Dentro del nuevo plazo, con detalle.', 'carta_imparcialidad_aceptada' => true]);
    caso('El admin amplía la fecha y ya se puede enviar', $c === 200 && $c2 === 201, "HTTP $c / $c2 ".mb_substr(json_encode($GLOBALS['ultimaResp'] ?? null, JSON_UNESCAPED_UNICODE), 0, 300));

    // ── Resultado y decisión del admin ──
    [$c, $j] = pedir('GET', "/admin/solicitudes/{$s1->id}/evaluacion", $admin);
    caso('Resultado: 2 dictámenes, promedio 35/50 = 70 % < 75 % mínimo', $c === 200 && $j['concluidos'] === 2 && (float) $j['promedio'] === 35.0 && $j['alcanza_minimo'] === false, "HTTP $c ".json_encode([$j['promedio'] ?? null, $j['porcentaje'] ?? null]));
    caso('El admin ve el comentario como texto, tal cual', str_contains(json_encode($j), '<script>alert(1)<\/script>'));
    [$c] = pedir('POST', "/admin/solicitudes/{$s1->id}/evaluacion/decidir", $eva, ['resultado' => 'aprobada', 'motivo' => 'Un evaluador intenta decidir']);
    caso('Un evaluador no puede decidir el resultado', in_array($c, [403, 404], true), "HTTP $c");
    [$c] = pedir('POST', "/admin/asignaciones-evaluador/{$a1->id}/reabrir", $admin, ['motivo' => 'Error de captura en un criterio']);
    caso('El admin reabre un dictamen', $c === 200 && $a1->fresh()->estado === 'evaluando', "HTTP $c");
    [$c] = pedir('POST', "/evaluador/asignaciones/{$a1->id}/dictamen", $eva, ['puntajes' => [$k1 => 28, $k2 => 18], 'comentarios_justificacion' => 'Versión corregida tras reapertura.', 'carta_imparcialidad_aceptada' => true]);
    [$c2] = pedir('POST', "/admin/solicitudes/{$s1->id}/evaluacion/decidir", $admin, ['resultado' => 'aprobada', 'motivo' => 'Promedio 38/50 = 76 %, supera el mínimo.']);
    caso('Decisión del admin: aprobada y ministración 1 creada', $c === 201 && $c2 === 200 && $s1->fresh()->estado === 'aprobada'
        && DB::table('ministraciones')->where('solicitud_id', $s1->id)->where('numero_tranche', 1)->exists(), "HTTP $c / $c2");
    caso('El solicitante recibe el resultado (EvaluacionCompletada) al decidir el admin', Notification::sent($sol, App\Notifications\EvaluacionCompletada::class)->count() === 1);
    [$c] = pedir('POST', "/admin/asignaciones-evaluador/{$a1->id}/reabrir", $admin, ['motivo' => 'Intento tras decidir']);
    caso('Con resultado ya no se reabre un dictamen → 422', $c === 422, "HTTP $c");
    [$c] = pedir('DELETE', "/admin/asignaciones-evaluador/{$a2->id}", $admin);
    caso('No se desasigna una evaluación concluida → 422', $c === 422, "HTTP $c");

    // ── PDF del dictamen con los criterios de la convocatoria ──
    $d1 = App\Models\Dictamen::where('asignacion_id', $a1->id)->first();
    $crudo = function (string $uri, User $u) use (&$ids, $kernel) {
        $t = auth('api')->login($u); $ids['tokens'][] = $t;
        $r = Request::create('/api'.$uri, 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/pdf', 'REMOTE_ADDR' => '127.0.0.1', 'HTTP_AUTHORIZATION' => 'Bearer '.$t]);
        PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth::unsetToken(); PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth::setRequest($r);
        $res = $kernel->handle($r); $kernel->terminate($r, $res); auth('api')->forgetUser(); app('auth')->forgetGuards();
        return [$res->getStatusCode(), (string) $res->headers->get('Content-Type'), (string) $res->getContent()];
    };
    [$c, $tipoPdf, $cuerpo] = $crudo("/documentos/dictamen/{$d1->id}", $admin);
    caso('El admin descarga el PDF del dictamen', $c === 200 && str_contains($tipoPdf, 'pdf') && str_starts_with($cuerpo, '%PDF'), "HTTP $c $tipoPdf");
    [$c] = $crudo("/documentos/dictamen/{$d1->id}", $eva);
    [$c2] = $crudo("/documentos/dictamen/{$d1->id}", $eva2);
    caso('La autora descarga su PDF; otra persona evaluadora no', $c === 200 && $c2 === 403, "HTTP $c / $c2");
    $det = App\Support\RubricaSigae::detalleDictamen($d1);
    $html = view('pdfs.dictamen', ['dictamen' => $d1->load(['asignacion.solicitud.empresa', 'asignacion.solicitud.convocatoria.tipoPrograma', 'asignacion.evaluador']),
        'firma' => [], 'detalle' => $det, 'minimo' => 75.0, 'porcentaje' => 92.0])->render();
    caso('El PDF lista los criterios de la convocatoria (Técnica 28/30, Impacto 18/20; total 46/50), no los 4 fijos',
        $det['maximo'] == 50 && array_column($det['renglones'], 'nombre') === ['Técnica', 'Impacto'] && str_contains($html, 'Técnica') && ! str_contains($html, 'Relevancia'),
        json_encode($det, JSON_UNESCAPED_UNICODE));
    caso('El PDF no presenta un dictamen como resultado final y escapa el comentario',
        str_contains($html, 'lo decide la administración') && ! str_contains($html, 'SUCEPTIBLE') && ! str_contains($html, '<script>alert'));
    // Ocultar un criterio después (EstructuraPrograma lo oculta si ya tiene calificaciones): el PDF lo sigue mostrando
    DB::table('programa_criterios_evaluacion')->where('id', $cr2)->update(['activo' => false]);
    caso('Un criterio ocultado después sigue en el PDF del dictamen', count(App\Support\RubricaSigae::detalleDictamen($d1)['renglones']) === 2);

    // ── Recordatorios ──
    $a3 = AsignacionEvaluador::create(['solicitud_id' => $s2->id, 'evaluador_id' => $eva2->id, 'estado' => 'asignado', 'asignado_por' => $admin->id,
        'fecha_limite' => Illuminate\Support\Carbon::parse($hoy)->addDays(2)->toDateString()]);
    Illuminate\Support\Facades\Artisan::call('evaluacion:recordatorios');
    Illuminate\Support\Facades\Artisan::call('evaluacion:recordatorios');
    $avisos = Notification::sent($eva2, App\Notifications\EvaluacionAsignada::class)->count();
    caso('Recordatorio de 2 días antes, una sola vez', $a3->fresh()->aviso_previo_at !== null && $avisos === 2, "avisos a eva2: $avisos (1 asignación + 1 recordatorio)");
} catch (Throwable $e) {
    caso('Excepción: '.$e->getMessage().' @ '.basename($e->getFile()).':'.$e->getLine(), false);
} finally {
    foreach ($ids['tokens'] as $t) { try { auth('api')->setToken($t)->invalidate(true); } catch (Throwable) {} }
    $sols = $ids['sol'];
    if ($sols) {
        $asig = DB::table('asignaciones_evaluador')->whereIn('solicitud_id', $sols)->pluck('id');
        $dic = DB::table('dictamenes')->whereIn('asignacion_id', $asig)->pluck('id');
        DB::table('solicitud_criterios_evaluacion')->whereIn('dictamen_id', $dic)->delete();
        DB::table('dictamenes')->whereIn('id', $dic)->delete();
        DB::table('asignaciones_evaluador')->whereIn('id', $asig)->delete();
        DB::table('ministraciones')->whereIn('solicitud_id', $sols)->delete();
        DB::table('solicitud_historial')->whereIn('solicitud_id', $sols)->delete();
        DB::table('notificaciones_log')->whereIn('solicitud_id', $sols)->delete();
        DB::table('solicitudes')->whereIn('id', $sols)->delete();
    }
    if ($ids['conv']) { DB::table('bloqueos_conflicto')->where('convocatoria_id', $ids['conv'])->delete(); DB::table('convocatorias')->where('id', $ids['conv'])->delete(); }
    if ($ids['tipo']) { DB::table('programa_criterios_evaluacion')->where('tipo_programa_id', $ids['tipo'])->delete(); DB::table('tipo_programas')->where('id', $ids['tipo'])->delete(); }
    if ($ids['users']) { DB::table('notificaciones_log')->whereIn('user_id', $ids['users'])->delete(); DB::table('usuario_roles')->whereIn('user_id', $ids['users'])->delete(); DB::table('users')->whereIn('id', $ids['users'])->delete(); }
    DB::table('empresas')->whereIn('id', $ids['empresas'])->delete();
    $quedan = DB::table('users')->where('email', 'like', 'e72.%@example.invalid')->count() + DB::table('solicitudes')->where('folio', 'like', 'E72-%')->count();
    echo "\nLimpieza: quedan $quedan registros de prueba\n$ok/$total\n";
}
