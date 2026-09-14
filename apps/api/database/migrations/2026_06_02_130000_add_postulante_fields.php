<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Campos extendidos para el registro de postulantes:
 *
 * 1. `empresas` — datos fiscales/jurídicos:
 *    - rfc                  (RFC fiscal)
 *    - tipo_persona         (fisica | moral | asociacion_civil | otro)
 *    - rol_supervision      (texto libre — quién supervisa contratos en la empresa)
 *
 * 2. `users` — aceptación de términos:
 *    - terminos_aceptados_at  (timestamp del consent — null si no ha aceptado)
 *
 * 3. `solicitudes_acceso` — contactos del postulante por rol:
 *    - contactos (JSON)  — { responsable: {nombre, telefono, correo}, legal: {...}, administrativo: {...}, tecnico: {...} }
 *    - empresa_datos (JSON) — { rfc, tipo_persona, rol_supervision }
 *    - terminos_aceptados (boolean)
 *
 * Idempotente: chequea hasColumn antes de añadir.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('empresas')) {
            Schema::table('empresas', function (Blueprint $table) {
                if (! Schema::hasColumn('empresas', 'rfc')) {
                    $table->string('rfc', 13)->nullable()->after('correo');
                }
                if (! Schema::hasColumn('empresas', 'tipo_persona')) {
                    $table->string('tipo_persona', 30)->nullable()->after('rfc');
                }
                if (! Schema::hasColumn('empresas', 'rol_supervision')) {
                    $table->string('rol_supervision', 255)->nullable()->after('representante_legal');
                }
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'terminos_aceptados_at')) {
                    $table->timestamp('terminos_aceptados_at')->nullable()->after('ultimo_acceso');
                }
            });
        }

        if (Schema::hasTable('solicitudes_acceso')) {
            Schema::table('solicitudes_acceso', function (Blueprint $table) {
                if (! Schema::hasColumn('solicitudes_acceso', 'contactos')) {
                    $table->json('contactos')->nullable();
                }
                if (! Schema::hasColumn('solicitudes_acceso', 'empresa_datos')) {
                    $table->json('empresa_datos')->nullable();
                }
                if (! Schema::hasColumn('solicitudes_acceso', 'terminos_aceptados')) {
                    $table->boolean('terminos_aceptados')->default(false);
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('empresas')) {
            Schema::table('empresas', function (Blueprint $table) {
                foreach (['rfc', 'tipo_persona', 'rol_supervision'] as $col) {
                    if (Schema::hasColumn('empresas', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'terminos_aceptados_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('terminos_aceptados_at');
            });
        }
        if (Schema::hasTable('solicitudes_acceso')) {
            Schema::table('solicitudes_acceso', function (Blueprint $table) {
                foreach (['contactos', 'empresa_datos', 'terminos_aceptados'] as $col) {
                    if (Schema::hasColumn('solicitudes_acceso', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
