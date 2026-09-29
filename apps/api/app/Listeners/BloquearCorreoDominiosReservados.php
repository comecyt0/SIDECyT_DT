<?php

namespace App\Listeners;

use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Log;

/**
 * E52 (29/09/2026) — Nunca se envía correo a dominios reservados (RFC 2606 / RFC 6761: .invalid, .example, .test,
 * .localhost y example.com/.net/.org). Las pruebas de punta a punta usan esos dominios; sin este filtro el sistema
 * intentaba entregarlos por Microsoft 365 (rechazos 501 y un 421 de límite), lo que daña la reputación de la cuenta
 * institucional. Si TODOS los destinatarios son reservados, el envío se cancela; si hay alguno real, se envía solo a
 * los reales.
 */
class BloquearCorreoDominiosReservados
{
    private const RESERVADOS = ['/\.invalid$/i', '/\.example$/i', '/\.test$/i', '/\.localhost$/i', '/(^|\.)example\.(com|net|org)$/i'];

    public static function reservado(string $correo): bool
    {
        $dominio = strtolower((string) substr(strrchr($correo, '@') ?: '', 1));
        if ($dominio === '') {
            return true;
        }
        foreach (self::RESERVADOS as $p) {
            if (preg_match($p, $dominio)) {
                return true;
            }
        }

        return false;
    }

    public function handle(MessageSending $event): bool
    {
        $msg = $event->message;
        $validos = [];
        $quitados = 0;
        foreach (['To', 'Cc', 'Bcc'] as $campo) {
            $get = 'get'.$campo;
            $lista = array_values(array_filter($msg->{$get}(), function ($a) use (&$quitados) {
                $r = self::reservado($a->getAddress());
                if ($r) $quitados++;

                return ! $r;
            }));
            $msg->{strtolower($campo)}(...$lista);
            $validos = array_merge($validos, $lista);
        }
        if ($quitados > 0) {
            Log::info('Correo a dominio reservado omitido', ['destinatarios_omitidos' => $quitados]);
        }

        return count($validos) > 0;
    }
}
