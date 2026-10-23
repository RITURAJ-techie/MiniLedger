
import { apiClient } from "./client";

export interface DashboardSummary {
  totalLent: string;
  totalRepaid: string;
  overdueAmount: string;
}

export interface LoanRecord {
  id: string;
  friendName: string;
  amount: string;
  dueDate: string;
  status: "pending" | "repaid";
  createdAt: string;
  repaidAt: string | null;
  archivedAt: string | null;
}

export interface CreateLoanInput {
  friendName: string;
  amount: number;
  dueDate: string;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<{
    success: boolean;
    data: DashboardSummary;
  }>("/dashboard/summary");

  return response.data.data;
}

export async function getLoans(): Promise<LoanRecord[]> {
  const response = await apiClient.get<{
    success: boolean;
    data: LoanRecord[];
  }>("/loans");

  return response.data.data;
}

export async function createLoan(input: CreateLoanInput): Promise<LoanRecord> {
  const response = await apiClient.post<{
    success: boolean;
    data: LoanRecord;
  }>("/loans", input);

  return response.data.data;
}

export async function repayLoan(loanId: string): Promise<LoanRecord> {
  const response = await apiClient.patch<{
    success: boolean;
    data: LoanRecord;
  }>(`/loans/${loanId}/repay`);

  return response.data.data;
}

export async function archiveLoan(loanId: string): Promise<LoanRecord> {
  const response = await apiClient.patch<{
    success: boolean;
    data: LoanRecord;
  }>(`/loans/${loanId}/archive`);

  return response.data.data;
}

export async function restoreLoan(loanId: string): Promise<LoanRecord> {
  const response = await apiClient.patch<{
    success: boolean;
    data: LoanRecord;
  }>(`/loans/${loanId}/restore`);

  return response.data.data;
}

export async function getArchivedLoans(): Promise<LoanRecord[]> {
  const response = await apiClient.get<{
    success: boolean;
    data: LoanRecord[];
  }>("/loans/archived");

  return response.data.data;
}