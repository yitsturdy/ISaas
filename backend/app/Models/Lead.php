<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    use HasFactory;
    protected $fillable = [
        'customer_id',
        'owner_id',
        'current_stage_id',
        'title',
        'note',
        'last_activity_at',
        'stage_updated_at',
        'total_touch_count',
    ];

    protected function casts(): array
    {
        return [
            'last_activity_at' => 'datetime',
            'stage_updated_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function currentStage(): BelongsTo
    {
        return $this->belongsTo(LeadStage::class, 'current_stage_id');
    }

    public function stageHistories(): HasMany
    {
        return $this->hasMany(LeadStageHistory::class);
    }
}
