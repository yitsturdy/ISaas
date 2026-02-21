<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // 検索
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%");
            });
        }

        // フィルタリング
        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // ソート
        $sortBy  = $request->query('sort_by', 'created_at');
        $sortDir = $request->query('sort_dir', 'desc');
        $allowedSorts = ['name', 'email', 'role', 'status', 'join_at', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min((int) $request->query('per_page', 15), 100);
        $users   = $query->paginate($perPage);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return response()->json($user, 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($user);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        // Admin 以外は role の変更不可
        $data = $request->validated();
        if (! $request->user()?->isAdmin()) {
            unset($data['role']);
        }

        $user->update($data);

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => '権限がありません。'], 403);
        }

        if ($request->user()->id === $user->id) {
            return response()->json(['message' => '自分自身は削除できません。'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'ユーザーを削除しました。']);
    }
}
