import type { RequestHandler } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { employees, leaveApplications, attendance } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
  try {
    // 1️⃣ Total active employees
    const totalEmployeesQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.isDeleted, false));

    const totalEmployees = totalEmployeesQuery[0]?.count ?? 0;

    // 2️⃣ Leave requests summary
    const leaveCountsQuery = await db
      .select({
        pending: sql<number>`count(*) filter (where ${leaveApplications.status} = 'Pending')`,
        approved: sql<number>`count(*) filter (where ${leaveApplications.status} = 'Approved')`,
        rejected: sql<number>`count(*) filter (where ${leaveApplications.status} = 'Rejected')`,
      })
      .from(leaveApplications);

    const leaveSummary = leaveCountsQuery[0] || { pending: 0, approved: 0, rejected: 0 };

    // 3️⃣ Attendance summary (today)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const attendanceQuery = await db
      .select({
        totalPresent: sql<number>`count(*)`,
      })
      .from(attendance)
      .where(eq(attendance.summaryDate, todayStr));

    const totalPresent = attendanceQuery[0]?.totalPresent ?? 0;
    const totalAbsent = totalEmployees - totalPresent;

    // 4️⃣ Build final metrics object
    const metrics = {
      totalEmployees,
      leaveSummary,
      attendanceSummary: {
        totalPresent,
        totalAbsent,
      },
    };

    return new Response(JSON.stringify({ data: metrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch metrics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
