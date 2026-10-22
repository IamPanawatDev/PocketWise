using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PocketWise.Application.Interfaces;

namespace PocketWise.Infrastructure.Services.Email;

public class SmtpEmailService : IEmailService
{
    private static readonly HttpClient HttpClient = new();
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

        // 2. HTTP-based delivery via Resend REST API (bypasses Render/Cloud outbound SMTP port blocks)
        if (!string.IsNullOrWhiteSpace(_settings.ResendApiKey))
        {
            return await SendViaResendAsync(toEmail, subject, bodyHtml, cancellationToken);
        }

        // 3. If SMTP Host is not configured, operate in development simulation logging mode
        if (string.IsNullOrWhiteSpace(_settings.Host))
        {
            _logger.LogInformation(
                "[SmtpEmailService - Dev Mode] Simulated email sent to {ToEmail}. Subject: '{Subject}'. Length: {BodyLength} chars.",
                toEmail,
                subject,
                bodyHtml?.Length ?? 0);
            return true;
        }

        // 4. Real SMTP transmission with explicit UTF-8 encoding for Thai and international characters
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
                UseDefaultCredentials = false,
                Timeout = 15000 // 15s timeout
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
            _logger.LogError(ex, "[SmtpEmailService] Failed to send email to {ToEmail}. Subject: '{Subject}'. Note: Cloud platforms like Render Free Tier block outbound SMTP ports (25, 465, 587). Set SmtpSettings:ResendApiKey for HTTP delivery.", toEmail, subject);
            return false;
        }
    }

    private async Task<bool> SendViaResendAsync(
        string toEmail,
        string subject,
        string bodyHtml,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPublicOrLocalDomain = string.IsNullOrWhiteSpace(_settings.FromEmail)
                || _settings.FromEmail.Contains("@pocketwise.local")
                || _settings.FromEmail.EndsWith("@gmail.com", StringComparison.OrdinalIgnoreCase)
                || _settings.FromEmail.EndsWith("@yahoo.com", StringComparison.OrdinalIgnoreCase)
                || _settings.FromEmail.EndsWith("@hotmail.com", StringComparison.OrdinalIgnoreCase)
                || _settings.FromEmail.EndsWith("@outlook.com", StringComparison.OrdinalIgnoreCase);

            var fromAddress = isPublicOrLocalDomain
                ? "PocketWise <onboarding@resend.dev>"
                : $"{_settings.FromDisplayName} <{_settings.FromEmail}>";

            var payload = new
            {
                from = fromAddress,
                to = new[] { toEmail },
                subject = subject,
                html = bodyHtml
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ResendApiKey);
            request.Content = JsonContent.Create(payload);

            var response = await HttpClient.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[SmtpEmailService - Resend API] Email sent successfully to {ToEmail}. Subject: '{Subject}'.", toEmail, subject);
                return true;
            }

            var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("[SmtpEmailService - Resend API] Failed to send email to {ToEmail}. HTTP {StatusCode}: {ErrorBody}", toEmail, (int)response.StatusCode, errBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SmtpEmailService - Resend API] Exception when sending email to {ToEmail}.", toEmail);
            return false;
        }
    }
}
