
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
