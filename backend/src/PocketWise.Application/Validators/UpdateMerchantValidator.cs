using FluentValidation;
using PocketWise.Application.DTOs.Merchants;

namespace PocketWise.Application.Validators;

public class UpdateMerchantValidator : AbstractValidator<UpdateMerchantRequest>
{
    public UpdateMerchantValidator()
    {
        RuleFor(x => x.MerchantName).NotEmpty().MaximumLength(200).WithMessage("ต้องระบุชื่อร้านค้า");
        RuleFor(x => x.BankOrProvider).MaximumLength(100);
    }
}
