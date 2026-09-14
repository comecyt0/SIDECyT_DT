<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user:id,name,email,rol_id')
            ->orderByDesc('id');

        if ($action = $request->query('action')) {
            $query->where('action', 'like', "%{$action}%");
        }
        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($subjectType = $request->query('subject_type')) {
            $query->where('subject_type', $subjectType);
        }
        if ($subjectId = $request->query('subject_id')) {
            $query->where('subject_id', $subjectId);
        }
        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', $to);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 25)));
    }
}
