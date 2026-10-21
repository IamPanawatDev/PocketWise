using PocketWise.Application.Common;
using Xunit;

namespace PocketWise.UnitTests;

public class JobScheduleHelperTests
{
    [Fact]
    public void GetDelayUntilNextDailyRun_WhenBeforeTarget_ReturnsDelayForToday()
    {
        // 01:30 AM now, target 02:00 AM -> 30 minutes
        var now = new DateTime(2026, 10, 21, 1, 30, 0, DateTimeKind.Local);
        var delay = JobScheduleHelper.GetDelayUntilNextDailyRun(targetHour: 2, targetMinute: 0, now);

        Assert.Equal(TimeSpan.FromMinutes(30), delay);
    }

    [Fact]
    public void GetDelayUntilNextDailyRun_WhenAfterTarget_ReturnsDelayForTomorrow()
    {
        // 03:00 AM now, target 02:00 AM -> 23 hours
        var now = new DateTime(2026, 10, 21, 3, 0, 0, DateTimeKind.Local);
        var delay = JobScheduleHelper.GetDelayUntilNextDailyRun(targetHour: 2, targetMinute: 0, now);

        Assert.Equal(TimeSpan.FromHours(23), delay);
    }

    [Fact]
    public void GetDelayUntilNextDailyRun_WhenExactlyAtTarget_Returns24Hours()
    {
        // 02:00 AM now, target 02:00 AM -> 24 hours (next day)
        var now = new DateTime(2026, 10, 21, 2, 0, 0, DateTimeKind.Local);
        var delay = JobScheduleHelper.GetDelayUntilNextDailyRun(targetHour: 2, targetMinute: 0, now);

        Assert.Equal(TimeSpan.FromHours(24), delay);
    }

    [Fact]
    public void GetDelayUntilNextWeeklyRun_WhenWednesday_ReturnsDelayUntilSunday()
    {
        // 2026-10-21 is Wednesday. Next Sunday is 2026-10-25.
        // Now: Wednesday 01:00 AM. Target: Sunday 03:00 AM.
        // Difference: 4 days and 2 hours = 98 hours.
        var now = new DateTime(2026, 10, 21, 1, 0, 0, DateTimeKind.Local);
        Assert.Equal(DayOfWeek.Wednesday, now.DayOfWeek);

        var delay = JobScheduleHelper.GetDelayUntilNextWeeklyRun(DayOfWeek.Sunday, targetHour: 3, targetMinute: 0, now);

        Assert.Equal(TimeSpan.FromHours(98), delay);
    }

    [Fact]
    public void GetDelayUntilNextWeeklyRun_WhenSundayBeforeTarget_ReturnsDelayForToday()
    {
        // 2026-10-25 is Sunday.
        // Now: Sunday 01:00 AM. Target: Sunday 03:00 AM.
        // Difference: 2 hours.
        var now = new DateTime(2026, 10, 25, 1, 0, 0, DateTimeKind.Local);
        Assert.Equal(DayOfWeek.Sunday, now.DayOfWeek);

        var delay = JobScheduleHelper.GetDelayUntilNextWeeklyRun(DayOfWeek.Sunday, targetHour: 3, targetMinute: 0, now);

        Assert.Equal(TimeSpan.FromHours(2), delay);
    }

    [Fact]
    public void GetDelayUntilNextWeeklyRun_WhenSundayAfterTarget_ReturnsDelayForNextSunday()
    {
        // 2026-10-25 is Sunday.
        // Now: Sunday 04:00 AM. Target: Sunday 03:00 AM.
        // Next run is 2026-11-01 03:00 AM (7 days - 1 hour = 167 hours).
        var now = new DateTime(2026, 10, 25, 4, 0, 0, DateTimeKind.Local);
        Assert.Equal(DayOfWeek.Sunday, now.DayOfWeek);

        var delay = JobScheduleHelper.GetDelayUntilNextWeeklyRun(DayOfWeek.Sunday, targetHour: 3, targetMinute: 0, now);

        Assert.Equal(TimeSpan.FromHours(167), delay);
    }
}
