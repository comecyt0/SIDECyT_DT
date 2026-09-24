<?php

namespace App\Http\Controllers\Catalogos;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class CatalogoController extends Controller
{
    /**
     * Get all catalog data needed for global drop-downs
     */
    public function index()
    {
        $bancos = DB::table('bancos')->where('activo', true)->get();
        $municipios = DB::table('municipios')->where('activo', true)->get();
        $areas = DB::table('areas_conocimiento')->where('activo', true)->get();
        // SEGURIDAD (24/09/2026): solo lo que usan los selectores. Antes se enviaban TODAS las columnas de todas las
        // empresas (RFC, domicilio, contactos…) a cualquier usuario con sesión.
        $empresas = DB::table('empresas')->where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'acronimo']);
        $roles = DB::table('roles')->get();
        $modalidades = DB::table('modalidades')->where('activo', true)->get();

        return response()->json([
            'bancos' => $bancos,
            'municipios' => $municipios,
            'areas_conocimiento' => $areas,
            'empresas' => $empresas,
            'modalidades' => $modalidades,
            'roles' => $roles,
        ]);
    }
}
