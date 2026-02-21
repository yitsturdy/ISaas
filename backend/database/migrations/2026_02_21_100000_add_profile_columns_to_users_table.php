<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->nullable()->after('name');
            $table->enum('role', ['Admin', 'Manager', 'IS'])->default('IS')->after('password');
            $table->enum('status', ['active', 'onboarding', 'inactive'])->default('onboarding')->after('role');
            $table->date('join_at')->nullable()->after('status');
            $table->unsignedInteger('monthly_target_count')->default(0)->after('join_at');
            $table->string('extension_number')->nullable()->after('monthly_target_count');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'role', 'status', 'join_at', 'monthly_target_count', 'extension_number']);
        });
    }
};
