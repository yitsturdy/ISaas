<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadRequest;
use App\Http\Requests\Lead\UpdateLeadRequest;
use App\Http\Requests\Lead\TransitionLeadRequest;
use App\Models\Lead;
use App\Models\LeadStageHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Lead::with(['customer', 'owner', 'currentStage']);

        if ($search = $request->query('search')) {
            $query->whereHas('customer', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                  ->orWhere('title', 'like', "%{$search}%");
        }

        if ($stageId = $request->query('stage_id')) {
            $query->where('current_stage_id', $stageId);
        }

        if ($ownerId = $request->query('owner_id')) {
            $query->where('owner_id', $ownerId);
        }

        if ($customerId = $request->query('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        $allowedSorts = ['created_at', 'last_activity_at', 'stage_updated_at', 'title'];
        $sortBy  = in_array($request->query('sort_by'), $allowedSorts) ? $request->query('sort_by') : 'created_at';
        $sortDir = $request->query('sort_dir') === 'asc' ? 'asc' : 'desc';

        $perPage = min((int) ($request->query('per_page', 20)), 100);

        $result = $query->orderBy($sortBy, $sortDir)->paginate($perPage);

        return response()->json($result);
    }

    public function store(StoreLeadRequest $request): JsonResponse
    {
        $lead = DB::transaction(function () use ($request) {
            $lead = Lead::create(array_merge($request->validated(), [
                'last_activity_at' => now(),
                'stage_updated_at' => $request->current_stage_id ? now() : null,
            ]));

            if ($lead->current_stage_id) {
                LeadStageHistory::create([
                    'lead_id'      => $lead->id,
                    'from_stage_id' => null,
                    'to_stage_id'  => $lead->current_stage_id,
                    'changed_by'   => $request->user()->id,
                    'reason_code'  => 'created',
                    'stay_days'    => null,
                ]);
            }

            return $lead->load(['customer', 'owner', 'currentStage']);
        });

        return response()->json($lead, 201);
    }

    public function show(Lead $lead): JsonResponse
    {
        return response()->json(
            $lead->load(['customer', 'owner', 'currentStage', 'stageHistories.fromStage', 'stageHistories.toStage', 'stageHistories.changedByUser'])
        );
    }

    public function update(UpdateLeadRequest $request, Lead $lead): JsonResponse
    {
        $lead->update($request->validated());
        return response()->json($lead->load(['customer', 'owner', 'currentStage']));
    }

    public function destroy(Lead $lead): JsonResponse
    {
        if (!request()->user()->isAdmin()) {
            return response()->json(['message' => '削除権限がありません。'], 403);
        }

        $lead->delete();
        return response()->json(['message' => 'リードを削除しました。']);
    }

    public function transition(TransitionLeadRequest $request, Lead $lead): JsonResponse
    {
        $toStageId   = $request->to_stage_id;
        $fromStageId = $lead->current_stage_id;

        if ($fromStageId === $toStageId) {
            return response()->json(['message' => '同じステージへの遷移はできません。'], 422);
        }

        DB::transaction(function () use ($lead, $fromStageId, $toStageId, $request) {
            $stayDays = null;
            if ($lead->stage_updated_at) {
                $stayDays = (int) $lead->stage_updated_at->diffInDays(now());
            }

            LeadStageHistory::create([
                'lead_id'       => $lead->id,
                'from_stage_id' => $fromStageId,
                'to_stage_id'   => $toStageId,
                'changed_by'    => $request->user()->id,
                'reason_code'   => $request->reason_code,
                'stay_days'     => $stayDays,
            ]);

            $lead->update([
                'current_stage_id' => $toStageId,
                'stage_updated_at' => now(),
                'last_activity_at' => now(),
            ]);
        });

        return response()->json($lead->load(['customer', 'owner', 'currentStage', 'stageHistories.fromStage', 'stageHistories.toStage', 'stageHistories.changedByUser']));
    }

    public function assign(Request $request, Lead $lead): JsonResponse
    {
        if (!$request->user()->isAdminOrManager()) {
            return response()->json(['message' => '担当者変更の権限がありません。'], 403);
        }

        $request->validate([
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $lead->update([
            'owner_id'         => $request->owner_id,
            'last_activity_at' => now(),
        ]);

        return response()->json($lead->load(['customer', 'owner', 'currentStage']));
    }
}
