<?php

namespace App\Helpers;

use App\Enums\Message;
use Illuminate\Support\Facades\Config;

/**
 * COMECYT Configuration Helper
 *
 * Provides convenient access to centralized configuration values and message enums
 * Usage: ConfigHelper::msg(Message::AUTH_INVALID_CREDENTIALS)
 *        ConfigHelper::val('montos.monto_maximo_solicitud')
 *
 * Last Updated: 2026-04-06
 */
class ConfigHelper
{
    /**
     * Get a message enum formatted with optional parameters
     *
     * @param  Message  $message  The message enum
     * @param  array  $params  Optional parameters for string interpolation
     * @return string The formatted message
     */
    public static function msg(Message $message, array $params = []): string
    {
        return $message->format($params);
    }

    /**
     * Get a configuration value from config/comecyt.php
     *
     * Examples:
     * - ConfigHelper::val('montos.monto_maximo_solicitud') → 60000
     * - ConfigHelper::val('evaluation.puntaje_minimo_aprobatorio') → 80
     * - ConfigHelper::val('validation.titulo_proyecto_max_chars') → 255
     *
     * @param  string  $key  The dot-notation key path
     * @param  mixed  $default  Default value if not found
     * @return mixed The configuration value
     */
    public static function val(string $key, $default = null)
    {
        return Config::get("comecyt.{$key}", $default);
    }

    /**
     * Get all validation limits for easy access
     *
     * @return array The validation configuration
     */
    public static function validation(): array
    {
        return Config::get('comecyt.validation', []);
    }

    /**
     * Get all financial limits
     *
     * @return array The montos configuration
     */
    public static function montos(): array
    {
        return Config::get('comecyt.montos', []);
    }

    /**
     * Get all evaluation settings
     *
     * @return array The evaluation configuration
     */
    public static function evaluation(): array
    {
        return Config::get('comecyt.evaluation', []);
    }

    /**
     * Get all equipo (team) settings
     *
     * @return array The equipo configuration
     */
    public static function equipo(): array
    {
        return Config::get('comecyt.equipo', []);
    }

    /**
     * Get a role ID by name
     *
     * @param  string  $roleName  The role name (e.g., 'admin', 'revisor', 'evaluador', 'solicitante')
     * @return int The role ID
     */
    public static function roleId(string $roleName): int
    {
        return Config::get("comecyt.roles.{$roleName}", 0);
    }

    /**
     * Check if a value is within allowed limits
     *
     * @param  string  $field  The field name
     * @param  mixed  $value  The value to check
     * @return bool True if within limits
     */
    public static function isWithinLimit(string $field, $value): bool
    {
        $maxField = "{$field}_max_chars";
        $maxBytes = "{$field}_max_bytes";

        if (is_string($value)) {
            $maxChars = self::val("validation.{$maxField}");

            return $maxChars === null || strlen($value) <= $maxChars;
        }

        if (is_numeric($value)) {
            $max = self::val("validation.{$maxBytes}") ?? self::val("montos.{$field}");

            return $max === null || $value <= $max;
        }

        return true;
    }
}
