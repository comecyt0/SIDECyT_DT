<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// E61 — «Acompañante de club»: líder B y director (opcional) con acceso al club que les da el líder.
//  - rol 9 `acompanante_club` (mismo patrón que lider_club: id explícito + setval de la secuencia);
//  - club_accesos: uno por tipo y por club; `colider` solo para el director (comparte el rol de líder mientras esté activo);
//  - users.debe_cambiar_password: cuentas creadas por el líder con contraseña que él definió → cambio obligatorio al entrar.
return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('roles')->where('id', 9)->exists()) {
            DB::table('roles')->insert(['id' => 9, 'nombre' => 'Acompañante de club', 'slug' => 'acompanante_club',
                'descripcion' => 'Líder B o director de un club: sigue su registro, su QR y su logística; el director puede ser colíder',
                'created_at' => now(), 'updated_at' => now()]);
        }
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("SELECT setval(pg_get_serial_sequence('roles','id'), (SELECT MAX(id) FROM roles))");
        }

        Schema::create('club_accesos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubes')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('tipo', 20); // lider_b | director
            $table->boolean('colider')->default(false);
            $table->timestamp('colider_desde')->nullable();
            $table->foreignId('otorgado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['club_id', 'tipo']);
            $table->unique(['club_id', 'user_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('debe_cambiar_password')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('debe_cambiar_password');
        });
        Schema::dropIfExists('club_accesos');
        DB::table('usuario_roles')->where('rol_id', 9)->delete();
        DB::table('roles')->where('id', 9)->delete();
    }
};
