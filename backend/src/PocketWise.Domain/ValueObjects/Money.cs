namespace PocketWise.Domain.ValueObjects;

public readonly record struct Money(decimal Amount, string CurrencyCode = "THB")
{
    public static Money Zero(string currencyCode = "THB") => new(0, currencyCode);

    public static Money ThaiBaht(decimal amount) => new(amount, "THB");

    public Money Add(Money other)
    {
        if (CurrencyCode != other.CurrencyCode)
            throw new InvalidOperationException("Cannot add money with different currencies.");

        return new Money(Amount + other.Amount, CurrencyCode);
    }

    public Money Subtract(Money other)
    {
        if (CurrencyCode != other.CurrencyCode)
            throw new InvalidOperationException("Cannot subtract money with different currencies.");

        return new Money(Amount - other.Amount, CurrencyCode);
    }
}
