using FluentValidation;
using PocketWise.Application.DTOs.CreditCards;

namespace PocketWise.Application.Validators;

public class CreateCreditCardValidator : AbstractValidator<CreateCreditCardRequest>
{
    public CreateCreditCardValidator()
    {
        RuleFor(x => x.BankName).NotEmpty().MaximumLength(100).WithMessage("ต้องระบุชื่อธนาคาร");
        RuleFor(x => x.CardName).NotEmpty().MaximumLength(100).WithMessage("ต้องระบุชื่อบัตร");
        RuleFor(x => x.CardNumberMasked)
            .MaximumLength(30)
            .Matches(@"^([*•]{4}[\s-]?)?([*•]{4}[\s-]?)?([*•]{4}[\s-]?)?\d{4}$|^\d{4}$|^[•*]{4,16}\d{4}$")
            .When(x => !string.IsNullOrWhiteSpace(x.CardNumberMasked))
            .WithMessage("รูปแบบเลขบัตรไม่ถูกต้อง (เช่น **** **** **** 1234 หรือ 1234)");
        RuleFor(x => x.BillingDay).InclusiveBetween((byte)1, (byte)31).When(x => x.BillingDay.HasValue).WithMessage("วันสรุปยอดต้องอยู่ระหว่าง 1 ถึง 31");
        RuleFor(x => x.PaymentDueDay).InclusiveBetween((byte)1, (byte)31).When(x => x.PaymentDueDay.HasValue).WithMessage("วันครบกำหนดชำระต้องอยู่ระหว่าง 1 ถึง 31");
        RuleFor(x => x.CreditLimit).GreaterThanOrEqualTo(0).When(x => x.CreditLimit.HasValue).WithMessage("วงเงินบัตรต้องไม่ติดลบ");
    }
}
