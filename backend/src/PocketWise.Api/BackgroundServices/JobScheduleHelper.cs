using PocketWise.Application.Common;

namespace PocketWise.Api.BackgroundServices;

public static class JobScheduleHelper
{
    public static TimeSpan GetDelayUntilNextDailyRun(int targetHour, int targetMinute, DateTime now) =>
        PocketWise.Application.Common.JobScheduleHelper.GetDelayUntilNextDailyRun(targetHour, targetMinute, now);

    public static TimeSpan GetDelayUntilNextWeeklyRun(DayOfWeek targetDay, int targetHour, int targetMinute, DateTime now) =>
        PocketWise.Application.Common.JobScheduleHelper.GetDelayUntilNextWeeklyRun(targetDay, targetHour, targetMinute, now);
}
