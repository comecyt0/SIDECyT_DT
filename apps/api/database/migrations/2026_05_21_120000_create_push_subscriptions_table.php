<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // El endpoint completo del push service del navegador (FCM/Mozilla/Safari)
            $table->text('endpoint');
            // Claves para cifrar el payload — son únicas por dispositivo
            $table->string('p256dh', 200);
            $table->string('auth', 200);
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            // Un usuario puede tener N dispositivos pero un endpoint sólo aparece una vez
            $table->unique(['user_id', 'endpoint'], 'push_user_endpoint_unique');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
