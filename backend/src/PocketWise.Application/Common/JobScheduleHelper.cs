namespace PocketWise.Application.Common;

public static class JobScheduleHelper
{
    /// <summary>
    /// Calculates the delay until the next daily run at the specified hour and minute (local time).
    /// </summary>
    public static TimeSpan GetDelayUntilNextDailyRun(int targetHour, int targetMinute, DateTime now)
    {
        targetHour = Math.Clamp(targetHour, 0, 23);
        targetMinute = Math.Clamp(targetMinute, 0, 59);

        var targetTime = new DateTime(now.Year, now.Month, now.Day, targetHour, targetMinute, 0, now.Kind);
        if (targetTime <= now)
        {
            targetTime = targetTime.AddDays(1);
        }
        return targetTime - now;
    }

    /// <summary>
    /// Calculates the delay until the next weekly run on the specified day of week at the specified hour and minute (local time).
    /// </summary>
    public static TimeSpan GetDelayUntilNextWeeklyRun(DayOfWeek targetDay, int targetHour, int targetMinute, DateTime now)
    {
        targetHour = Math.Clamp(targetHour, 0, 23);
        targetMinute = Math.Clamp(targetMinute, 0, 59);

        int daysUntilTarget = ((int)targetDay - (int)now.DayOfWeek + 7) % 7;
        var targetTime = new DateTime(now.Year, now.Month, now.Day, targetHour, targetMinute, 0, now.Kind)
            .AddDays(daysUntilTarget);

        if (targetTime <= now)
        {
            targetTime = targetTime.AddDays(7);
        }
        return targetTime - now;
    }
}
