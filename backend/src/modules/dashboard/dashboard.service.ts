
import { and, eq, isNull, lt, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import { loans } from "../../db/schema.js";

export async function getDashboardSummary(userId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [summary] = await db
    .select({
      totalLent: sql<string>`
        coalesce(sum(${loans.amount}), 0)
      `,
      totalRepaid: sql<string>`
        coalesce(
          sum(
            case
              when ${loans.status} = 'repaid'
              then ${loans.amount}
              else 0
            end
          ),
          0
        )
      `,
      overdueAmount: sql<string>`
        coalesce(
          sum(
            case
              when ${loans.status} = 'pending'
                and ${loans.dueDate} < ${today}
              then ${loans.amount}
              else 0
            end
          ),
          0
        )
      `,
    })
    .from(loans)
    .where(
      and(
        eq(loans.userId, userId),
        isNull(loans.archivedAt),
      ),
    );

  return {
    totalLent: summary?.totalLent ?? "0",
    totalRepaid: summary?.totalRepaid ?? "0",
    overdueAmount: summary?.overdueAmount ?? "0",
  };
}
