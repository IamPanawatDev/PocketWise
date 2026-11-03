using FluentValidation;
using PocketWise.Application.DTOs.RecurringTransactions;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Validators;

public class CreateRecurringTransactionValidator : AbstractValidator<CreateRecurringTransactionRequest>
{
    public CreateRecurringTransactionValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("จำนวนเงินต้องมากกว่า 0");
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.IntervalValue).GreaterThan(0).WithMessage("รอบต้องมากกว่า 0");
        RuleFor(x => x.StartDate).NotEmpty().WithMessage("ต้องระบุวันที่เริ่ม");
        RuleFor(x => x.EndDate)
            .Must((req, end) => !end.HasValue || end.Value >= req.StartDate)
            .WithMessage("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม");

        RuleFor(x => x.DaysOfWeek)
            .Must(days => days != null && days.Count > 0)
            .When(x => x.Frequency == RecurringFrequency.Custom)
            .WithMessage("กรุณาเลือกอย่างน้อย 1 วันสำหรับความถี่แบบกำหนดเอง");

        RuleFor(x => x.DaysOfWeek)
            .Must(days => days == null || days.All(d => d >= 0 && d <= 6))
            .When(x => x.Frequency == RecurringFrequency.Custom)
            .WithMessage("วันที่เลือกต้องอยู่ในช่วงวันอาทิตย์ (0) ถึงวันเสาร์ (6)");
    }
}
