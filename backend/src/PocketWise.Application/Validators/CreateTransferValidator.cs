using FluentValidation;
using PocketWise.Application.DTOs.Transfers;

namespace PocketWise.Application.Validators;

public class CreateTransferValidator : AbstractValidator<CreateTransferRequest>
{
    public CreateTransferValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("จำนวนเงินต้องมากกว่า 0");
        RuleFor(x => x.TransferDate).NotEmpty().WithMessage("ต้องระบุวันที่โอน");
        RuleFor(x => x.FromBankAccountId).GreaterThan(0);
        RuleFor(x => x.ToBankAccountId).GreaterThan(0).NotEqual(x => x.FromBankAccountId).WithMessage("บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน");
        RuleFor(x => x.Reference).MaximumLength(150);
    }
}
