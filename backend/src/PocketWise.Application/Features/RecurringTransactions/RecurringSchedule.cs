using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.RecurringTransactions;

public static class RecurringSchedule
{
    public static List<int> ParseDaysOfWeek(string? daysOfWeek)
    {
        if (string.IsNullOrWhiteSpace(daysOfWeek))
        {
            return [];
        }

        return daysOfWeek
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => int.TryParse(s, out var v) ? (int?)v : null)
            .Where(v => v.HasValue && v.Value >= 0 && v.Value <= 6)
            .Select(v => v!.Value)
            .Distinct()
            .OrderBy(v => v)
            .ToList();
    }

    /// <summary>
    /// คำนวณเวลาที่ต้องสร้างรายการครั้งถัดไป (NextRunAt) จากวันที่อ้างอิง
    /// </summary>
    public static DateTime CalculateNextRunAt(DateOnly fromDate, RecurringFrequency frequency, int intervalValue, string? daysOfWeek = null)
    {
        if (frequency == RecurringFrequency.Custom && !string.IsNullOrWhiteSpace(daysOfWeek))
        {
            var targetDays = ParseDaysOfWeek(daysOfWeek);
            if (targetDays.Count > 0)
            {
                if (targetDays.Contains((int)fromDate.DayOfWeek))
                {
                    return fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                }

                for (var i = 1; i <= 7; i++)
                {
                    var candidate = fromDate.AddDays(i);
                    if (targetDays.Contains((int)candidate.DayOfWeek))
                    {
                        return candidate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                    }
                }
            }
        }

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
    public static DateTime Advance(DateTime currentNextRunAt, RecurringFrequency frequency, int intervalValue, string? daysOfWeek = null)
    {
        if (frequency == RecurringFrequency.Custom && !string.IsNullOrWhiteSpace(daysOfWeek))
        {
            var targetDays = ParseDaysOfWeek(daysOfWeek);
            if (targetDays.Count > 0)
            {
                var currentDay = DateOnly.FromDateTime(currentNextRunAt);
                for (var i = 1; i <= 7; i++)
                {
                    var candidate = currentDay.AddDays(i);
                    if (targetDays.Contains((int)candidate.DayOfWeek))
                    {
                        return candidate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                    }
                }
            }
        }

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
