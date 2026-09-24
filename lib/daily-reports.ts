import apiCall from './api';

export interface DailyWorkReportEntry {
  time: string;
  activity: string;
  remarks: string;
}

export interface DailyWorkReport {
  id: string;
  employee_id: string;
  employee: string;
  reportDate: string;
  designation: string | null;
  department: string | null;
  entries: DailyWorkReportEntry[];
  keyAchievements: string | null;
  pendingWork: string | null;
  status: string;
  approverRole: string | null;
  approver: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  created_at: string;
  updated_at: string;
}

// The template's default time blocks (Mon-Sat, Sunday is skipped entirely -
// no report is submitted that day at all, not just left blank).
export const DEFAULT_DAILY_REPORT_ENTRIES: DailyWorkReportEntry[] = [
  { time: '8:30 AM - 10:30 AM', activity: '', remarks: '' },
  { time: '10:30 AM - 1:00 PM', activity: '', remarks: '' },
  { time: '1:00 PM - 1:30 PM', activity: 'Lunch Break', remarks: '' },
  { time: '2:00 PM - 5:00 PM', activity: '', remarks: '' },
];

/** Sundays are skipped - the company works Mon-Sat only ("Sunday: Off"). */
export function isSunday(dateStr: string): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return false;
  return new Date(year, month - 1, day).getDay() === 0;
}

// Admin/approver-facing endpoints (/daily-reports)

export async function getDailyReports(params?: {
  status?: string;
  employee_id?: string;
}): Promise<DailyWorkReport[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.employee_id) queryParams.append('employee_id', params.employee_id);

  const qs = queryParams.toString();
  const response = await apiCall<{ daily_reports: DailyWorkReport[] }>(`/daily-reports${qs ? `?${qs}` : ''}`, 'GET');
  return response.daily_reports || [];
}

export async function approveDailyReport(id: string): Promise<DailyWorkReport> {
  const response = await apiCall<{ daily_report: DailyWorkReport }>(`/daily-reports/${id}/approve`, 'POST');
  return response.daily_report;
}

export async function rejectDailyReport(id: string, reason?: string): Promise<DailyWorkReport> {
  const response = await apiCall<{ daily_report: DailyWorkReport }>(`/daily-reports/${id}/reject`, 'POST', { reason });
  return response.daily_report;
}
