<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeadStage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadStageController extends Controller
{
    public function index(): JsonResponse
    {
        $stages = LeadStage::orderBy('display_order')->get();
        return response()->json($stages);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Adminのみ操作できます。'], 403);
        }

        $data = $request->validate([
            'name'                         => ['required', 'string', 'max:100'],
            'display_order'                => ['required', 'integer', 'min:0'],
            'is_active'                    => ['boolean'],
            'reassignment_threshold_days'  => ['nullable', 'integer', 'min:1'],
        ]);

        $stage = LeadStage::create($data);
        return response()->json($stage, 201);
    }

    public function show(LeadStage $leadStage): JsonResponse
    {
        return response()->json($leadStage);
    }

    public function update(Request $request, LeadStage $leadStage): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Adminのみ操作できます。'], 403);
        }

        $data = $request->validate([
            'name'                         => ['sometimes', 'required', 'string', 'max:100'],
            'display_order'                => ['sometimes', 'integer', 'min:0'],
            'is_active'                    => ['boolean'],
            'reassignment_threshold_days'  => ['nullable', 'integer', 'min:1'],
        ]);

        $leadStage->update($data);
        return response()->json($leadStage);
    }

    public function destroy(Request $request, LeadStage $leadStage): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Adminのみ操作できます。'], 403);
        }

        if ($leadStage->leads()->exists()) {
            return response()->json(['message' => 'このステージに紐づくリードが存在するため削除できません。'], 422);
        }

        $leadStage->delete();
        return response()->json(['message' => 'ステージを削除しました。']);
    }
}
