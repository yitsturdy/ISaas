<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: sans-serif; color: #333; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; }
        .alert { color: #c0392b; font-weight: bold; }
    </style>
</head>
<body>
    <p>{{ $owner->name }} さん、こんにちは。</p>
    <p>以下のリードが放置状態になっています。早急にご対応ください。</p>

    <table>
        <thead>
            <tr>
                <th>タイトル</th>
                <th>ステージ</th>
                <th>最終活動日</th>
                <th>経過日数</th>
                <th>閾値（日）</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($leads as $lead)
            <tr>
                <td>{{ $lead->title }}</td>
                <td>{{ $lead->currentStage?->name ?? '未設定' }}</td>
                <td>{{ $lead->last_activity_at?->format('Y/m/d') ?? '-' }}</td>
                <td class="alert">{{ $lead->days_since_last_activity }} 日</td>
                <td>{{ $lead->currentStage?->reassignment_threshold_days ?? '-' }} 日</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <p style="margin-top: 24px; font-size: 12px; color: #999;">
        このメールは ISaas システムから自動送信されています。
    </p>
</body>
</html>
