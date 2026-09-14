<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPreference extends Model
{
    protected $fillable = ['user_id', 'scope', 'nombre', 'filtros', 'predeterminado'];

    protected $casts = [
        'filtros' => 'array',
        'predeterminado' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
