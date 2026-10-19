using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.Budgets;

public static class BudgetPeriodCalculator
{
    /// <summary>
    /// คำนวณรอบงบ "ปัจจุบัน" ที่ครอบคลุมวันที่อ้างอิง (today)
    /// คืน null เมื่อยังไม่เริ่ม หรือสิ้นสุดรอบไปแล้ว
    /// </summary>
    public static (DateOnly From, DateOnly To)? GetCurrentPeriod(
        BudgetPeriodType type,
        DateOnly startDate,
        DateOnly? endDate,
        DateOnly today)
    {
        if (today < startDate)
        {
            return null;
        }

        if (type == BudgetPeriodType.Custom)
        {
            if (endDate.HasValue && today > endDate.Value)
            {
                return null;
            }

            return (startDate, endDate ?? today);
        }

        var cycleStart = startDate;
        var cycleEnd = AddPeriod(cycleStart, type).AddDays(-1);

        while (cycleEnd < today)
        {
            cycleStart = AddPeriod(cycleStart, type);
            cycleEnd = AddPeriod(cycleStart, type).AddDays(-1);

            if (cycleStart > startDate.AddYears(500))
            {
                // guard ป้องกัน infinite loop (ไม่ควรเกิดจริง)
                return null;
            }
        }

        if (endDate.HasValue && today > endDate.Value)
        {
            return null;
        }

        var from = cycleStart;
        var to = cycleEnd;
        if (endDate.HasValue && to > endDate.Value)
        {
            to = endDate.Value;
        }

        return (from, to);
    }

    public static DateTime ToUtcStart(DateOnly date) =>
        new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(7)).UtcDateTime;

    /// <summary>ปลายช่วงเป็นแบบ exclusive (ช่วงถัดไป) สำหรับ query range</summary>
    public static DateTime ToUtcEndExclusive(DateOnly date) =>
        ToUtcStart(date.AddDays(1));

    private static DateOnly AddPeriod(DateOnly date, BudgetPeriodType type) => type switch
    {
        BudgetPeriodType.Weekly => date.AddDays(7),
        BudgetPeriodType.Monthly => date.AddMonths(1),
        BudgetPeriodType.Quarterly => date.AddMonths(3),
        BudgetPeriodType.Yearly => date.AddYears(1),
        _ => date
    };
}
