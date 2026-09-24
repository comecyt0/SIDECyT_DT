<?php

/*
 * Mensajes de validación en español (24/09/2026). APP_LOCALE=es pero no existía esta carpeta: todo salía en
 * inglés. Solo se traducen las claves que el sistema muestra al usuario; las demás caen al inglés
 * (APP_FALLBACK_LOCALE) clave por clave.
 */
return [
    'required' => 'Este campo es obligatorio.',
    'confirmed' => 'La confirmación no coincide.',
    'email' => 'Escribe un correo electrónico válido.',
    'min' => [
        'string' => 'Debe tener al menos :min caracteres.',
        'numeric' => 'Debe ser al menos :min.',
        'file' => 'Debe pesar al menos :min KB.',
    ],
    'max' => [
        'string' => 'No debe pasar de :max caracteres.',
        'numeric' => 'No debe ser mayor que :max.',
        'file' => 'El archivo no debe pesar más de :max KB.',
    ],
    'mimes' => 'El archivo debe ser de tipo: :values.',
    'unique' => 'Este valor ya está registrado.',
    'password' => [
        'letters' => 'La contraseña debe incluir al menos una letra.',
        'mixed' => 'La contraseña debe incluir mayúsculas y minúsculas.',
        'numbers' => 'La contraseña debe incluir al menos un número.',
        'symbols' => 'La contraseña debe incluir al menos un símbolo.',
        'uncompromised' => 'Esta contraseña apareció en una filtración de datos. Elige otra.',
    ],
    'attributes' => [
        'password' => 'contraseña',
        'new_password' => 'nueva contraseña',
        'current_password' => 'contraseña actual',
        'email' => 'correo',
    ],
];
