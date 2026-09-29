import { QuickCashView } from "@/components/quick-cash/quick-cash-view";
import {
  getDailyRegister,
  getMonthlySummary,
  listCashTransactions,
  listDailyRegisters,
} from "@/db/queries/cash-transactions";
import { formatLocalDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function QuickCashPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: "today" | "history" | "monthly";
    page?: string;
    from?: string;
    to?: string;
    limit?: string;
    date?: string;
    year?: string;
    month?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const now = new Date();
  const todayStr = formatLocalDate(now);
  const firstDayOfCurrentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const currentTab = params.tab || "today";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const perPage = params.limit ? parseInt(params.limit, 10) : 10;

  const targetDate = params.date || todayStr;
  const targetYear = params.year
    ? parseInt(params.year, 10)
    : now.getFullYear();
  const targetMonth = params.month
    ? parseInt(params.month, 10)
    : now.getMonth() + 1;

  const isCurrentMonth =
    targetYear === now.getFullYear() && targetMonth === now.getMonth() + 1;

  const defaultMonthlyFrom = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
  const defaultMonthlyTo = isCurrentMonth
    ? todayStr
    : `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(new Date(targetYear, targetMonth, 0).getDate()).padStart(2, "0")}`;

  const monthlyFrom = params.from || defaultMonthlyFrom;
  const monthlyTo = params.to || defaultMonthlyTo;

  // 1. Fetch Today's / Target Day's Register (automatic daily session)
  const todayRegisterPromise = getDailyRegister(targetDate);

  // 2. Fetch Transactions for the active tab
  const transactionsPromise =
    currentTab === "monthly"
      ? listCashTransactions({
          page,
          limit: perPage,
          from: monthlyFrom,
          to: monthlyTo,
        })
      : listCashTransactions({
          page,
          limit: perPage,
          from: targetDate,
          to: targetDate,
        });

  // 3. Tab-targeted fetching: fetch history/monthly queries only when their tab is active
  const historyPromise =
    currentTab === "history"
      ? listDailyRegisters({ page, limit: perPage })
      : Promise.resolve({ rows: [], total: 0 });

  const defaultMonthlySummary = {
    year: targetYear,
    month: targetMonth,
    monthLabel: `${MONTH_NAMES[targetMonth - 1] || "Current"} ${targetYear}`,
    from: monthlyFrom,
    to: monthlyTo,
    openingBalance: "0.00",
    totalCashIn: "0.00",
    totalCashOut: "0.00",
    closingBalance: "0.00",
  };

  const monthlyPromise =
    currentTab === "monthly"
      ? getMonthlySummary(targetYear, targetMonth, {
          from: monthlyFrom,
          to: monthlyTo,
        })
      : Promise.resolve(defaultMonthlySummary);

  // Run all active queries in parallel
  const [
    todayRegister,
    { rows: activeTransactions, total: activeTotal },
    { rows: historyRows, total: historyTotal },
    monthlySummary,
  ] = await Promise.all([
    todayRegisterPromise,
    transactionsPromise,
    historyPromise,
    monthlyPromise,
  ]);

  return (
    <QuickCashView
      initialTab={currentTab}
      todayRegister={todayRegister}
      transactions={activeTransactions}
      total={activeTotal}
      page={page}
      perPage={perPage}
      historyRows={historyRows}
      historyTotal={historyTotal}
      monthlySummary={monthlySummary}
      selectedDate={targetDate}
      monthlyFrom={monthlyFrom}
      monthlyTo={monthlyTo}
      defaultMonthlyFrom={firstDayOfCurrentMonth}
      defaultMonthlyTo={todayStr}
    />
  );
}
