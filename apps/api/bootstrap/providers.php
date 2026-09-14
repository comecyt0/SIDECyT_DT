<?php

use App\Providers\AppServiceProvider;
use PHPOpenSourceSaver\JWTAuth\Providers\LaravelServiceProvider;

return [
    LaravelServiceProvider::class,
    AppServiceProvider::class,
];
