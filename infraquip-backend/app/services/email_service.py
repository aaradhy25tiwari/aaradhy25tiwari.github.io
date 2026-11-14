"""
Email Service — Supports Resend API, Free SMTP Providers (Gmail, Brevo, Mailgun, SES), and Console fallback
"""
import contextvars
import logging
import re
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any
from urllib.parse import urlparse
from app.config import settings

logger = logging.getLogger(__name__)

# Request-local context variable tracking the provider that handled the dispatch
effective_provider_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "effective_provider_var", default=None
)


def _send_resend(to: str, subject: str, html: str) -> bool:
    """Send via Resend API (HTTPS port 443 — works seamlessly on Render/Cloud)."""
    if not settings.RESEND_API_KEY:
        return False
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        from_email = settings.RESEND_FROM_EMAIL or "noreply@infraquip.in"
        from_name = settings.RESEND_FROM_NAME or "InfraQuip"
        resp = resend.Emails.send({
            "from": f"{from_name} <{from_email}>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Email sent via Resend to {to} (Subject: {subject}, id: {getattr(resp, 'id', resp)})")
        return True
    except Exception as e:
        logger.error(f"Resend email send failed to {to}: {e}")
        return False


def _send_brevo(to: str, subject: str, html: str) -> bool:
    """Send via Brevo (Sendinblue) HTTPS API (port 443 — works seamlessly on Render/Cloud)."""
    brevo_key = getattr(settings, "BREVO_API_KEY", "")
    if not brevo_key:
        return False
    try:
        import httpx
        from_email = getattr(settings, "BREVO_FROM_EMAIL", "") or settings.SMTP_FROM_EMAIL or "noreply@infraquip.in"
        from_name = getattr(settings, "BREVO_FROM_NAME", "") or "InfraQuip"
        payload = {
            "sender": {"name": from_name, "email": from_email},
            "to": [{"email": to}],
            "subject": subject,
            "htmlContent": html,
        }
        headers = {
            "api-key": brevo_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        resp = httpx.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=10.0)
        if resp.status_code in (200, 201, 202):
            logger.info(f"Email sent via Brevo to {to} (Subject: {subject})")
            return True
        else:
            logger.error(f"Brevo API error ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Brevo email send failed to {to}: {e}")
        return False


def _send_smtp(to: str, subject: str, html: str) -> bool:
    """Send via standard SMTP (Gmail App Password, Brevo, Mailgun, Amazon SES, etc.)."""
    try:
        from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@infraquip.in"
        from_name = settings.SMTP_FROM_NAME or "InfraQuip"
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to
        
        msg.attach(MIMEText(html, "html"))
        
        ssl_context = ssl.create_default_context()
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10, context=ssl_context)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_USE_TLS:
                server.starttls(context=ssl_context)
                
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
        server.sendmail(from_email, [to], msg.as_string())
        server.quit()
        logger.info(f"Email sent via SMTP to {to} (Subject: {subject})")
        return True
    except (ConnectionRefusedError, TimeoutError, OSError) as e:
        logger.error(
            f"SMTP email connection failed to {to} ({settings.SMTP_HOST}:{settings.SMTP_PORT}): {e}. "
            "Note: Cloud hosting platforms (like Render free/starter tiers) block outbound SMTP ports 25, 465, and 587. "
            "Use an HTTPS API provider like Resend (RESEND_API_KEY) or Brevo (BREVO_API_KEY) for cloud deployments."
        )
        return False
    except Exception as e:
        logger.error(f"SMTP email send failed to {to}: {e}")
        return False


def _send(to: str, subject: str, html: str, provider: str | None = None) -> bool:
    """Dispatches email based on configured provider (Resend, Brevo, SMTP, or console/mock)."""
    active_provider = (provider or settings.EMAIL_PROVIDER).lower()
    
    if active_provider == "console":
        effective_provider_var.set("console")
        logger.info(f"[EMAIL CONSOLE] To: {to} | Subject: {subject}")
        return True

    # 1. Resend API (HTTPS port 443 — recommended for Render/Cloud)
    if active_provider in ("resend", "auto") and settings.RESEND_API_KEY:
        if _send_resend(to, subject, html):
            effective_provider_var.set("resend")
            return True

    # 2. Brevo API (HTTPS port 443 — works seamlessly on Render/Cloud)
    if active_provider in ("brevo", "auto") and getattr(settings, "BREVO_API_KEY", ""):
        if _send_brevo(to, subject, html):
            effective_provider_var.set("brevo")
            return True

    # 3. SMTP (Works on local dev, but blocked on Render free tier ports 25/465/587)
    if active_provider in ("smtp", "auto") and settings.SMTP_HOST and settings.SMTP_USER:
        if _send_smtp(to, subject, html):
            effective_provider_var.set("smtp")
            return True

    # 4. Fallback to local console log
    effective_provider_var.set(None)
    logger.warning(
        f"[EMAIL MOCK - NO EMAIL SENT] To: {to} | Subject: {subject} | "
        f"Provider: {active_provider} | Resend configured: {bool(settings.RESEND_API_KEY)} | "
        f"Brevo configured: {bool(getattr(settings, 'BREVO_API_KEY', ''))} | "
        f"SMTP configured: {bool(settings.SMTP_HOST and settings.SMTP_USER)}"
    )
    return False


EMAIL_FOOTER = """
<div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; line-height: 1.5; text-align: center;">
  <p style="margin: 0 0 4px; font-weight: 600; color: #6b7280;">InfraQuip Technologies India Private Limited</p>
  <p style="margin: 0 0 8px;">Construction Equipment Rental & Sales Platform</p>
  <p style="margin: 0;">
    You received this email because of activity associated with your InfraQuip account.
  </p>
</div>
"""


def _is_valid_http_url(val: str) -> bool:
    try:
        p = urlparse(val)
        return p.scheme in ("http", "https") and bool(p.netloc or p.hostname)
    except Exception:
        return False


def _get_base_url() -> str:
    effective = getattr(settings, "effective_frontend_url", "").strip().rstrip("/")
    if _is_valid_http_url(effective):
        return effective
    configured = getattr(settings, "FRONTEND_URL", "").strip().rstrip("/")
    if _is_valid_http_url(configured):
        return configured
    for origin in settings.allowed_origins_list:
        trimmed = origin.strip().rstrip("/")
        if _is_valid_http_url(trimmed) and trimmed.startswith("https://"):
            return trimmed
    for origin in settings.allowed_origins_list:
        trimmed = origin.strip().rstrip("/")
        if _is_valid_http_url(trimmed) and trimmed.startswith("http://"):
            return trimmed
    raise ValueError(
        "Cannot construct actionable email link: no valid absolute frontend origin configured. "
        "Please configure FRONTEND_URL or a valid origin in ALLOWED_ORIGINS."
    )


def send_welcome_email(email: str, full_name: str, role: str) -> None:
    role_label = {"vendor": "Vendor", "broker": "Broker"}.get(role, "Customer")
    base_url = _get_base_url()
    target_url = f"{base_url}/dashboard/{role}" if role in ["vendor", "broker"] else f"{base_url}/machines"
    
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Heavy Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Welcome to InfraQuip, {full_name}! 🎉</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Your <strong>{role_label}</strong> account has been registered. You can now access your dashboard and explore verified equipment.
      </p>
      <div style="margin: 28px 0; padding: 20px; background: #fef3c7; border-radius: 12px; border: 1px solid #fde68a;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
          ⚡ <strong>Pro Tip:</strong> {"Add your heavy machines with clear photos and transparent pricing to get high-intent inquiries fast." if role == "vendor" else "Browse machines near your job site and submit direct enquiries."}
        </p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{target_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          {"Go to Vendor Dashboard" if role == "vendor" else "Browse Equipment"}
        </a>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, f"Welcome to InfraQuip, {full_name}!", html)


def send_password_reset_otp_email(email: str, otp: str, full_name: str | None = None) -> None:
    greeting = f"Hi {full_name}," if full_name else "Hello,"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Your Password Reset OTP</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        {greeting} we received a request to reset the password for your InfraQuip account. Use the one-time verification code below:
      </p>
      <div style="margin: 28px 0; padding: 24px; background: #111827; border-radius: 14px; text-align: center;">
        <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Verification OTP Code</p>
        <p style="margin: 0; color: #f59e0b; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; font-family: monospace;">{otp}</p>
      </div>
      <div style="margin: 20px 0; padding: 14px 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          ⏱️ This OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        If you did not request this verification code, please ignore this email. Your account remains secure.
      </p>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, f"Your InfraQuip Password Reset Code: {otp}", html)


def send_password_reset_email(email: str, reset_url: str) -> None:
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Reset Your Password</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        We received a request to reset the password for your InfraQuip account. Click the button below to set a new password:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{reset_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Reset Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, "Reset your InfraQuip password", html)


def send_account_request_received_email(email: str, full_name: str) -> None:
    """Confirmation email sent immediately after user submits access request."""
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">We've received your request, {full_name}!</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Thank you for your interest in joining InfraQuip. Our admin team will review your business details and send your account credentials within <strong>24 hours</strong>.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #fef3c7; border-radius: 12px; border: 1px solid #fde68a;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
          ⏳ <strong>What happens next?</strong><br/>
          Once approved, you will receive an email containing your temporary login credentials. You will be prompted to set your personal password upon your first login.
        </p>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, "We received your InfraQuip access request", html)


def send_account_approved_email(
    email: str, full_name: str, role: str, temp_password: str
) -> None:
    """Sent when admin approves a request — includes temporary credentials."""
    role_label = {"vendor": "Vendor", "broker": "Broker"}.get(role, "Customer")
    base_url = _get_base_url()
    login_url = f"{base_url}/login"
    
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">🎉 Your {role_label} Account is Approved!</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {full_name}, your InfraQuip account request has been verified and approved. Here are your temporary login details:
      </p>
      <div style="margin: 24px 0; padding: 24px; background: #111827; border-radius: 12px; font-family: monospace;">
        <p style="margin: 0 0 6px; color: #9ca3af; font-size: 12px; text-transform: uppercase;">Login Email</p>
        <p style="margin: 0 0 16px; color: #f9fafb; font-size: 16px; font-weight: 600;">{email}</p>
        <p style="margin: 0 0 6px; color: #9ca3af; font-size: 12px; text-transform: uppercase;">Temporary Password</p>
        <p style="margin: 0; color: #f59e0b; font-size: 20px; font-weight: 700; letter-spacing: 0.08em;">{temp_password}</p>
      </div>
      <div style="margin: 20px 0; padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
        <p style="margin: 0 0 4px; color: #991b1b; font-size: 14px; font-weight: 700;">
          ⏱️ Valid for 24 hours only
        </p>
        <p style="margin: 0; color: #7f1d1d; font-size: 13px; line-height: 1.5;">
          This temporary password will expire in 24 hours. Please log in immediately and set your personal password.
        </p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{login_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Log In to InfraQuip →
        </a>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, "Your InfraQuip account is ready — temporary credentials inside", html)


def send_account_rejected_email(email: str, full_name: str, reason: str) -> None:
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Update on Your Account Request</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {full_name}, thank you for your interest in InfraQuip. We were unable to approve your account application at this time.
      </p>
      <div style="margin: 20px 0; padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Reason:</strong> {reason}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
        If you have additional documentation or questions, please feel free to reach out to our team at support@infraquip.com.
      </p>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, "Update on your InfraQuip account request", html)


def send_listing_created_email(email: str, vendor_name: str, machine_title: str, dashboard_url: str) -> None:
    """Sent to vendor when a listing is submitted for admin review."""
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Listing Submitted for Review 🚜</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {vendor_name}, your machine listing <strong>"{machine_title}"</strong> has been successfully submitted and is under review by our quality team.
      </p>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Listings are typically verified within <strong>24 hours</strong>. You'll receive another notification as soon as it goes live.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{dashboard_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          View in Dashboard
        </a>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, f"Listing Submitted: {machine_title}", html)


def send_listing_approved_email(
    email: str, vendor_name: str, machine_title: str, listing_url: str = ""
) -> None:
    if not listing_url:
        listing_url = f"{_get_base_url()}/machines"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">✅ Your Listing is Live!</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {vendor_name}, your equipment listing <strong>"{machine_title}"</strong> has been approved and is now live on the marketplace.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{listing_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          View Public Listing
        </a>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, f"Listing Approved: {machine_title}", html)


def send_listing_rejected_email(
    email: str, vendor_name: str, machine_title: str, reason: str
) -> None:
    base_url = _get_base_url()
    dashboard_url = f"{base_url}/dashboard/vendor/listings"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Action Required on Your Listing</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {vendor_name}, your listing <strong>"{machine_title}"</strong> requires updates before it can be published:
      </p>
      <div style="margin: 20px 0; padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Reason:</strong> {reason}</p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{dashboard_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Edit Listing in Dashboard
        </a>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, f"Action Required: {machine_title}", html)


def send_enquiry_received_email(
    vendor_email: str, vendor_name: str,
    customer_name: str, machine_title: str,
    dashboard_url: str,
) -> None:
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">📬 New Customer Enquiry Received!</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {vendor_name}, <strong>{customer_name}</strong> just submitted an enquiry for <strong>"{machine_title}"</strong>.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{dashboard_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          View & Reply to Enquiry
        </a>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(vendor_email, f"New Enquiry: {machine_title}", html)


def send_payment_receipt_email(
    email: str, name: str, plan_name: str, amount: float, period_end: str
) -> None:
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Payment Receipt 🎉</h2>
      <p style="color: #4b5563; font-size: 15px;">Hi {name}, your subscription payment has been confirmed.</p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Plan</td><td style="text-align: right; font-weight: 600;">{plan_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Amount Paid</td><td style="text-align: right; font-weight: 600;">₹{amount:,.0f}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Next Billing Date</td><td style="text-align: right; font-weight: 600;">{period_end}</td></tr>
        </table>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, f"Receipt: InfraQuip {plan_name}", html)


def send_account_reactivation_otp_email(
    email: str, otp: str, full_name: str | None = None
) -> None:
    """Sent when a blocked user requests an OTP to verify identity for account reactivation."""
    greeting = f"Hi {full_name}," if full_name else "Hello,"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Account Reactivation Verification Code</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        {greeting} we received a request to reactivate your blocked InfraQuip account. To confirm your identity and send your request to our administrators, use the one-time verification code below:
      </p>
      <div style="margin: 28px 0; padding: 24px; background: #111827; border-radius: 14px; text-align: center;">
        <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Reactivation Code</p>
        <p style="margin: 0; color: #f59e0b; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; font-family: monospace;">{otp}</p>
      </div>
      <div style="margin: 20px 0; padding: 14px 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          ⏱️ This OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        If you did not initiate this request, someone may have entered your email address. You can safely ignore this email.
      </p>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, f"Your InfraQuip Reactivation Code: {otp}", html)


def send_account_reactivated_email(
    email: str, full_name: str, temp_password: str
) -> None:
    """Sent when admin approves reactivation and issues new temporary credentials."""
    base_url = _get_base_url()
    login_url = f"{base_url}/login"
    
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">🔓 Your Account Has Been Reactivated!</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {full_name}, your account reactivation request has been approved by the admin. Your failed login attempts counter has been reset, and a new temporary password has been generated for you:
      </p>
      <div style="margin: 24px 0; padding: 24px; background: #111827; border-radius: 12px; font-family: monospace;">
        <p style="margin: 0 0 6px; color: #9ca3af; font-size: 12px; text-transform: uppercase;">Login Email</p>
        <p style="margin: 0 0 16px; color: #f9fafb; font-size: 16px; font-weight: 600;">{email}</p>
        <p style="margin: 0 0 6px; color: #9ca3af; font-size: 12px; text-transform: uppercase;">New Temporary Password</p>
        <p style="margin: 0; color: #f59e0b; font-size: 20px; font-weight: 700; letter-spacing: 0.08em;">{temp_password}</p>
      </div>
      <div style="margin: 20px 0; padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
        <p style="margin: 0 0 4px; color: #991b1b; font-size: 14px; font-weight: 700;">
          ⏱️ Valid for 24 hours only
        </p>
        <p style="margin: 0; color: #7f1d1d; font-size: 13px; line-height: 1.5;">
          This temporary password will expire in 24 hours. Please log in promptly and set your new permanent password.
        </p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{login_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Log In to InfraQuip →
        </a>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, "Your InfraQuip account is reactivated — new temporary password inside", html)



def _extract_provider_from_dispatch(dispatch_result: Any) -> str | None:
    """Extracts the provider strictly from an explicit provider value or dispatch metadata, never from recipient text."""
    if not dispatch_result:
        return None
    if isinstance(dispatch_result, (list, tuple)):
        for item in dispatch_result:
            extracted = _extract_provider_from_dispatch(item)
            if extracted:
                return extracted
        return None
    if isinstance(dispatch_result, dict):
        prov = dispatch_result.get("provider")
        if isinstance(prov, str) and prov.strip():
            return prov.strip().lower()
    if hasattr(dispatch_result, "provider"):
        prov = getattr(dispatch_result, "provider")
        if isinstance(prov, str) and prov.strip():
            return prov.strip().lower()
    if isinstance(dispatch_result, str):
        val = dispatch_result.strip().lower()
        if val in ("resend", "brevo", "smtp", "console"):
            return val
        match = re.search(r"\bvia\s+(resend|brevo|smtp|console)\b", val)
        if match:
            return match.group(1)
        if "logged to console" in val:
            return "console"
    return None


def get_from_email_for_provider(provider: str | None = None, dispatch_result: Any = None) -> str:
    """Returns the sender email address configured for the selected provider."""
    explicit_provider = (provider or "").strip().lower()
    if explicit_provider and explicit_provider != "auto":
        chosen = explicit_provider
    else:
        # Determine provider strictly from dispatch metadata or request-local state, never recipient text
        extracted = _extract_provider_from_dispatch(dispatch_result) or effective_provider_var.get()
        if extracted and extracted != "auto":
            chosen = extracted
        else:
            chosen = (provider or settings.EMAIL_PROVIDER).lower()

    if chosen == "resend":
        return settings.RESEND_FROM_EMAIL or "noreply@infraquip.in"
    if chosen == "brevo":
        return getattr(settings, "BREVO_FROM_EMAIL", "") or settings.SMTP_FROM_EMAIL or "noreply@infraquip.in"
    if chosen == "smtp":
        return settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@infraquip.in"
    if chosen == "auto":
        if settings.RESEND_API_KEY:
            return settings.RESEND_FROM_EMAIL or "noreply@infraquip.in"
        if getattr(settings, "BREVO_API_KEY", ""):
            return getattr(settings, "BREVO_FROM_EMAIL", "") or settings.SMTP_FROM_EMAIL or "noreply@infraquip.in"
        if settings.SMTP_HOST and settings.SMTP_USER:
            return settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@infraquip.in"
    return "noreply@infraquip.in"


def send_test_email(to: str, provider: str | None = None) -> tuple[bool, str]:
    """Diagnostic function to test email delivery and return descriptive status."""
    effective_provider_var.set(None)
    chosen_provider = (provider or settings.EMAIL_PROVIDER).lower()
    subject = "InfraQuip Email Service Diagnostic Test"
    base_url = _get_base_url()
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; color: #1f2937;">
      <h2 style="color: #f59e0b; margin-top: 0;">InfraQuip Diagnostic Test Email</h2>
      <p>This is a live test email sent from InfraQuip to verify delivery.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px;">
        <p style="margin: 0 0 6px;"><strong>Recipient:</strong> {to}</p>
        <p style="margin: 0 0 6px;"><strong>Tested Provider:</strong> {chosen_provider}</p>
        <p style="margin: 0;"><strong>Base URL:</strong> {base_url}</p>
      </div>
      {EMAIL_FOOTER}
    </div>
    """

    if chosen_provider == "console":
        _send(to, subject, html, provider="console")
        effective_provider_var.set("console")
        return True, f"Email logged to console for {to}"

    if chosen_provider == "resend":
        if not settings.RESEND_API_KEY:
            return False, "RESEND_API_KEY is not configured."
        ok = _send_resend(to, subject, html)
        if ok:
            effective_provider_var.set("resend")
            return True, f"Email sent successfully via Resend to {to}"
        return False, "Resend send failed. Check server logs for details."

    if chosen_provider == "brevo":
        if not getattr(settings, "BREVO_API_KEY", ""):
            return False, "BREVO_API_KEY is not configured."
        ok = _send_brevo(to, subject, html)
        if ok:
            effective_provider_var.set("brevo")
            return True, f"Email sent successfully via Brevo to {to}"
        return False, "Brevo send failed. Check server logs for details."

    if chosen_provider == "smtp":
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            return False, "SMTP_HOST or SMTP_USER is not configured."
        ok = _send_smtp(to, subject, html)
        if ok:
            effective_provider_var.set("smtp")
            return True, f"Email sent successfully via SMTP to {to}"
        return False, "SMTP send failed. Note: Render free tier blocks outbound SMTP ports 25, 465, 587. Use Resend or Brevo."

    # Auto dispatch or fallback using chosen_provider
    ok = _send(to, subject, html, provider=chosen_provider)
    if ok:
        provider_name = effective_provider_var.get() or chosen_provider
        return True, f"Email sent successfully via {provider_name.capitalize()} to {to}"
    return False, "Email dispatch failed. Neither Resend, Brevo, nor SMTP succeeded. Ensure API credentials are set on Render."


def send_account_already_exists_email(email: str, full_name: str) -> None:
    """Sent when an applicant requests an account using an email already registered in InfraQuip."""
    base_url = _get_base_url()
    login_url = f"{base_url}/login"
    forgot_url = f"{base_url}/forgot-password"

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Account Already Registered</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {full_name}, we received a request to create an account for <strong>{email}</strong>, but an account with this email address is already active on InfraQuip.
      </p>
      <div style="margin: 28px 0; padding: 20px; background: #fef3c7; border-radius: 12px; border: 1px solid #fde68a;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
          🔑 If you already have an account, you can log in directly or reset your password if you forgot your credentials.
        </p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{login_url}"
           style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin-right: 12px;">
          Log In
        </a>
        <a href="{forgot_url}"
           style="display: inline-block; background: #111827; color: #f9fafb; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Reset Password
        </a>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, "Your InfraQuip account already exists", html)


def send_account_request_pending_reminder_email(email: str, full_name: str) -> None:
    """Sent when an applicant resubmits while their previous account request is still pending review."""
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827; font-size: 20px; font-weight: 700;">Your Request is Already Under Review</h2>
      <p style="color: #4b5563; line-height: 1.6; font-size: 15px;">
        Hi {full_name}, we already have an active access request on file for <strong>{email}</strong>.
      </p>
      <div style="margin: 28px 0; padding: 20px; background: #fef3c7; border-radius: 12px; border: 1px solid #fde68a;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
          ⏳ Our admin team reviews all business submissions within 24 hours. Once verified, you will receive an approval email with your login credentials.
        </p>
      </div>
      {EMAIL_FOOTER}
    </div>
    """
    _send(email, "Your InfraQuip access request is pending review", html)
