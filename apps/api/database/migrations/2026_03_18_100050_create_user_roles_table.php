<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('rol_id')->nullable()->constrained('roles')->nullOnDelete();
            $table->foreignId('institucion_id')->nullable()->constrained('instituciones')->nullOnDelete();
            $table->string('telefono', 30)->nullable()->after('email');
            $table->string('cargo', 150)->nullable()->after('telefono');
            $table->boolean('activo')->default(true)->after('cargo');
            $table->timestamp('ultimo_acceso')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['rol_id']);
            $table->dropForeign(['institucion_id']);
            $table->dropColumn(['rol_id', 'institucion_id', 'telefono', 'cargo', 'activo', 'ultimo_acceso']);
        });
    }
};
