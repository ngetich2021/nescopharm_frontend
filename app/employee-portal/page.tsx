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
  getEmployeePortalLeaveRequests,
  getEmployeePortalProfile,
  getEmployeePortalSalaryAdvances,
} from "@/lib/employee-portal";
import type { Employee } from "@/lib/employees";
import type { LeaveRequest } from "@/lib/leave";
import type { SalaryAdvanceRequest } from "@/lib/salary-advance";
import { Briefcase, CalendarDays, CreditCard, UserRound } from "lucide-react";

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
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvanceRequest[]>([]);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [profile, leaveData, advanceData] = await Promise.all([
        getEmployeePortalProfile(),
        getEmployeePortalLeaveRequests(),
        getEmployeePortalSalaryAdvances(),
      ]);
      setEmployee(profile);
      setLeaveRequests(leaveData);
      setSalaryAdvances(advanceData);
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

  useEffect(() => {
    loadData();
  }, []);

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployeePortalLeaveRequest(leaveForm);
      toast({ title: "Success", description: "Leave request submitted." });
      setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit leave request.", variant: "destructive" });
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leave" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="salary">Salary Advance</TabsTrigger>
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
                <Button type="submit">Submit Leave Request</Button>
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
                <Button type="submit">Submit Salary Advance Request</Button>
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
      </Tabs>
    </div>
  );
}
