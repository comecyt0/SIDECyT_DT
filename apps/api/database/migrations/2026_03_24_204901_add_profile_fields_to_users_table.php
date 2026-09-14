<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add profile fields to users table (cargo, telefono, rol_id, institucion_id)
     * These may already exist via other migrations — we check first.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'cargo')) {
                $table->string('cargo')->nullable()->after('name');
            }
            if (! Schema::hasColumn('users', 'telefono')) {
                $table->string('telefono', 20)->nullable()->after('cargo');
            }
            if (! Schema::hasColumn('users', 'rol_id')) {
                $table->unsignedBigInteger('rol_id')->nullable()->after('telefono');
            }
            if (! Schema::hasColumn('users', 'institucion_id')) {
                $table->unsignedBigInteger('institucion_id')->nullable()->after('rol_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = ['cargo', 'telefono', 'rol_id', 'institucion_id'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
