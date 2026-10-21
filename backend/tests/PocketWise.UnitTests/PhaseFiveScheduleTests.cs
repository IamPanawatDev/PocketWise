using PocketWise.Application.Features.Budgets;
using PocketWise.Application.Features.RecurringTransactions;
using PocketWise.Domain.Enums;

namespace PocketWise.UnitTests;

public class PhaseFiveScheduleTests
{
    [Fact]
    public void GetCurrentPeriod_ReturnsMonthlyCycleContainingToday()
    {
        var period = BudgetPeriodCalculator.GetCurrentPeriod(
            BudgetPeriodType.Monthly,
            new DateOnly(2026, 10, 1),
            null,
            new DateOnly(2026, 10, 19));

        Assert.Equal((new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31)), period);
    }

    [Fact]
    public void GetCurrentPeriod_AnchorsWeeklyCycleToBudgetStartDate()
    {
        var period = BudgetPeriodCalculator.GetCurrentPeriod(
            BudgetPeriodType.Weekly,
            new DateOnly(2026, 10, 2),
            null,
            new DateOnly(2026, 10, 9));

        Assert.Equal((new DateOnly(2026, 10, 9), new DateOnly(2026, 10, 15)), period);
    }

    [Fact]
    public void GetCurrentPeriod_ReturnsNullAfterCustomEndDate()
    {
        var period = BudgetPeriodCalculator.GetCurrentPeriod(
            BudgetPeriodType.Custom,
            new DateOnly(2026, 10, 1),
            new DateOnly(2026, 10, 15),
            new DateOnly(2026, 10, 16));

        Assert.Null(period);
    }

    [Fact]
    public void GetCurrentPeriod_UsesTodayForOpenEndedCustomBudget()
    {
        var period = BudgetPeriodCalculator.GetCurrentPeriod(
            BudgetPeriodType.Custom,
            new DateOnly(2026, 10, 1),
            null,
            new DateOnly(2026, 10, 19));

        Assert.Equal((new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 19)), period);
    }

    [Fact]
    public void CalculateNextRunAt_SchedulesTheFirstOccurrenceAfterStartDate()
    {
        var nextRun = RecurringSchedule.CalculateNextRunAt(
            new DateOnly(2026, 10, 1),
            RecurringFrequency.Monthly,
            1);

        Assert.Equal(new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc), nextRun);
    }

    [Fact]
    public void IsWithinRange_IncludesTheEndDate()
    {
        var isWithinRange = RecurringSchedule.IsWithinRange(
            new DateOnly(2026, 11, 1),
            new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.True(isWithinRange);
    }
}
