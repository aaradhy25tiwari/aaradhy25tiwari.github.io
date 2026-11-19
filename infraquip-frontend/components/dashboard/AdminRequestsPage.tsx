"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  User, Building2, MapPin, Phone, Hash, MessageSquare,
  HardHat, Handshake, RefreshCw, Loader2, Key, Eye, EyeOff,
  Sparkles, AlertCircle, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, scrollToTop } from "@/lib/utils";
import apiClient from "@/lib/api/client";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TempPasswordControl, validateTempPassword } from "@/components/shared/TempPasswordControl";

// ── Types ──────────────────────────────────────────────────────
type RequestStatus = "pending" | "approved" | "rejected";

interface AccountRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "vendor" | "customer" | "broker";
  company_name: string | null;
  city: string | null;
  gstin_pan: string | null;
  message: string | null;
  status: RequestStatus;
  rejection_reason: string | null;
  created_at: string;
}

interface RequestsResponse {
  items: AccountRequest[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ── Status badge ───────────────────────────────────────────────
const statusConfig: Record<RequestStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-3.5 w-3.5" />,
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="h-3.5 w-3.5" />,
    cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Reject modal ───────────────────────────────────────────────
function RejectModal({
  request,
  onClose,
  onConfirm,
  loading,
}: {
  request: AccountRequest;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md card-surface p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">Reject Request</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {request.full_name} ({request.email})
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason for rejection <span className="text-destructive">*</span></label>
          <textarea
            rows={4}
            placeholder="e.g. Unable to verify business credentials. Please reapply with valid GSTIN or PAN..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
          <p className="text-xs text-muted-foreground">This will be included in the rejection email.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            disabled={!reason.trim() || loading}
            onClick={() => onConfirm(reason.trim())}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject & Notify"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Approve modal with manual temporary password option ────────
function ApproveModal({
  request,
  onClose,
  onConfirm,
  loading,
  error,
}: {
  request: AccountRequest;
  onClose: () => void;
  onConfirm: (tempPassword?: string) => void;
  loading: boolean;
  error?: string | null;
}) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manualPassword, setManualPassword] = useState("");
  const validation = validateTempPassword(manualPassword);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mode === "manual") {
      if (!validation.isValid || loading) return;
      onConfirm(validation.trimmed);
    } else {
      if (loading) return;
      onConfirm(undefined);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent
        className="w-full max-w-lg p-6 space-y-5 rounded-2xl"
        onPointerDownOutside={(e) => { if (loading) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (loading) e.preventDefault(); }}
      >
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 flex-shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-lg">Approve Account</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Issue temporary credentials and activate account access
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* User Summary */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{request.full_name}</span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                request.role === "vendor"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : request.role === "broker"
                  ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
              )}
            >
              {request.role}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{request.email}</p>
          {request.company_name && (
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 pt-0.5">
              <Building2 className="h-3 w-3" /> {request.company_name}
            </p>
          )}
        </div>

        {/* Shared Temporary Password Control */}
        <TempPasswordControl
          mode={mode}
          onModeChange={setMode}
          manualPassword={manualPassword}
          onManualPasswordChange={setManualPassword}
          inputId="approve-manual-password-input"
          disabled={loading}
        />

        {/* Notice */}
        <p className="text-[11px] text-muted-foreground">
          The temporary password is valid for 24 hours. The user will be required to change it upon first login.
        </p>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            disabled={loading || (mode === "manual" && !validation.isValid)}
            onClick={handleSubmit}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><CheckCircle className="h-4 w-4 mr-1.5" /> Approve & Send</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Request card ───────────────────────────────────────────────
function RequestCard({
  req,
  onApprove,
  onReject,
  approving,
}: {
  req: AccountRequest;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
}) {
  const date = new Date(req.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="card-surface p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
            req.role === "vendor" ? "bg-amber-500/10"
              : req.role === "broker" ? "bg-violet-500/10"
              : "bg-blue-500/10"
          )}>
            {req.role === "vendor"
              ? <HardHat className="h-5 w-5 text-amber-500" />
              : req.role === "broker"
                ? <Handshake className="h-5 w-5 text-violet-500" />
                : <Building2 className="h-5 w-5 text-blue-500" />
            }
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{req.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{req.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            req.role === "vendor"
              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
              : req.role === "broker"
                ? "bg-violet-500/10 text-violet-600 border-violet-500/20"
                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
          )}>
            {req.role === "vendor" ? "Vendor" : req.role === "broker" ? "Broker" : "Customer"}
          </span>
          <StatusBadge status={req.status} />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {req.company_name && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{req.company_name}</span>
          </div>
        )}
        {req.city && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{req.city}</span>
          </div>
        )}
        {req.phone && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{req.phone}</span>
          </div>
        )}
        {req.gstin_pan && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-mono">{req.gstin_pan}</span>
          </div>
        )}
      </div>

      {/* Message */}
      {req.message && (
        <div className="flex gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
          <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{req.message}</p>
        </div>
      )}

      {/* Rejection reason (if rejected) */}
      {req.status === "rejected" && req.rejection_reason && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
          <span className="font-medium">Reason: </span>{req.rejection_reason}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">Submitted {date}</span>
        {req.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={onReject}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              className="btn-amber-glow"
              onClick={onApprove}
              disabled={approving}
            >
              {approving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <><CheckCircle className="h-3.5 w-3.5 mr-1" />Approve</>
              }
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page component ────────────────────────────────────────
export function AdminRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("pending");
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<AccountRequest | null>(null);
  const [approveTarget, setApproveTarget] = useState<AccountRequest | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const queryParams = new URLSearchParams({ page: String(page), per_page: "12" });
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const { data, isLoading, refetch } = useQuery<RequestsResponse>({
    queryKey: ["admin-account-requests", statusFilter, page],
    queryFn: () => apiClient.get(`/account-requests/admin?${queryParams}`).then(r => r.data),
  });

  // Stats
  const { data: stats } = useQuery<{ pending: number }>({
    queryKey: ["account-request-stats"],
    queryFn: () => apiClient.get("/account-requests/admin/stats").then(r => r.data),
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, tempPassword }: { id: string; tempPassword?: string }) =>
      apiClient.post(`/account-requests/admin/${id}/approve`, tempPassword ? { temp_password: tempPassword } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-account-requests"] });
      queryClient.invalidateQueries({ queryKey: ["account-request-stats"] });
      setApprovingId(null);
      setApproveTarget(null);
      setApproveError(null);
    },
    onError: (err: any) => {
      setApprovingId(null);
      const detail = err?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : (err?.message || "Failed to approve account request.");
      setApproveError(message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/account-requests/admin/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-account-requests"] });
      queryClient.invalidateQueries({ queryKey: ["account-request-stats"] });
      setRejectTarget(null);
      setRejectingId(null);
    },
    onError: () => setRejectingId(null),
  });

  const filterTabs: { value: RequestStatus | "all"; label: string }[] = [
    { value: "pending", label: `Pending${stats?.pending ? ` (${stats.pending})` : ""}` },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Account Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve new user registrations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              statusFilter === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-surface p-5 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded bg-muted" />
                  <div className="h-3 w-44 rounded bg-muted" />
                </div>
              </div>
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-8 rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={User}
          title={`No ${statusFilter !== "all" ? statusFilter : ""} requests`}
          description={
            statusFilter === "pending"
              ? "All caught up! New requests will appear here."
              : "No requests match this filter."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              approving={approvingId === req.id}
              onApprove={() => {
                setApproveError(null);
                setApproveTarget(req);
              }}
              onReject={() => setRejectTarget(req)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {data.total} request{data.total !== 1 ? "s" : ""} · Page {data.page} of {data.total_pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => p - 1);
                scrollToTop();
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.total_pages}
              onClick={() => {
                setPage((p) => p + 1);
                scrollToTop();
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Approve modal */}
      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          onClose={() => {
            setApproveTarget(null);
            setApproveError(null);
          }}
          loading={approvingId === approveTarget.id}
          error={approveError}
          onConfirm={(tempPassword) => {
            setApprovingId(approveTarget.id);
            setApproveError(null);
            approveMutation.mutate({ id: approveTarget.id, tempPassword });
          }}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          loading={rejectingId === rejectTarget.id}
          onConfirm={(reason) => {
            setRejectingId(rejectTarget.id);
            rejectMutation.mutate({ id: rejectTarget.id, reason });
          }}
        />
      )}
    </div>
  );
}
