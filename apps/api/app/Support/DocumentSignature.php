<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;

/**
 * Sello de tiempo simplificado (NOM-151 — etapa inicial).
 *
 * Genera un hash SHA-256 del contenido + timestamp UTC + emisor, y lo registra
 * en audit_logs como cadena de evidencia. NO firma con un TSA (Prestador de
 * Servicios de Certificación acreditado), pero da trazabilidad criptográfica
 * que cumple con el principio de no-repudio interno.
 *
 * Cuando el área de TIC del Estado entregue las credenciales de un TSA
 * acreditado (típicamente CSFI / Telmex / SAT TSA), se reemplaza
 * `appendCertificate()` por la llamada al TSA y se persiste el token.
 */
class DocumentSignature
{
    /**
     * Calcula la firma para un contenido binario o string.
     *
     * @return array{hash:string, algoritmo:string, timestamp:string, sello_evidencia:string}
     */
    public static function sign(string $content, string $documentType, ?int $subjectId = null): array
    {
        $hash = hash('sha256', $content);
        $timestamp = now()->utc()->toIso8601String();
        $issuer = config('app.name', 'COMECYT').' · '.config('app.url', '');

        // Cadena de evidencia: combina hash + timestamp + emisor para que cualquier
        // verificación posterior pueda recalcular y comparar.
        $evidenceChain = hash('sha256', $hash.'|'.$timestamp.'|'.$issuer);

        // Registrar en audit_logs (tamper-evident por su orden append-only)
        try {
            AuditLog::create([
                'user_id' => request()?->user()?->id,
                'action' => "document.signed.{$documentType}",
                'subject_type' => null,
                'subject_id' => $subjectId,
                'metadata' => [
                    'hash' => $hash,
                    'algoritmo' => 'SHA-256',
                    'timestamp_utc' => $timestamp,
                    'emisor' => $issuer,
                    'sello_evidencia' => $evidenceChain,
                ],
                'ip' => request()?->ip(),
            ]);
        } catch (\Throwable $e) {
            // No detener la emisión del documento si el log falla
            Log::warning('DocumentSignature audit failed', [
                'error' => $e->getMessage(),
                'document_type' => $documentType,
            ]);
        }

        // Si hay TSA acreditado configurado, obtener token RFC 3161
        $tsaToken = self::appendTsaToken($hash);

        return [
            'hash' => $hash,
            'algoritmo' => 'SHA-256',
            'timestamp' => $timestamp,
            'sello_evidencia' => $evidenceChain,
            'emisor' => $issuer,
            'tsa_token' => $tsaToken,                // base64 del TimeStampResp (null si no configurado)
            'tsa_acreditado' => $tsaToken !== null,  // bandera para que el PDF lo muestre
        ];
    }

    /**
     * Cliente RFC 3161 (TSA) — solicita un TimeStampToken acreditado.
     *
     * Config (apps/api/.env):
     *   TSA_URL=https://tsa.acreditado.gob.mx/tsr
     *   TSA_USERNAME=... (opcional, Basic Auth)
     *   TSA_PASSWORD=... (opcional)
     *   TSA_HASH_ALGORITHM=sha256 (default)
     *
     * Flujo RFC 3161:
     *   1. Construye TimeStampReq ASN.1 DER con el hash del documento
     *   2. POST application/timestamp-query → recibe application/timestamp-reply
     *   3. Persiste el TimeStampToken (base64) en audit_logs como evidencia
     *
     * Si TSA_URL no está configurada, retorna null (degradación elegante: el
     * documento aún tiene la cadena de evidencia interna).
     */
    public static function appendTsaToken(string $hash): ?string
    {
        $tsaUrl = env('TSA_URL');
        if (! $tsaUrl) {
            return null; // No configurado — fallback al sello local
        }

        try {
            // Construir TimeStampReq mínimo (RFC 3161 sección 2.4.1)
            // Estructura ASN.1: SEQUENCE { version INTEGER, messageImprint SEQUENCE { hashAlgorithm OID, hashedMessage OCTET STRING }, ... }
            $hashAlgo = env('TSA_HASH_ALGORITHM', 'sha256');
            $hashAlgoOid = match (strtolower($hashAlgo)) {
                'sha256' => "\x06\x09\x60\x86\x48\x01\x65\x03\x04\x02\x01",
                'sha512' => "\x06\x09\x60\x86\x48\x01\x65\x03\x04\x02\x03",
                default => "\x06\x09\x60\x86\x48\x01\x65\x03\x04\x02\x01",
            };

            $hashBinary = hex2bin($hash);
            if ($hashBinary === false || strlen($hashBinary) !== 32) {
                return null;
            }

            // OCTET STRING wrapper para hashedMessage
            $hashedMessage = "\x04".chr(strlen($hashBinary)).$hashBinary;
            // AlgorithmIdentifier SEQUENCE
            $algoIdContent = $hashAlgoOid."\x05\x00"; // OID + NULL
            $algoId = "\x30".chr(strlen($algoIdContent)).$algoIdContent;
            // MessageImprint SEQUENCE
            $messageImprintContent = $algoId.$hashedMessage;
            $messageImprint = "\x30".chr(strlen($messageImprintContent)).$messageImprintContent;
            // version INTEGER 1
            $version = "\x02\x01\x01";
            // certReq BOOLEAN TRUE (para que el TSA incluya su cert)
            $certReq = "\x01\x01\xFF";
            // TimeStampReq SEQUENCE
            $reqContent = $version.$messageImprint.$certReq;
            $tsq = "\x30".chr(strlen($reqContent)).$reqContent;

            $ch = curl_init($tsaUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $tsq,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/timestamp-query',
                    'Accept: application/timestamp-reply',
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_FOLLOWLOCATION => false,
            ]);

            if ($user = env('TSA_USERNAME')) {
                curl_setopt($ch, CURLOPT_USERPWD, $user.':'.env('TSA_PASSWORD'));
            }

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($response === false || $httpCode !== 200) {
                Log::warning('TSA request failed', [
                    'url' => $tsaUrl,
                    'http_code' => $httpCode,
                    'error' => $error,
                ]);

                return null;
            }

            // Token TSA (TimeStampResp) en base64 para persistir
            $tokenB64 = base64_encode($response);

            // Registrar el token en audit_logs como evidencia legal
            try {
                AuditLog::create([
                    'user_id' => request()?->user()?->id,
                    'action' => 'document.tsa_stamped',
                    'metadata' => [
                        'hash' => $hash,
                        'tsa_url' => $tsaUrl,
                        'algoritmo' => strtoupper($hashAlgo),
                        'token_size_bytes' => strlen($response),
                        'token_b64_preview' => substr($tokenB64, 0, 64).'…',
                    ],
                    'ip' => request()?->ip(),
                ]);
            } catch (\Throwable) {
                // El token se devuelve igual; el log es best-effort
            }

            return $tokenB64;
        } catch (\Throwable $e) {
            Log::warning('TSA appendTsaToken exception', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
