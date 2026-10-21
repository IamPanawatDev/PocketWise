using FluentValidation;
using PocketWise.Application.DTOs.Transactions;

namespace PocketWise.Application.Validators;

public class UpdateTransactionValidator : AbstractValidator<UpdateTransactionRequest>
{
    public UpdateTransactionValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("จำนวนเงินต้องมากกว่า 0");
        RuleFor(x => x.CurrencyCode).NotEmpty().Length(3).WithMessage("รหัสสกุลเงินต้องเป็น 3 ตัวอักษร");
        RuleFor(x => x.TransactionDate).NotEmpty().WithMessage("ต้องระบุวันที่รายการ");
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.TagIds).Must(x => x is null || x.Count <= 20).WithMessage("แท็กต้องไม่เกิน 20 รายการ");
    }
}
