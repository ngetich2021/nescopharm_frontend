"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  createEmployeePortalLeaveRequest,
  createEmployeePortalSalaryAdvance,
  createEmployeePortalDailyReport,
  getEmployeePortalLeaveRequests,
  getEmployeePortalProfile,
  getEmployeePortalSalaryAdvances,
  getEmployeePortalDailyReports,
} from "@/lib/employee-portal";
import { getLeaveRequests, approveLeaveRequest, updateLeaveRequest } from "@/lib/leave";
import { getSalaryAdvances, approveSalaryAdvance, updateSalaryAdvance } from "@/lib/salary-advance";
import { getDailyReports, approveDailyReport, rejectDailyReport, isSunday, DEFAULT_DAILY_REPORT_ENTRIES } from "@/lib/daily-reports";
import { useAuth } from "@/lib/auth-context";
import type { Employee } from "@/lib/employees";
import type { LeaveRequest } from "@/lib/leave";
import type { SalaryAdvanceRequest } from "@/lib/salary-advance";
import type { DailyWorkReport, DailyWorkReportEntry } from "@/lib/daily-reports";
import { Briefcase, CalendarDays, CreditCard, UserRound, FileBarChart, ShieldCheck, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
  inactive: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-800",
  terminated: "bg-red-100 text-red-800",
};

function formatStatus(status?: string | null) {
  if (!status) return "Not set";
  return status.replace(/_/g, " ");
}

function formatMoney(amount?: string | number | null) {
  const value = Number(amount || 0);
  return `KES ${value.toLocaleString()}`;
}

function getStatusClass(status?: string | null) {
  if (!status) return "bg-slate-100 text-slate-700";
  return STATUS_STYLES[status.toLowerCase()] || "bg-slate-100 text-slate-700";
}

export default function EmployeePortalPage() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const canApproveLeave = hasPermission("can_approve_leave");
  const canApproveSalary = hasPermission("can_approve_salary_changes");
  const canApproveDailyReports = hasPermission("can_approve_daily_reports");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyWorkReport[]>([]);
  const [pendingLeaveApprovals, setPendingLeaveApprovals] = useState<LeaveRequest[]>([]);
  const [pendingAdvanceApprovals, setPendingAdvanceApprovals] = useState<SalaryAdvanceRequest[]>([]);
  const [pendingDailyReportApprovals, setPendingDailyReportApprovals] = useState<DailyWorkReport[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [advanceForm, setAdvanceForm] = useState({
    amount: "",
    request_date: "",
    reason: "",
  });
  const [dailyReportForm, setDailyReportForm] = useState<{
    report_date: string;
    entries: DailyWorkReportEntry[];
    key_achievements: string;
    pending_work: string;
  }>({
    report_date: "",
    entries: DEFAULT_DAILY_REPORT_ENTRIES.map((entry) => ({ ...entry })),
    key_achievements: "",
    pending_work: "",
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [submittingDailyReport, setSubmittingDailyReport] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profile, leaveData, advanceData, dailyReportData] = await Promise.all([
        getEmployeePortalProfile(),
        getEmployeePortalLeaveRequests(),
        getEmployeePortalSalaryAdvances(),
        getEmployeePortalDailyReports(),
      ]);
      setEmployee(profile);
      setLeaveRequests(leaveData);
      setSalaryAdvances(advanceData);
      setDailyReports(dailyReportData);
    } catch (error: any) {
      toast({
        title: "Employee Portal",
        description: error.message || "Failed to load employee portal.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Separate from the self-service data above: what THIS user (as an
  // approver - GM/Director, or explicitly granted approval rights) needs to
  // review for other employees. Fetched independently so an ordinary
  // employee without approval rights never triggers this (and never sees a
  // needless 403) - the section itself is only rendered when eligible too.
  const loadPendingApprovals = async () => {
    try {
      const [leaveData, advanceData, dailyReportData] = await Promise.all([
        canApproveLeave ? getLeaveRequests({ status: "pending" }) : Promise.resolve([]),
        canApproveSalary ? getSalaryAdvances({ status: "pending" }) : Promise.resolve([]),
        canApproveDailyReports ? getDailyReports({ status: "pending" }) : Promise.resolve([]),
      ]);
      setPendingLeaveApprovals(leaveData);
      setPendingAdvanceApprovals(advanceData);
      setPendingDailyReportApprovals(dailyReportData);
    } catch (error: any) {
      // Non-fatal - the self-service portal above still works either way.
      console.error("Failed to load pending approvals", error);
    }
  };

  useEffect(() => {
    loadData();
    loadPendingApprovals();
  }, []);

  const handleApproveLeave = async (id: string) => {
    setApprovingId(id);
    try {
      await approveLeaveRequest(id);
      toast({ title: "Success", description: "Leave request approved." });
      loadPendingApprovals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve leave request.", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectLeave = async (id: string) => {
    setApprovingId(id);
    try {
      await updateLeaveRequest(id, { status: "rejected" });
      toast({ title: "Leave request rejected" });
      loadPendingApprovals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reject leave request.", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveAdvance = async (id: string) => {
    setApprovingId(id);
    try {
      await approveSalaryAdvance(id);
      toast({ title: "Success", description: "Salary advance approved." });
      loadPendingApprovals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve salary advance.", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectAdvance = async (id: string) => {
    setApprovingId(id);
    try {
      await updateSalaryAdvance(id, { status: "rejected" });
      toast({ title: "Salary advance rejected" });
      loadPendingApprovals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reject salary advance.", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveDailyReport = async (id: string) => {
    setApprovingId(id);
    try {
      await approveDailyReport(id);
      toast({ title: "Success", description: "Daily work report approved." });
      loadPendingApprovals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve daily work report.", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectDailyReport = async (id: string) => {
    setApprovingId(id);
    try {
      await rejectDailyReport(id);
      toast({ title: "Daily work report rejected" });
      loadPendingApprovals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reject daily work report.", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const updateDailyReportEntry = (index: number, field: keyof DailyWorkReportEntry, value: string) => {
    setDailyReportForm((prev) => ({
      ...prev,
      entries: prev.entries.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    }));
  };

  const addDailyReportEntry = () => {
    setDailyReportForm((prev) => ({
      ...prev,
      entries: [...prev.entries, { time: "", activity: "", remarks: "" }],
    }));
  };

  const removeDailyReportEntry = (index: number) => {
    setDailyReportForm((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  };

  const handleDailyReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingDailyReport) return;
    if (!dailyReportForm.report_date) {
      toast({ title: "Error", description: "Please select a report date.", variant: "destructive" });
      return;
    }
    if (isSunday(dailyReportForm.report_date)) {
      toast({
        title: "Sundays are skipped",
        description: "Daily work reports are not required on Sundays. Please pick another date.",
        variant: "destructive",
      });
      return;
    }
    setSubmittingDailyReport(true);
    try {
      await createEmployeePortalDailyReport({
        report_date: dailyReportForm.report_date,
        entries: dailyReportForm.entries,
        key_achievements: dailyReportForm.key_achievements,
        pending_work: dailyReportForm.pending_work,
      });
      toast({ title: "Success", description: "Daily work report submitted." });
      setDailyReportForm({
        report_date: "",
        entries: DEFAULT_DAILY_REPORT_ENTRIES.map((entry) => ({ ...entry })),
        key_achievements: "",
        pending_work: "",
      });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit daily work report.", variant: "destructive" });
    } finally {
      setSubmittingDailyReport(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against double-submission (double-click, slow network + repeat
    // click, etc.) creating multiple identical requests.
    if (submittingLeave) return;
    setSubmittingLeave(true);
    try {
      await createEmployeePortalLeaveRequest(leaveForm);
      toast({ title: "Success", description: "Leave request submitted." });
      setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit leave request.", variant: "destructive" });
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingAdvance) return;
    setSubmittingAdvance(true);
    try {
      await createEmployeePortalSalaryAdvance({
        amount: Number(advanceForm.amount),
        request_date: advanceForm.request_date,
        reason: advanceForm.reason,
      });
      toast({ title: "Success", description: "Salary advance request submitted." });
      setAdvanceForm({ amount: "", request_date: "", reason: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit salary advance request.", variant: "destructive" });
    } finally {
      setSubmittingAdvance(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading employee portal...</div>;
  }

  if (!employee) {
    return <div className="p-6 text-sm text-muted-foreground">No employee profile is linked to this login yet.</div>;
  }

  const employeeStatus = employee.employment_status || (employee.is_active ? "active" : "inactive");
  const pendingLeaveCount = leaveRequests.filter((item) => item.status.toLowerCase() === "pending").length;
  const pendingAdvanceCount = salaryAdvances.filter((item) => item.status.toLowerCase() === "pending").length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit border border-white/20 bg-white/10 text-white hover:bg-white/10">Employee Portal</Badge>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {[employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Employee Workspace"}
              </h1>
              <p className="max-w-2xl text-sm text-slate-200">
                Submit leave and salary advance requests, track approval progress, and see who is responsible for reviewing each request.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <UserRound className="h-5 w-5 text-emerald-200" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Status</p>
                  <p className="text-sm font-semibold capitalize">{formatStatus(employeeStatus)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <CalendarDays className="h-5 w-5 text-emerald-200" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Pending Leave</p>
                  <p className="text-sm font-semibold">{pendingLeaveCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <CreditCard className="h-5 w-5 text-emerald-200" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Pending Advances</p>
                  <p className="text-sm font-semibold">{pendingAdvanceCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {(canApproveLeave || canApproveSalary || canApproveDailyReports) && (
        <Card className="shadow-sm border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Approvals
              {(pendingLeaveApprovals.length + pendingAdvanceApprovals.length + pendingDailyReportApprovals.length) > 0 && (
                <Badge className="bg-amber-100 text-amber-800">
                  {pendingLeaveApprovals.length + pendingAdvanceApprovals.length + pendingDailyReportApprovals.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingLeaveApprovals.length === 0 && pendingAdvanceApprovals.length === 0 && pendingDailyReportApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting on your review right now.</p>
            ) : (
              <>
                {canApproveLeave && pendingLeaveApprovals.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-semibold">{req.employee} - {req.leaveType} leave</p>
                      <p className="text-xs text-muted-foreground">{req.startDate} to {req.endDate}</p>
                      {req.reason && <p className="text-xs text-muted-foreground mt-1">{req.reason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        disabled={approvingId === req.id}
                        onClick={() => handleApproveLeave(req.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-300 hover:bg-red-50"
                        disabled={approvingId === req.id}
                        onClick={() => handleRejectLeave(req.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {canApproveSalary && pendingAdvanceApprovals.map((adv) => (
                  <div key={adv.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-semibold">{adv.employee} - {formatMoney(adv.amount)}</p>
                      <p className="text-xs text-muted-foreground">Requested {adv.requestDate}</p>
                      {adv.reason && <p className="text-xs text-muted-foreground mt-1">{adv.reason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        disabled={approvingId === adv.id}
                        onClick={() => handleApproveAdvance(adv.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-300 hover:bg-red-50"
                        disabled={approvingId === adv.id}
                        onClick={() => handleRejectAdvance(adv.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {canApproveDailyReports && pendingDailyReportApprovals.map((report) => (
                  <div key={report.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-semibold">{report.employee} - Daily Work Report</p>
                      <p className="text-xs text-muted-foreground">{report.reportDate}</p>
                      {report.keyAchievements && <p className="text-xs text-muted-foreground mt-1">{report.keyAchievements}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        disabled={approvingId === report.id}
                        onClick={() => handleApproveDailyReport(report.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-300 hover:bg-red-50"
                        disabled={approvingId === report.id}
                        onClick={() => handleRejectDailyReport(report.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Employment Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p>
              <p className="mt-2 text-sm font-semibold">{employee.department || "Not assigned"}</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Position</p>
              <p className="mt-2 text-sm font-semibold">{employee.position || "Not assigned"}</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Employee Number</p>
              <p className="mt-2 text-sm font-semibold">{employee.employee_number || "Pending"}</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Basic Salary</p>
              <p className="mt-2 text-sm font-semibold">{employee.basic_salary ? formatMoney(employee.basic_salary) : "Not set"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Approval Routing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-700" />
                <p className="text-sm font-semibold">Leave Approver</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {employee.leave_approver
                  ? `${employee.leave_approver.first_name} ${employee.leave_approver.last_name}`.trim()
                  : "No leave approver has been assigned yet."}
              </p>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-700" />
                <p className="text-sm font-semibold">Salary Advance Approver</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {employee.salary_advance_approver
                  ? `${employee.salary_advance_approver.first_name} ${employee.salary_advance_approver.last_name}`.trim()
                  : "No salary advance approver has been assigned yet."}
              </p>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-emerald-700" />
                <p className="text-sm font-semibold">Daily Report Approver</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Routed automatically to the GM, or the Managing Director if you are the GM.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leave" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="salary">Salary Advance</TabsTrigger>
          <TabsTrigger value="daily-reports">Daily Reports</TabsTrigger>
          <TabsTrigger value="data-privacy">Data Privacy &amp; Security</TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="grid gap-4 xl:grid-cols-[1.05fr_1.2fr]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Apply for Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Leave Type</Label>
                    <Input value={leaveForm.leave_type} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} placeholder="annual" />
                  </div>
                  <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-muted-foreground">
                    Requests submitted here also appear in the main leave management table for authorized reviewers.
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows={5} />
                </div>
                <Button type="submit" disabled={submittingLeave}>
                  {submittingLeave ? "Submitting..." : "Submit Leave Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recent Leave Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaveRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No leave requests yet. Your submissions will show here and on the HR leave management table.
                </div>
              ) : (
                leaveRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold capitalize">{formatStatus(request.leaveType)} leave</p>
                        <p className="text-sm text-muted-foreground">
                          {request.startDate} to {request.endDate}
                        </p>
                      </div>
                      <Badge className={getStatusClass(request.status)}>{formatStatus(request.status)}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="grid gap-4 xl:grid-cols-[1.05fr_1.2fr]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Request Salary Advance</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Request Date</Label>
                    <Input type="date" value={advanceForm.request_date} onChange={(e) => setAdvanceForm({ ...advanceForm, request_date: e.target.value })} />
                  </div>
                </div>
                <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-muted-foreground">
                  Salary advance requests submitted here feed into the salary advance management page for reviewers and finance teams.
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={advanceForm.reason} onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })} rows={5} />
                </div>
                <Button type="submit" disabled={submittingAdvance}>
                  {submittingAdvance ? "Submitting..." : "Submit Salary Advance Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recent Salary Advance Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {salaryAdvances.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No salary advance requests yet. Submitted requests will show here and in the HR salary advance table.
                </div>
              ) : (
                salaryAdvances.map((request) => (
                  <div key={request.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{formatMoney(request.amount)}</p>
                        <p className="text-sm text-muted-foreground">{request.requestDate}</p>
                      </div>
                      <Badge className={getStatusClass(request.status)}>{formatStatus(request.status)}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily-reports" className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Submit Daily Work Report</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDailyReportSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    className="max-w-xs"
                    value={dailyReportForm.report_date}
                    onChange={(e) => setDailyReportForm({ ...dailyReportForm, report_date: e.target.value })}
                  />
                  {dailyReportForm.report_date && isSunday(dailyReportForm.report_date) && (
                    <p className="text-xs text-red-600">Sundays are skipped - no report is required that day. Please pick another date.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Work / Activity Log</Label>
                  <div className="space-y-3">
                    {dailyReportForm.entries.map((entry, index) => (
                      <div key={index} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[0.9fr_1.3fr_1fr_auto]">
                        <Input
                          placeholder="Time (e.g. 8:30 AM - 10:30 AM)"
                          value={entry.time}
                          onChange={(e) => updateDailyReportEntry(index, "time", e.target.value)}
                        />
                        <Input
                          placeholder="Work / Activity Completed"
                          value={entry.activity}
                          onChange={(e) => updateDailyReportEntry(index, "activity", e.target.value)}
                        />
                        <Input
                          placeholder="Remarks"
                          value={entry.remarks}
                          onChange={(e) => updateDailyReportEntry(index, "remarks", e.target.value)}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => removeDailyReportEntry(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addDailyReportEntry}>
                    <Plus className="h-4 w-4 mr-1" /> Add Time Block
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Today&apos;s Key Achievements</Label>
                    <Textarea
                      rows={4}
                      value={dailyReportForm.key_achievements}
                      onChange={(e) => setDailyReportForm({ ...dailyReportForm, key_achievements: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pending Work / Challenges</Label>
                    <Textarea
                      rows={4}
                      value={dailyReportForm.pending_work}
                      onChange={(e) => setDailyReportForm({ ...dailyReportForm, pending_work: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={submittingDailyReport}>
                  {submittingDailyReport ? "Submitting..." : "Submit Daily Work Report"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recent Daily Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dailyReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No daily work reports yet. Submitted reports will show here.
                </div>
              ) : (
                dailyReports.map((report) => (
                  <div key={report.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{report.reportDate}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.approverRole ? `Approver: ${report.approverRole}` : "Self-certified"}
                        </p>
                      </div>
                      <Badge className={getStatusClass(report.status)}>{formatStatus(report.status)}</Badge>
                    </div>
                    {report.keyAchievements && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Achievements: </span>
                        {report.keyAchievements}
                      </p>
                    )}
                    {report.pendingWork && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Pending: </span>
                        {report.pendingWork}
                      </p>
                    )}
                    {report.status === "rejected" && report.rejectionReason && (
                      <p className="mt-1 text-sm text-red-600">Reason: {report.rejectionReason}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-privacy">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-semibold">Data Privacy and Security</p>
              <p className="text-sm text-muted-foreground">coming soon ...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
