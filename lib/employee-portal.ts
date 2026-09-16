import apiCall from "./api";
import type { Employee } from "./employees";
import type { LeaveRequest } from "./leave";
import type { SalaryAdvanceRequest } from "./salary-advance";

export async function getEmployeePortalProfile(): Promise<Employee> {
  const response = await apiCall<{ employee: Employee }>("/employee-portal/me", "GET");
  return response.employee;
}

export async function getEmployeePortalLeaveRequests(status?: string): Promise<LeaveRequest[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiCall<{ leave_requests: LeaveRequest[] }>(`/employee-portal/leave-requests${query}`, "GET");
  return response.leave_requests || [];
}

export async function createEmployeePortalLeaveRequest(data: {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}): Promise<LeaveRequest> {
  const response = await apiCall<{ leave_request: LeaveRequest }>("/employee-portal/leave-requests", "POST", data);
  return response.leave_request;
}

export async function getEmployeePortalSalaryAdvances(status?: string): Promise<SalaryAdvanceRequest[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiCall<{ salary_advances: SalaryAdvanceRequest[] }>(`/employee-portal/salary-advances${query}`, "GET");
  return response.salary_advances || [];
}

export async function createEmployeePortalSalaryAdvance(data: {
  amount: number;
  request_date: string;
  reason: string;
}): Promise<SalaryAdvanceRequest> {
  const response = await apiCall<{ salary_advance: SalaryAdvanceRequest }>("/employee-portal/salary-advances", "POST", data);
  return response.salary_advance;
}
