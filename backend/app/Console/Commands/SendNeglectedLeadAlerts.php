<?php

namespace App\Console\Commands;

use App\Mail\NeglectedLeadAlert;
use App\Models\Lead;
use App\Models\LeadStage;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendNeglectedLeadAlerts extends Command
{
    protected $signature   = 'leads:send-neglected-alerts';
    protected $description = '放置リードの担当者にアラートメールを送信する';

    public function handle(): int
    {
        $closedStageIds = LeadStage::where('name', 'like', '%クローズ%')->pluck('id');

        // 放置リードを持つ担当者ごとにメール送信
        $users = User::whereHas('leads', function ($q) use ($closedStageIds) {
            $q->join('lead_stages', 'leads.current_stage_id', '=', 'lead_stages.id')
              ->whereNotIn('leads.current_stage_id', $closedStageIds)
              ->whereNotNull('lead_stages.reassignment_threshold_days')
              ->whereRaw('leads.last_activity_at < NOW() - (lead_stages.reassignment_threshold_days || \' days\')::interval');
        })->get();

        $total = 0;

        foreach ($users as $user) {
            $neglectedLeads = Lead::with(['customer', 'currentStage'])
                ->where('owner_id', $user->id)
                ->join('lead_stages', 'leads.current_stage_id', '=', 'lead_stages.id')
                ->whereNotIn('leads.current_stage_id', $closedStageIds)
                ->whereNotNull('lead_stages.reassignment_threshold_days')
                ->whereRaw('leads.last_activity_at < NOW() - (lead_stages.reassignment_threshold_days || \' days\')::interval')
                ->selectRaw('leads.*, EXTRACT(DAY FROM NOW() - leads.last_activity_at)::int AS days_since_last_activity')
                ->get();

            if ($neglectedLeads->isEmpty()) {
                continue;
            }

            Mail::to($user->email)->send(new NeglectedLeadAlert($user, $neglectedLeads));
            $this->info("送信: {$user->name} ({$user->email}) — {$neglectedLeads->count()} 件");
            $total++;
        }

        $this->info("完了: {$total} 名に送信しました。");

        return self::SUCCESS;
    }
}
