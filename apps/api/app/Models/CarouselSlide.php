<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarouselSlide extends Model
{
    // SEV-1 defense-in-depth: bloquea mass-assign de PK/timestamps.
    protected $guarded = ['id', 'created_at', 'updated_at'];

    protected $table = 'carousel_slides';

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
    ];
}
