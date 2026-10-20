namespace PocketWise.Infrastructure.Services.Email;

public class SmtpSettings
{
    public const string SectionName = "SmtpSettings";

    public bool Enabled { get; set; } = true;
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "noreply@pocketwise.local";
    public string FromDisplayName { get; set; } = "PocketWise";
}
