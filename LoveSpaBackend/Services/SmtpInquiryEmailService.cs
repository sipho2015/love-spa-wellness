using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace LoveSpaBackend.Services;

public class SmtpInquiryEmailService(IOptions<SmtpOptions> smtpOptions) : IInquiryEmailService
{
    private readonly SmtpOptions options = smtpOptions.Value;

    public async Task<InquiryEmailSendResult> SendAsync(string toName, string toEmail, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(options.Host) || string.IsNullOrWhiteSpace(options.FromEmail))
        {
            return new InquiryEmailSendResult(false, "SMTP is not configured. Update Smtp settings in backend configuration.");
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(options.FromEmail.Trim(), options.FromName.Trim()),
                Subject = subject.Trim(),
                Body = body.Trim(),
                IsBodyHtml = false
            };

            message.To.Add(new MailAddress(toEmail.Trim(), toName.Trim()));

            using var client = new SmtpClient(options.Host.Trim(), options.Port > 0 ? options.Port : 587)
            {
                EnableSsl = options.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            if (!string.IsNullOrWhiteSpace(options.Username))
            {
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(options.Username.Trim(), options.Password ?? string.Empty);
            }
            else
            {
                client.UseDefaultCredentials = true;
            }

            await client.SendMailAsync(message);
            return new InquiryEmailSendResult(true, "Reply email sent successfully.");
        }
        catch (Exception ex)
        {
            return new InquiryEmailSendResult(false, $"Unable to send email reply: {ex.Message}");
        }
    }
}
