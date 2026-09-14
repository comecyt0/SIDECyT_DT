<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class Audit
{
    /**
     * Registra una acción del usuario actual sobre un modelo opcional.
     *
     * Uso típico desde un controller:
     *   Audit::log('solicitud.aprobada', $solicitud, ['observaciones' => $obs]);
     */
    public static function log(string $action, ?Model $subject = null, array $metadata = []): void
    {
        try {
            $request = request();
            AuditLog::create([
                'user_id' => $request?->user()?->id,
                'action' => $action,
                'subject_type' => $subject ? get_class($subject) : null,
                'subject_id' => $subject?->getKey(),
                'metadata' => $metadata ?: null,
                'ip' => $request?->ip(),
                'user_agent' => substr((string) $request?->userAgent(), 0, 255),
            ]);
        } catch (\Throwable $e) {
            // El audit no debe interrumpir el flujo del usuario
            Log::warning('Audit log failed', [
                'error' => $e->getMessage(),
                'action' => $action,
            ]);
        }
    }
}
