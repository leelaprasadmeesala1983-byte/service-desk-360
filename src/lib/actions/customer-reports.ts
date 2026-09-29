"use server";

import {
  type Customer360Data,
  type CustomerReportFilterParams,
  type CustomerReportResult,
  getAllFilteredCustomersForExport,
  getCustomer360Details,
  getCustomerReports,
} from "@/db/queries/customer-reports";
import { buildExcelSpreadsheet } from "@/lib/excel-export";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

import { type ActionResult, actionError, actionOk } from "./result";

/**
 * Fetch aggregated customer reports with filters and pagination.
 */
export async function fetchCustomerReports(
  params: CustomerReportFilterParams = {},
): Promise<ActionResult<CustomerReportResult>> {
  try {
    const current = await requireUser();
    if (
      current.role !== "ADMIN" &&
      (current.role as string) !== "SUPER_ADMIN"
    ) {
      return actionError("Admins only.");
    }

    const data = await getCustomerReports(params, {
      role: current.role,
      id: current.id,
    });
    return actionOk(data);
  } catch (error) {
    console.error("fetchCustomerReports error:", error);
    return actionError("Failed to fetch customer reports.");
  }
}

/**
 * Fetch full 360-degree customer profile, ticket histories, and timeline.
 */
export async function fetchCustomer360(
  customerKey: string,
): Promise<ActionResult<Customer360Data>> {
  try {
    const current = await requireUser();
    if (
      current.role !== "ADMIN" &&
      (current.role as string) !== "SUPER_ADMIN"
    ) {
      return actionError("Admins only.");
    }

    const data = await getCustomer360Details(customerKey, {
      role: current.role,
      id: current.id,
    });
    if (!data) {
      return actionError("Customer not found.");
    }

    return actionOk(data);
  } catch (error) {
    console.error("fetchCustomer360 error:", error);
    return actionError("Failed to fetch customer 360 data.");
  }
}

/**
 * Export complete filtered customer dataset to real XLSX spreadsheet.
 */
export async function exportCustomerReportsExcel(
  params: CustomerReportFilterParams = {},
): Promise<ActionResult<{ data: string; filename: string }>> {
  try {
    const current = await requireUser();
    if (
      current.role !== "ADMIN" &&
      (current.role as string) !== "SUPER_ADMIN"
    ) {
      return actionError("Admins only.");
    }

    const customers = await getAllFilteredCustomersForExport(params, {
      role: current.role,
      id: current.id,
    });

    const headers = [
      "S.No",
      "Customer Name",
      "Mobile Number",
      "Email",
      "Services Count",
      "Installations Count",
      "Projects Count",
      "Total Requests",
      "Last Activity Date",
    ];

    const rows = customers.map((c, index) => [
      index + 1,
      c.customerName,
      c.mobileNumber || "—",
      c.email || "—",
      c.servicesCount,
      c.installationsCount,
      c.projectsCount,
      c.totalRequests,
      formatDate(c.lastActivityDate),
    ]);

    const dateSuffix = formatDate(new Date())
      .toLowerCase()
      .replace(/\s+/g, "-");
    const filename = `customer-reports-${dateSuffix}.xlsx`;

    const data = buildExcelSpreadsheet({
      sheetName: "Customer Reports",
      headers,
      rows,
    });

    return actionOk({ data, filename });
  } catch (error) {
    console.error("exportCustomerReportsExcel error:", error);
    return actionError("Failed to export customer reports to Excel.");
  }
}
