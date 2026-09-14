<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Display a listing of the resource, with optional search and pagination.
     */
    public function index(Request $request)
    {
        $query = User::with(['rol', 'empresa'])->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $perPage = (int) $request->get('per_page', 0);
        if ($perPage > 0) {
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', Password::defaults()],
            'rol_id' => 'required|exists:roles,id',
            'empresa_id' => 'nullable|exists:instituciones,id',
            'telefono' => 'nullable|string|max:20',
            'cargo' => 'nullable|string|max:255',
            'activo' => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return response()->json([
            'message' => 'Usuario creado con éxito',
            'user' => $user->load(['rol', 'empresa']),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        return response()->json($user->load(['rol', 'empresa']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => 'string|email|max:255|unique:users,email,'.$user->id,
            'password' => ['nullable', Password::defaults()],
            'rol_id' => 'exists:roles,id',
            'empresa_id' => 'nullable|exists:instituciones,id',
            'telefono' => 'nullable|string|max:20',
            'cargo' => 'nullable|string|max:255',
            'activo' => 'boolean',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Usuario actualizado con éxito',
            'user' => $user->load(['rol', 'empresa']),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, User $user)
    {
        // Prevent self-deletion
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta.'], 422);
        }

        // Prevent deleting the last admin
        if ($user->rol_id === config('comecyt.roles.admin')) {
            $adminCount = User::where('rol_id', config('comecyt.roles.admin'))->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'No puedes eliminar el último administrador del sistema.'], 422);
            }
        }

        $user->delete();

        return response()->json([
            'message' => 'Usuario eliminado con éxito',
        ]);
    }
}
