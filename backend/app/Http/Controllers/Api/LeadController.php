<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lead\StoreLeadRequest;
use App\Http\Requests\Lead\UpdateLeadRequest;
use App\Http\Requests\Lead\TransitionLeadRequest;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\LeadStage;
use App\Models\LeadStageHistory;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function export(Request $request): StreamedResponse
    {
        $query = Lead::with(['customer', 'owner', 'currentStage']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('customer', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                  ->orWhere('title', 'like', "%{$search}%");
            });
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

        $leads    = $query->orderBy('created_at', 'desc')->get();
        $filename = 'leads_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($leads) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // BOM for Excel
            fputcsv($handle, ['ID', 'タイトル', '顧客名', '担当者', 'ステージ', 'メモ', '最終活動日', '作成日']);

            foreach ($leads as $lead) {
                fputcsv($handle, [
                    $lead->id,
                    $lead->title,
                    $lead->customer?->name ?? '',
                    $lead->owner?->name ?? '',
                    $lead->currentStage?->name ?? '',
                    $lead->note ?? '',
                    $lead->last_activity_at?->format('Y-m-d') ?? '',
                    $lead->created_at->format('Y-m-d'),
                ]);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $handle = fopen($request->file('file')->getPathname(), 'r');

        // BOM スキップ
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        fgetcsv($handle); // ヘッダー行スキップ

        $row          = 1;
        $successCount = 0;
        $errors       = [];

        while (($data = fgetcsv($handle)) !== false) {
            $row++;
            [$title, $customerName, $ownerUsername, $stageName, $note] = array_pad($data, 5, null);

            if (empty($title)) {
                $errors[] = ['row' => $row, 'message' => 'タイトルは必須です。'];
                continue;
            }
            if (empty($customerName)) {
                $errors[] = ['row' => $row, 'message' => '顧客名は必須です。'];
                continue;
            }

            $customer = Customer::where('name', $customerName)->first();
            if (!$customer) {
                $errors[] = ['row' => $row, 'message' => "顧客「{$customerName}」が見つかりません。"];
                continue;
            }

            $ownerId = null;
            if (!empty($ownerUsername)) {
                $owner = User::where('name', $ownerUsername)->orWhere('username', $ownerUsername)->first();
                if (!$owner) {
                    $errors[] = ['row' => $row, 'message' => "担当者「{$ownerUsername}」が見つかりません。"];
                    continue;
                }
                $ownerId = $owner->id;
            }

            $stageId = null;
            if (!empty($stageName)) {
                $stage = LeadStage::where('name', $stageName)->first();
                if (!$stage) {
                    $errors[] = ['row' => $row, 'message' => "ステージ「{$stageName}」が見つかりません。"];
                    continue;
                }
                $stageId = $stage->id;
            }

            Lead::create([
                'title'            => $title,
                'customer_id'      => $customer->id,
                'owner_id'         => $ownerId,
                'current_stage_id' => $stageId,
                'note'             => $note ?: null,
                'last_activity_at' => now(),
                'stage_updated_at' => $stageId ? now() : null,
            ]);
            $successCount++;
        }

        fclose($handle);

        return response()->json(['success_count' => $successCount, 'errors' => $errors]);
    }
}
