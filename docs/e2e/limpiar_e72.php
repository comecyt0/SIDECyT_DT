<?php
// Limpieza dirigida de los datos de prueba E72 que dejó una corrida interrumpida. Solo toca lo creado por la prueba:
// cuentas e72.*@example.invalid, folios E72-*, convocatoria/programa/empresas con nombre E72.
chdir('F:\\comecyt\\apps\\api');
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\DB;

$usuarios = DB::table('users')->where('email', 'like', 'e72.%@example.invalid')->pluck('id');
$convs = DB::table('convocatorias')->where('nombre', 'Convocatoria E72')->pluck('id');
$sols = DB::table('solicitudes')->where('folio', 'like', 'E72-%')->orWhereIn('convocatoria_id', $convs)->pluck('id');
$tipos = DB::table('tipo_programas')->where('nombre', 'Programa E72')->pluck('id');
echo "usuarios={$usuarios->count()} solicitudes={$sols->count()} convocatorias={$convs->count()} tipos={$tipos->count()}\n";

DB::transaction(function () use ($usuarios, $convs, $sols, $tipos) {
    $asig = DB::table('asignaciones_evaluador')->whereIn('solicitud_id', $sols)->orWhereIn('evaluador_id', $usuarios)->pluck('id');
    $dic = DB::table('dictamenes')->whereIn('asignacion_id', $asig)->pluck('id');
    DB::table('solicitud_criterios_evaluacion')->whereIn('dictamen_id', $dic)->delete();
    DB::table('dictamenes')->whereIn('id', $dic)->delete();
    DB::table('asignaciones_evaluador')->whereIn('id', $asig)->delete();
    DB::table('ministraciones')->whereIn('solicitud_id', $sols)->delete();
    DB::table('solicitud_historial')->whereIn('solicitud_id', $sols)->delete();
    DB::table('notificaciones_log')->whereIn('solicitud_id', $sols)->orWhereIn('user_id', $usuarios)->delete();
    DB::table('solicitudes')->whereIn('id', $sols)->delete();
    DB::table('bloqueos_conflicto')->whereIn('convocatoria_id', $convs)->orWhereIn('evaluador_id', $usuarios)->delete();
    DB::table('convocatorias')->whereIn('id', $convs)->delete();
    DB::table('programa_criterios_evaluacion')->whereIn('tipo_programa_id', $tipos)->delete();
    DB::table('tipo_programas')->whereIn('id', $tipos)->delete();
    DB::table('usuario_roles')->whereIn('user_id', $usuarios)->delete();
    DB::table('users')->whereIn('id', $usuarios)->delete();
    DB::table('empresas')->where('nombre', 'like', 'Empresa E72 Prueba%')->delete();
});

$quedan = DB::table('users')->where('email', 'like', 'e72.%@example.invalid')->count()
    + DB::table('solicitudes')->where('folio', 'like', 'E72-%')->count()
    + DB::table('convocatorias')->where('nombre', 'Convocatoria E72')->count()
    + DB::table('empresas')->where('nombre', 'like', 'Empresa E72 Prueba%')->count();
echo "quedan=$quedan\n";
