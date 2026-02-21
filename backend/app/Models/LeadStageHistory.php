<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadStageHistory extends Model
{
    protected $fillable = [
        'lead_id',
        'from_stage_id',
        'to_stage_id',
        'changed_by',
        'reason_code',
        'stay_days',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function fromStage(): BelongsTo
    {
        return $this->belongsTo(LeadStage::class, 'from_stage_id');
    }

    public function toStage(): BelongsTo
    {
        return $this->belongsTo(LeadStage::class, 'to_stage_id');
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
