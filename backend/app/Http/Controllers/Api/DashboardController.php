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
    /**
     * GET /api/dashboard
     * 全体KPI統計
     */
    public function index(): JsonResponse
    {
        $totalLeads = Lead::count();

        // クローズ（成約・失注）ステージのIDを除いたものをアクティブと定義
        $closedStageNames = ['クローズ（成約）', 'クローズ（失注）'];
        $closedStageIds = LeadStage::whereIn('name', $closedStageNames)->pluck('id');
        $wonStageIds    = LeadStage::where('name', 'クローズ（成約）')->pluck('id');

        $activeLeads = Lead::whereNotIn('current_stage_id', $closedStageIds)
            ->whereNotNull('current_stage_id')
            ->count();

        $wonLeads = Lead::whereIn('current_stage_id', $wonStageIds)->count();
        $conversionRate = $totalLeads > 0
            ? round($wonLeads / $totalLeads * 100, 1)
            : 0.0;

        // ステージ別リード数
        $leadsByStage = LeadStage::where('is_active', true)
            ->orderBy('display_order')
            ->get()
            ->map(fn($stage) => [
                'stage_id'   => $stage->id,
                'stage_name' => $stage->name,
                'count'      => Lead::where('current_stage_id', $stage->id)->count(),
            ]);

        // 放置リード数（last_activity_at が threshold を超えたもの）
        $neglectedCount = $this->countNeglectedLeads();

        return response()->json([
            'total_leads'          => $totalLeads,
            'active_leads'         => $activeLeads,
            'won_leads'            => $wonLeads,
            'conversion_rate'      => $conversionRate,
            'neglected_leads_count' => $neglectedCount,
            'leads_by_stage'       => $leadsByStage,
        ]);
    }

    /**
     * GET /api/dashboard/performance
     * IS別パフォーマンス（Admin/Manager のみ全体表示、IS は自分のみ）
     */
    public function performance(Request $request): JsonResponse
    {
        $me = $request->user();

        $query = User::where('status', 'active')
            ->where('role', 'IS')
            ->withCount(['leads as active_leads_count' => fn($q) =>
                $q->whereNotIn('current_stage_id',
                    LeadStage::whereIn('name', ['クローズ（成約）', 'クローズ（失注）'])->pluck('id')
                )->whereNotNull('current_stage_id')
            ])
            ->withCount(['leads as won_leads_count' => fn($q) =>
                $q->whereIn('current_stage_id',
                    LeadStage::where('name', 'クローズ（成約）')->pluck('id')
                )
            ]);

        if (!$me->isAdminOrManager()) {
            $query->where('id', $me->id);
        }

        $users = $query->get()->map(fn($u) => [
            'user_id'              => $u->id,
            'user_name'            => $u->name,
            'monthly_target_count' => $u->monthly_target_count,
            'active_leads_count'   => $u->active_leads_count,
            'won_leads_count'      => $u->won_leads_count,
            'achievement_rate'     => $u->monthly_target_count > 0
                ? round($u->won_leads_count / $u->monthly_target_count * 100, 1)
                : 0.0,
        ]);

        return response()->json($users);
    }

    /**
     * GET /api/dashboard/neglected-leads
     * 放置リードアラート
     */
    public function neglectedLeads(Request $request): JsonResponse
    {
        $me = $request->user();

        $stages = LeadStage::whereNotNull('reassignment_threshold_days')
            ->where('is_active', true)
            ->get();

        $neglected = [];

        foreach ($stages as $stage) {
            $threshold = $stage->reassignment_threshold_days;

            $query = Lead::where('current_stage_id', $stage->id)
                ->where(function ($q) use ($threshold) {
                    $q->whereNull('last_activity_at')
                      ->orWhere('last_activity_at', '<', now()->subDays($threshold));
                })
                ->with(['owner']);

            if (!$me->isAdminOrManager()) {
                $query->where('owner_id', $me->id);
            }

            foreach ($query->get() as $lead) {
                $daysSince = $lead->last_activity_at
                    ? (int) $lead->last_activity_at->diffInDays(now())
                    : null;

                $neglected[] = [
                    'lead_id'                  => $lead->id,
                    'title'                    => $lead->title,
                    'owner_name'               => $lead->owner?->name ?? '未割り当て',
                    'stage_name'               => $stage->name,
                    'days_since_last_activity' => $daysSince,
                    'threshold_days'           => $threshold,
                ];
            }
        }

        // 超過日数（days_since - threshold）の大きい順にソート
        usort($neglected, fn($a, $b) =>
            (($b['days_since_last_activity'] ?? 0) - $b['threshold_days'])
            <=> (($a['days_since_last_activity'] ?? 0) - $a['threshold_days'])
        );

        return response()->json($neglected);
    }

    private function countNeglectedLeads(): int
    {
        $stages = LeadStage::whereNotNull('reassignment_threshold_days')
            ->where('is_active', true)
            ->get();

        $count = 0;
        foreach ($stages as $stage) {
            $count += Lead::where('current_stage_id', $stage->id)
                ->where(function ($q) use ($stage) {
                    $q->whereNull('last_activity_at')
                      ->orWhere('last_activity_at', '<', now()->subDays($stage->reassignment_threshold_days));
                })
                ->count();
        }

        return $count;
    }
}
