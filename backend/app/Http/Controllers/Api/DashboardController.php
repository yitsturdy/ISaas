<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadStage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $totalLeads  = Lead::count();
        $wonStage    = LeadStage::where('name', 'like', '%成約%')->first();
        $wonLeads    = $wonStage ? Lead::where('current_stage_id', $wonStage->id)->count() : 0;

        // アクティブ（成約・失注以外）
        $closedStageIds = LeadStage::where('name', 'like', '%クローズ%')->pluck('id');
        $activeLeads    = Lead::whereNotIn('current_stage_id', $closedStageIds)->count();

        $conversionRate = $totalLeads > 0 ? round($wonLeads / $totalLeads * 100, 1) : 0;

        // ステージ別リード数
        $leadsByStage = LeadStage::withCount('leads')
            ->orderBy('display_order')
            ->get()
            ->map(fn ($s) => [
                'stage_id'   => $s->id,
                'stage_name' => $s->name,
                'count'      => $s->leads_count,
            ]);

        // 放置リード数
        $neglectedCount = Lead::join('lead_stages', 'leads.current_stage_id', '=', 'lead_stages.id')
            ->whereNotNull('lead_stages.reassignment_threshold_days')
            ->whereRaw('leads.last_activity_at < NOW() - (lead_stages.reassignment_threshold_days || \' days\')::interval')
            ->count();

        return response()->json([
            'total_leads'           => $totalLeads,
            'active_leads'          => $activeLeads,
            'won_leads'             => $wonLeads,
            'conversion_rate'       => $conversionRate,
            'leads_by_stage'        => $leadsByStage,
            'neglected_leads_count' => $neglectedCount,
        ]);
    }

    public function performance(Request $request): JsonResponse
    {
        $closedStageIds = LeadStage::where('name', 'like', '%クローズ%')->pluck('id');
        $wonStage       = LeadStage::where('name', 'like', '%成約%')->first();

        $users = User::where('status', 'active')
            ->withCount([
                'leads as active_leads_count' => fn ($q) => $q->whereNotIn('current_stage_id', $closedStageIds),
                'leads as won_leads_count'    => fn ($q) => $wonStage ? $q->where('current_stage_id', $wonStage->id) : $q->whereRaw('1=0'),
            ])
            ->get()
            ->map(function ($user) {
                $target          = $user->monthly_target_count ?? 0;
                $achievementRate = $target > 0
                    ? round($user->won_leads_count / $target * 100, 1)
                    : null;

                return [
                    'user_id'              => $user->id,
                    'user_name'            => $user->name,
                    'role'                 => $user->role,
                    'monthly_target_count' => $target,
                    'active_leads_count'   => $user->active_leads_count,
                    'won_leads_count'      => $user->won_leads_count,
                    'achievement_rate'     => $achievementRate,
                ];
            });

        return response()->json($users);
    }

    public function neglectedLeads(Request $request): JsonResponse
    {
        $leads = Lead::join('lead_stages', 'leads.current_stage_id', '=', 'lead_stages.id')
            ->join('users as owners', 'leads.owner_id', '=', 'owners.id')
            ->whereNotNull('lead_stages.reassignment_threshold_days')
            ->whereRaw('leads.last_activity_at < NOW() - (lead_stages.reassignment_threshold_days || \' days\')::interval')
            ->select(
                'leads.id as lead_id',
                'leads.title',
                'owners.name as owner_name',
                'lead_stages.name as stage_name',
                'lead_stages.reassignment_threshold_days as threshold_days',
                DB::raw("EXTRACT(DAY FROM NOW() - leads.last_activity_at)::int AS days_since_last_activity")
            )
            ->orderByDesc('days_since_last_activity')
            ->get();

        return response()->json($leads);
    }
}
