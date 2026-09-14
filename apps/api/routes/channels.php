<?php

use Illuminate\Support\Facades\Broadcast;

// Canal privado de notificación por usuario (frontend escucha `user.{id}`)
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Canal estándar de Laravel Notifications (Echo private model channel)
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
