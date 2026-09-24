<?php

namespace Database\Seeders;

use App\Models\Empresa;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $roles = [
            ['nombre' => 'Administrador COMECYT', 'slug' => 'admin', 'descripcion' => 'Control total del sistema'],
            ['nombre' => 'Revisor COMECYT', 'slug' => 'revisor', 'descripcion' => 'Revisión documental de solicitudes'],
            ['nombre' => 'Evaluador Institucional', 'slug' => 'evaluador', 'descripcion' => 'Evaluador técnico/académico'],
            ['nombre' => 'Solicitante Institucional', 'slug' => 'solicitante', 'descripcion' => 'Investigador / Representante de institución'],
        ];

        foreach ($roles as $role) {
            Rol::updateOrCreate(['slug' => $role['slug']], $role);
        }

        // 2. Institución por defecto (COMECYT)
        $comecyt = Empresa::updateOrCreate(
            ['acronimo' => 'COMECYT'],
            [
                'nombre' => 'Consejo Mexiquense de Ciencia y Tecnología',
                'tipo' => 'publica',
                'estado' => 'Estado de México',
                'municipio' => 'Toluca',
                'activo' => true,
            ]
        );

        // 3. Admin principal
        // SEGURIDAD (24/09/2026): antes era updateOrCreate con una contraseña fija publicada en el repositorio,
        // y deploy.sh corre este seeder con --force: cada despliegue devolvía el admin de PRODUCCIÓN a esa
        // contraseña. Ahora solo se CREA si no existe y NUNCA se tocan los datos de una cuenta existente.
        // Contraseña inicial: ADMIN_INITIAL_PASSWORD del entorno o, si no está, una aleatoria que se muestra
        // una sola vez en la consola de quien instala (hay que cambiarla al entrar).
        $adminRol = Rol::where('slug', 'admin')->first();
        $adminEmail = env('ADMIN_INITIAL_EMAIL', 'admin@comecyt.gob.mx');

        if (! User::where('email', $adminEmail)->exists()) {
            $inicial = (string) env('ADMIN_INITIAL_PASSWORD', '');
            $generada = $inicial === '';
            if ($generada) {
                $inicial = Str::password(24);
            }

            User::create([
                'name' => 'Super Administrador',
                'email' => $adminEmail,
                'password' => Hash::make($inicial),
                'rol_id' => $adminRol->id,
                'empresa_id' => $comecyt->id,
                'cargo' => 'Director',
                'email_verified_at' => now(),
                'remember_token' => Str::random(10),
            ]);

            $this->command->info("Usuario admin creado: {$adminEmail}");
            if ($generada) {
                $this->command->warn("Contraseña inicial (se muestra UNA vez, cámbiala al entrar): {$inicial}");
            }
        } else {
            $this->command->info("Usuario admin ya existe ({$adminEmail}): no se modifica.");
        }

        // 3.5 Usuarios de prueba — SOLO en entornos locales/testing
        // NUNCA crear estos usuarios en producción: tienen contraseñas públicas conocidas
        if (app()->isLocal() || app()->environment('testing')) {
            $this->call(UsuariosPruebaSeeder::class);
            $this->command->warn('⚠  UsuariosPruebaSeeder ejecutado (solo disponible en local/testing)');
        } else {
            $this->command->info('UsuariosPruebaSeeder omitido en entorno: '.app()->environment());
        }

        // 4. Áreas de conocimiento
        $this->call(AreasConocimientoSeeder::class);

        // 5. Programa dinámicos (5 programas COMECYT)
        $this->call(TipoProgramaSeeder::class);
        $this->call(ProgramaEtapasSeeder::class);
        $this->call(ProgramaModalidadesSeeder::class);
        $this->call(ProgramaCriteriosSeeder::class);
        $this->call(ProgramaRubrosSeeder::class);

        // 6. Documentos y convocatorias reales
        $this->call(ProgramaDocumentosSeeder::class);
        $this->call(ConvocatoriasRealesSeeder::class);

        $this->command->info('Programas dinámicos: PFPI, Prototipos, IPFE, Vinculación, Emprendedores - COMPLETADOS');
        $this->command->info('Documentos por programa y convocatorias reales 2026 - COMPLETADOS');

        // 7. Carrusel de login (slides de bienvenida)
        $this->call(CarouselSlideSeeder::class);
        $this->command->info('Carrusel de login - COMPLETADO');
    }
}
