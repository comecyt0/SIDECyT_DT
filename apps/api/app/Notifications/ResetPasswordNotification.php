<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends BaseResetPassword
{
    /**
     * Build the mail representation of the notification.
     * Uses the COMECYT-branded password-reset template.
     */
    public function toMail($notifiable): MailMessage
    {
        $frontendUrl = rtrim(env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'), '/');
        $url = $frontendUrl.'/reset-password?token='.$this->token.'&email='.urlencode($notifiable->getEmailForPasswordReset());

        return (new MailMessage)
            ->subject('Recuperar Contraseña — COMECYT')
            ->view('emails.password-reset', [
                'url' => $url,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
    }
}
