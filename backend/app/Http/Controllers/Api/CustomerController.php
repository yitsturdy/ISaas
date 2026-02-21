<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function export(Request $request): StreamedResponse
    {
        $query = Customer::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('domain', 'like', "%{$search}%");
            });
        }
        if ($industry = $request->query('industry_category')) {
            $query->where('industry_category', $industry);
        }
        if ($tier = $request->query('service_tier')) {
            $query->where('service_tier', $tier);
        }

        $customers = $query->orderBy('created_at', 'desc')->get();
        $filename  = 'customers_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($customers) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // BOM for Excel
            fputcsv($handle, ['ID', '会社名', 'ドメイン', '業種', '従業員数', 'サービスティア', 'ウェブサイト', '既存顧客', '作成日']);

            foreach ($customers as $c) {
                fputcsv($handle, [
                    $c->id,
                    $c->name,
                    $c->domain ?? '',
                    $c->industry_category ?? '',
                    $c->employee_size ?? '',
                    $c->service_tier ?? '',
                    $c->website_url ?? '',
                    $c->is_existing_customer ? '既存' : '新規',
                    $c->created_at->format('Y-m-d'),
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
            [$name, $domain, $industry, $employeeSize, $serviceTier, $websiteUrl, $isExisting] = array_pad($data, 7, null);

            if (empty($name)) {
                $errors[] = ['row' => $row, 'message' => '会社名は必須です。'];
                continue;
            }

            Customer::create([
                'name'                 => $name,
                'domain'               => $domain ?: null,
                'industry_category'    => $industry ?: null,
                'employee_size'        => $employeeSize ?: null,
                'service_tier'         => $serviceTier ?: null,
                'website_url'          => $websiteUrl ?: null,
                'is_existing_customer' => in_array(strtolower($isExisting ?? ''), ['true', '1', 'yes', '既存']),
            ]);
            $successCount++;
        }

        fclose($handle);

        return response()->json(['success_count' => $successCount, 'errors' => $errors]);
    }
}
