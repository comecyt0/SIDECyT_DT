<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * E49 (25/09/2026) — Contenido público administrable (pedido del usuario: "lo que tenga que ver con programas o
 * convocatorias no debe estar hardcodeado, todo debe ser actualizable desde el panel de admin").
 *
 * - programas_publicos: programas que se presentan en las landings de SIDECyT, por sistema (sigae | sicei).
 *   Carga inicial: los 9 programas de https://comecyt.edomex.gob.mx/apoyo-empresarial (SIGAE, activos) y los de
 *   becas-estudiantes e impulso-investigacion (SICEI, INACTIVOS: SICEI queda pendiente de definir).
 * - contenido_sitio: listas editables por clave (sectores estratégicos, documentos que se preparan, notas).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programas_publicos', function (Blueprint $t) {
            $t->id();
            $t->string('sistema', 10);                 // sigae | sicei
            $t->string('nombre', 255);
            $t->string('dirigido_a', 400)->nullable();
            $t->text('resumen')->nullable();
            $t->string('correo', 150)->nullable();
            $t->string('telefono', 60)->nullable();
            $t->string('url_info', 500)->nullable();   // página oficial (https, dominios permitidos)
            $t->string('icono', 30)->default('lightbulb');
            $t->string('tono', 10)->default('sky');    // sky | mint | peach
            $t->unsignedSmallInteger('orden')->default(0);
            $t->boolean('activo')->default(true);
            $t->foreignId('actualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->index(['sistema', 'activo', 'orden']);
        });

        Schema::create('contenido_sitio', function (Blueprint $t) {
            $t->id();
            $t->string('clave', 60)->unique();         // p. ej. sigae.sectores
            $t->jsonb('valor');
            $t->foreignId('actualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        $now = now();
        $sitio = 'https://comecyt.edomex.gob.mx';
        $p = fn (string $sistema, int $orden, string $nombre, ?string $dirigido, ?string $resumen, ?string $correo, ?string $url, string $icono, string $tono, bool $activo = true) => [
            'sistema' => $sistema, 'orden' => $orden, 'nombre' => $nombre, 'dirigido_a' => $dirigido, 'resumen' => $resumen,
            'correo' => $correo, 'telefono' => null, 'url_info' => $url, 'icono' => $icono, 'tono' => $tono, 'activo' => $activo,
            'created_at' => $now, 'updated_at' => $now,
        ];

        // SIGAE — fuente: comecyt.edomex.gob.mx/apoyo-empresarial y la página de cada programa (consultadas el 23 y 25/09/2026).
        DB::table('programas_publicos')->insert([
            $p('sigae', 1, 'Programa para el Desarrollo de Prototipos',
                'MiPyMEs, personas físicas con actividad empresarial y asociaciones cooperativas del Estado de México',
                'Apoyo económico para desarrollar prototipos que resulten de un desarrollo o una innovación tecnológica susceptible de propiedad intelectual, y fortalecer tus capacidades tecnológicas y productivas.',
                'dt.prototipos@edomex.gob.mx', "$sitio/apoyo-desarrollo-prototipos", 'wrench', 'sky'),
            $p('sigae', 2, 'Incorporación de Profesionistas para el Fortalecimiento Empresarial',
                'MiPyMEs y grandes empresas',
                'Apoyo económico para integrar a tu empresa profesionistas con grado de técnico superior universitario, licenciatura, maestría o doctorado, que desarrollen un proyecto tecnológico o de innovación.',
                'focacyte@edomex.gob.mx', "$sitio/incorporacion-profesionistas-fortalecimiento-empresarial", 'graduation', 'mint'),
            $p('sigae', 3, 'Jóvenes Emprendedores e Innovadores',
                'Jóvenes de hasta 29 años, estudiantes o egresados de educación superior, que residan en el Estado de México',
                'Apoyo económico para un proyecto de desarrollo tecnológico o de innovación de un producto, proceso o servicio, con el que emprendas una empresa o negocio.',
                'vinculacionempresas@edomex.gob.mx', "$sitio/jovenes-emprendedores-innovadores", 'rocket', 'peach'),
            $p('sigae', 4, 'Vinculación de Empresas con Instituciones de Educación Media Superior, Superior y/o Centros de Investigación',
                'MiPyMEs y grandes empresas',
                'Apoyo económico para proyectos de innovación y desarrollo tecnológico hechos en colaboración con instituciones de educación media superior, superior o centros de investigación.',
                'sceron.comecyt@edomex.gob.mx', "$sitio/vinculacion-empresas", 'network', 'sky'),
            $p('sigae', 5, 'Asistencia Técnica e Innovación', null,
                'Consulta los detalles y requisitos con el COMECYT.', 'comecyt@edomex.gob.mx', null, 'lightbulb', 'mint'),
            $p('sigae', 6, 'Patentes e Invenciones',
                'Personas físicas o morales interesadas en proteger invenciones, modelos de utilidad, diseños industriales y secretos industriales',
                'Asesoría, capacitación y búsqueda de información tecnológica para proteger tus invenciones (Centro de Promoción de Invenciones y Marcas CEPIM-COMECYT).',
                'comecyt@edomex.gob.mx', "$sitio/patentes-invenciones", 'award', 'peach'),
            $p('sigae', 7, 'Protección de la Propiedad Industrial',
                'Personas inventoras, instituciones de educación media superior y superior, centros de investigación y MiPyMEs del Estado de México',
                'Apoyo económico por los trámites realizados en materia de invenciones ante el Instituto Mexicano de la Propiedad Industrial (IMPI).',
                'tecnologia.comecyt@edomex.gob.mx', "$sitio/proteccion-propiedad-industrial", 'shield', 'sky'),
            $p('sigae', 8, 'Marcas', null,
                'Orientación para proteger las marcas que distinguen tu producto, servicio o establecimiento en el mercado (CEPIM-COMECYT).',
                'comecyt@edomex.gob.mx', "$sitio/marcas", 'badge', 'mint'),
            $p('sigae', 9, 'Asesoría y Capacitación para la Propiedad Intelectual',
                'Estudiantes, académicos, empresarios, inventores independientes y público en general',
                'Asesorías sobre propiedad intelectual (con cita telefónica) y capacitación sobre el sistema de propiedad industrial y los derechos de autor.',
                'sceron.comecyt@edomex.gob.mx', "$sitio/asesoria-capacitacion-propiedad-intelectual", 'book', 'peach'),
        ]);

        // SICEI — PENDIENTE (inactivos): fuente comecyt.edomex.gob.mx/becas-estudiantes e /impulso-investigacion (25/09/2026).
        $sicei = [
            ['Becas COMECYT — Modalidad Beca de Posgrado (Maestría)', "$sitio/beca-posgrado-edomex-ciencias", 'graduation'],
            ['Becas COMECYT — Modalidad Posgrado en Ciencias de la Salud', "$sitio/posgrado-salud", 'graduation'],
            ['Beca de Educación Dual', "$sitio/educacion-dual", 'graduation'],
            ['Beca Mujeres Indígenas y Rurales Mexiquenses (Maestría)', "$sitio/mujeres-indigenas-mexiquenses", 'graduation'],
            ['Beca Ciencia con Incidencia para el Bienestar COMECYT', "$sitio/ciencias-edmex", 'flask'],
            ['Programa Becas COMECYT — Modalidad Beca Internacional', "$sitio/beca-internacional-edomex", 'graduation'],
            ['Programa de Estancias de Investigación COMECYT', "$sitio/programa-estancias", 'flask'],
            ['Apoyo para Estudiantes, Profesores e Investigadores Destacados', "$sitio/apoyo-estudiantes-destacados", 'award'],
            ['Beca Ciencia Aplicada Titulación', "$sitio/beca-ciencia-aplicada-titulacion-edomex", 'graduation'],
            ['Programa MICELIOS COMECyT', "$sitio/micelios-comecyt", 'network'],
            ['Eventos Científicos o Tecnológicos', "$sitio/eventos-cientificos-o-tecnologicos", 'users'],
            ['Programa Investigadoras e Investigadores COMECYT', "$sitio/programa-investigadoras-investigadores", 'flask'],
            ['Fondo para la Investigación Científica y Desarrollo Tecnológico del Estado de México', "$sitio/fondo-investigacion-cientifica-desarrollo-tecnologico", 'flask'],
            ['Premio Estatal de Ciencia y Tecnología', "$sitio/premio-estatal-ciencia-tecnologia", 'award'],
            ['Apoyos a la Publicación de Artículos Científicos de Profesores e Investigadores', "$sitio/publicacion-articulos-cientificos", 'book'],
            ['Premio Talento: Jóvenes Científicos e Investigadores', "$sitio/premio-talento-edomex", 'award'],
            ['Redes EDOMÉX', "$sitio/redes-edomex", 'network'],
            ['Mujeres Científicas EDOMÉX', "$sitio/mujeres-cientificas", 'users'],
            ['Fortalecimiento de Laboratorios Científicos de Instituciones Públicas de Nivel Medio Superior', "$sitio/beca-ciencia-aplicada", 'flask'],
        ];
        $filas = [];
        foreach ($sicei as $i => [$nombre, $url, $icono]) {
            $filas[] = $p('sicei', $i + 1, $nombre, null, null, 'comecyt@edomex.gob.mx', $url, $icono, ['sky', 'mint', 'peach'][$i % 3], false);
        }
        DB::table('programas_publicos')->insert($filas);

        DB::table('contenido_sitio')->insert([
            ['clave' => 'sigae.sectores', 'created_at' => $now, 'updated_at' => $now, 'valor' => json_encode([
                'Aeronáutica', 'Agroindustria', 'Agrotecnología', 'Agroquímica', 'Alimentos', 'Ambiental', 'Arquitectura',
                'Automotriz', 'Bioingeniería', 'Biotecnología', 'Desarrollo sustentable', 'Dispositivos médicos',
                'Economía circular', 'Eficiencia energética', 'Electromecánica', 'Farmacéutica', 'Gestión integral de residuos',
                'Informática', 'Inteligencia artificial', 'Logística', 'Manufactura', 'Mecatrónica', 'Movilidad', 'Plásticos',
                'Química', 'Robótica', 'Salud', 'Textil', 'Tecnologías para el agua', 'Telecomunicaciones',
            ], JSON_UNESCAPED_UNICODE)],
            ['clave' => 'sigae.documentos', 'created_at' => $now, 'updated_at' => $now, 'valor' => json_encode([
                ['titulo' => 'Ficha técnica', 'detalle' => 'Los datos generales de tu proyecto.'],
                ['titulo' => 'Plan de trabajo', 'detalle' => 'Actividades, entregables y tiempos (Anexo 1).'],
                ['titulo' => 'Presupuesto', 'detalle' => 'Cómo se usará el apoyo, por rubro (Anexo 2).'],
                ['titulo' => 'Carta de intención', 'detalle' => 'Tu intención de participar en la convocatoria.'],
                ['titulo' => 'Escrito bajo protesta de decir verdad', 'detalle' => 'O carta compromiso, según el programa.'],
                ['titulo' => 'Resumen de la empresa', 'detalle' => 'Quién eres y a qué se dedica tu empresa.'],
            ], JSON_UNESCAPED_UNICODE)],
            ['clave' => 'sigae.documentos_notas', 'created_at' => $now, 'updated_at' => $now, 'valor' => json_encode([
                'Consulta antes la convocatoria, sus Reglas de Operación y los Lineamientos del Comité de Admisión y Seguimiento.',
                'Algunos programas piden una garantía con una institución afianzadora.',
                'En Desarrollo de Prototipos se pide además el Reporte de Información Tecnológica del IMPI.',
            ], JSON_UNESCAPED_UNICODE)],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('contenido_sitio');
        Schema::dropIfExists('programas_publicos');
    }
};
