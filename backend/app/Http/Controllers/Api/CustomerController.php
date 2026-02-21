<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        // 検索（会社名・ドメイン）
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('domain', 'like', "%{$search}%");
            });
        }

        // フィルタリング
        if ($industry = $request->query('industry_category')) {
            $query->where('industry_category', $industry);
        }
        if ($tier = $request->query('service_tier')) {
            $query->where('service_tier', $tier);
        }
        if ($existing = $request->query('is_existing_customer')) {
            $query->where('is_existing_customer', filter_var($existing, FILTER_VALIDATE_BOOLEAN));
        }

        // ソート
        $sortBy  = $request->query('sort_by', 'created_at');
        $sortDir = $request->query('sort_dir', 'desc');
        $allowed = ['name', 'service_tier', 'industry_category', 'employee_size', 'created_at'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage   = min((int) $request->query('per_page', 15), 100);
        $customers = $query->paginate($perPage);

        return response()->json($customers);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = Customer::create($request->validated());

        return response()->json($customer, 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        return response()->json($customer);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer->update($request->validated());

        return response()->json($customer->fresh());
    }

    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => '権限がありません。'], 403);
        }

        $customer->delete();

        return response()->json(['message' => '顧客を削除しました。']);
    }
}
