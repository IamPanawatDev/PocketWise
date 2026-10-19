using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.RecurringTransactions;

public static class RecurringSchedule
{
    /// <summary>
    /// คำนวณเวลาที่ต้องสร้างรายการครั้งถัดไป (NextRunAt) จากวันที่อ้างอิง
    /// </summary>
    public static DateTime CalculateNextRunAt(DateOnly fromDate, RecurringFrequency frequency, int intervalValue)
    {
        var value = Math.Max(1, intervalValue);
        var next = frequency switch
        {
            RecurringFrequency.Daily => fromDate.AddDays(value),
            RecurringFrequency.Weekly => fromDate.AddDays(7 * value),
            RecurringFrequency.Monthly => fromDate.AddMonths(value),
            RecurringFrequency.Quarterly => fromDate.AddMonths(3 * value),
            RecurringFrequency.Yearly => fromDate.AddYears(value),
            _ => fromDate
        };

        return next.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
    }

    /// <summary>
    /// คำนวณ NextRunAt ถัดไปจาก NextRunAt ปัจจุบัน
    /// </summary>
    public static DateTime Advance(DateTime currentNextRunAt, RecurringFrequency frequency, int intervalValue)
    {
        var value = Math.Max(1, intervalValue);
        return frequency switch
        {
            RecurringFrequency.Daily => currentNextRunAt.AddDays(value),
            RecurringFrequency.Weekly => currentNextRunAt.AddDays(7 * value),
            RecurringFrequency.Monthly => currentNextRunAt.AddMonths(value),
            RecurringFrequency.Quarterly => currentNextRunAt.AddMonths(3 * value),
            RecurringFrequency.Yearly => currentNextRunAt.AddYears(value),
            _ => currentNextRunAt
        };
    }

    /// <summary>
    /// ตรวจว่ารายการยังอยู่ในช่วงเวลาที่ทำงาน (EndDate) หรือไม่
    /// </summary>
    public static bool IsWithinRange(DateOnly? endDate, DateTime nextRunDateUtc)
    {
        if (!endDate.HasValue)
        {
            return true;
        }

        var runDate = DateOnly.FromDateTime(nextRunDateUtc);
        return runDate <= endDate.Value;
    }
}
