<?php

namespace App\Providers;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Use the COMECYT-branded password reset email template
        ResetPassword::toMailUsing(
            function (object $notifiable, string $token) {
                return (new ResetPasswordNotification($token))->toMail($notifiable);
            }
        );
    }
}
