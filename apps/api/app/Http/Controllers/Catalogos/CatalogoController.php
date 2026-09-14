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
        $empresas = DB::table('empresas')->where('activo', true)->get();
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
