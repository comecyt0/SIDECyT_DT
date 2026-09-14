<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\ApiAuthenticate;
use App\Http\Middleware\AuthLoginRateLimitMiddleware;
use App\Http\Middleware\EvaluadorMiddleware;
use App\Http\Middleware\ReadJwtFromCookieMiddleware;
use App\Http\Middleware\RevisorMiddleware;
use App\Http\Middleware\SecurityHeadersMiddleware;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Validation\ValidationException;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Sentry\State\Scope;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // TrustProxies — only trust X-Forwarded-For from known reverse proxies.
        // Never trust arbitrary clients; prevents IP spoofing to bypass rate limiting.
        // Set TRUSTED_PROXIES=* only if behind a cloud load balancer that sanitizes the header.
        $middleware->trustProxies(
            at: env('TRUSTED_PROXIES', '127.0.0.1'),
            headers: Request::HEADER_X_FORWARDED_FOR |
                     Request::HEADER_X_FORWARDED_HOST |
                     Request::HEADER_X_FORWARDED_PORT |
                     Request::HEADER_X_FORWARDED_PROTO
        );

        // Enable CORS for all requests (required for Next.js on port 3000)
        $middleware->prepend(HandleCors::class);

        // Security headers on every response
        $middleware->append(SecurityHeadersMiddleware::class);

        // Lee JWT desde cookie HttpOnly si no hay Authorization header
        $middleware->appendToGroup('api', ReadJwtFromCookieMiddleware::class);

        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'revisor' => RevisorMiddleware::class,
            'evaluador' => EvaluadorMiddleware::class,
            'api.auth' => ApiAuthenticate::class,
            'auth.login.ratelimit' => AuthLoginRateLimitMiddleware::class,
        ]);

        // API 100% stateless — la autenticación es JWT en cookie HttpOnly `comecyt_auth`.
        // Se retira el manejo de sesión del grupo `web`: sin StartSession no se emite
        // `comecyt-session`, y sin el middleware CSRF deja de encolarse `XSRF-TOKEN`, que
        // por diseño del framework NO lleva el flag HttpOnly (hallazgo 4 del pentest de
        // agosto 2026). Ningún punto del código usa sesiones ni Sanctum — verificado.
        //
        // OJO: la clase que realmente está en el grupo `web` es PreventRequestForgery.
        // `ValidateCsrfToken` y `VerifyCsrfToken` son subclases deprecadas: pasarlas aquí
        // NO remueve nada y el middleware queda activo sin sesión → "Session store not set
        // on request" (HTTP 500 en todas las rutas web). Los tres middlewares deben salir
        // juntos; quitar solo StartSession rompe el CSRF.
        $middleware->web(remove: [
            StartSession::class,
            ShareErrorsFromSession::class,
            PreventRequestForgery::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always return JSON for API requests
        $exceptions->shouldRenderJsonWhen(function ($request) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // Custom exception rendering for API errors
        $exceptions->renderable(function (AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(
                    ['message' => 'Unauthenticated.', 'error' => 'Credenciales inválidas'],
                    401
                );
            }
        });

        $exceptions->renderable(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(
                    ['message' => 'Validation failed', 'errors' => $e->errors()],
                    422
                );
            }
        });

        // 404 Not Found handler for API
        $exceptions->renderable(function (NotFoundHttpException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Recurso no encontrado.'], 404);
            }
        });

        // 403 Forbidden/Unauthorized handler for API
        $exceptions->renderable(function (AuthorizationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'No autorizado.'], 403);
            }
        });

        // Report exceptions with Sentry context
        $exceptions->report(function (Throwable $e) {
            if (app()->bound('sentry') && app('sentry') !== null) {
                \Sentry\configureScope(function (Scope $scope): void {
                    $user = auth()->guard('api')->user();
                    if ($user) {
                        $scope->setUser([
                            'id' => $user->id,
                            'email' => $user->email,
                            'rol_id' => $user->rol_id ?? null,
                        ]);
                    }
                });
            }
        });
    })->create();
