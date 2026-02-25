namespace LoveSpaBackend.Services;

public interface IInquiryEmailService
{
    Task<InquiryEmailSendResult> SendAsync(string toName, string toEmail, string subject, string body);
}

public readonly record struct InquiryEmailSendResult(bool IsSuccess, string Message);
