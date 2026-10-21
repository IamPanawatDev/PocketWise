namespace PocketWise.Application.Interfaces;

public interface IEmailService
{
    bool IsEnabled { get; }
    Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default);
}
