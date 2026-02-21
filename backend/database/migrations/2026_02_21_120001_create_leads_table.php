<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('current_stage_id')->nullable()->constrained('lead_stages')->nullOnDelete();
            $table->string('title');
            $table->text('note')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('stage_updated_at')->nullable();
            $table->integer('total_touch_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
