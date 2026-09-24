<?php

use Illuminate\Support\Facades\Broadcast;

// Canal privado de notificación por usuario (frontend escucha `user.{id}`)
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// E45 — Buzón: solo participantes del hilo (solicitante dueño, admin, admin de convocatoria con alcance).
Broadcast::channel('conversacion.{id}', function ($user, $id) {
    $c = \App\Models\Conversacion::find((int) $id);

    return $c !== null && \App\Support\Buzon::participa($user, $c);
});

// Canal estándar de Laravel Notifications (Echo private model channel)
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
