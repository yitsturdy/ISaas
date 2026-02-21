<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('company_id')->nullable()->index();
            $table->string('name');
            $table->string('domain')->nullable();
            $table->enum('industry_category', [
                'IT・テクノロジー',
                '製造業',
                '金融・保険',
                '小売・EC',
                '医療・ヘルスケア',
                '教育',
                '不動産',
                'サービス業',
                '物流・運輸',
                'その他',
            ])->nullable();
            $table->enum('employee_size', [
                '1〜10人',
                '11〜50人',
                '51〜100人',
                '101〜300人',
                '301〜1000人',
                '1001人以上',
            ])->nullable();
            $table->enum('service_tier', ['A', 'B', 'C'])->default('C');
            $table->string('website_url')->nullable();
            $table->boolean('is_existing_customer')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
