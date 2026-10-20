using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PocketWise.Application.Interfaces;

namespace PocketWise.Infrastructure.Services.Email;

public class SmtpEmailService : IEmailService
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public bool IsEnabled => _settings.Enabled;

    public SmtpEmailService(
        IOptions<SmtpSettings> settings,
        ILogger<SmtpEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(
        string toEmail,
        string subject,
        string bodyHtml,
        CancellationToken cancellationToken = default)
    {
        // 1. If disabled globally via configuration, do nothing
        if (!_settings.Enabled)
        {
            _logger.LogInformation("[SmtpEmailService] Email delivery is disabled globally in configuration. Skipping.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogWarning("[SmtpEmailService] Recipient email is empty. Skipping email delivery.");
            return false;
        }

        // 2. If SMTP Host is not configured, operate in development simulation logging mode
        if (string.IsNullOrWhiteSpace(_settings.Host))
        {
            _logger.LogInformation(
                "[SmtpEmailService - Dev Mode] Simulated email sent to {ToEmail}. Subject: '{Subject}'. Length: {BodyLength} chars.",
                toEmail,
                subject,
                bodyHtml?.Length ?? 0);
            return true;
        }

        // 3. Real SMTP transmission with explicit UTF-8 encoding for Thai and international characters
        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(_settings.FromEmail, _settings.FromDisplayName, Encoding.UTF8),
                Subject = subject,
                SubjectEncoding = Encoding.UTF8,
                Body = bodyHtml,
                BodyEncoding = Encoding.UTF8,
                HeadersEncoding = Encoding.UTF8,
                IsBodyHtml = true
            };
            message.To.Add(toEmail);

            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                EnableSsl = _settings.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            if (!string.IsNullOrWhiteSpace(_settings.UserName))
            {
                client.Credentials = new NetworkCredential(_settings.UserName, _settings.Password);
            }

            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("[SmtpEmailService] Email sent successfully to {ToEmail}. Subject: '{Subject}'.", toEmail, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SmtpEmailService] Failed to send email to {ToEmail}. Subject: '{Subject}'.", toEmail, subject);
            return false;
        }
    }
}
