"""
Email Service — Supports Resend API, Free SMTP Providers (Gmail, Brevo, Mailgun, SES), and Console fallback
"""
import html as html_lib
import logging
import os
import re
import smtplib
import socket
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from app.config import settings

logger = logging.getLogger(__name__)


def _html_to_text(raw_html: str) -> str:
    """Convert HTML email body to a clean plain-text fallback for deliverability."""
    cleaned = re.sub(r"(?is)<(script|style).*?>.*?</\1>", "", raw_html)
    cleaned = re.sub(r"(?i)<br\s*/?>", "\n", cleaned)
    cleaned = re.sub(r"(?i)</(p|div|h[1-6]|tr|li)>", "\n", cleaned)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    text = html_lib.unescape(cleaned)
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def _send_resend(to: str, subject: str, html: str) -> bool:
    """Send via Resend API."""
    api_key = (settings.RESEND_API_KEY or "").strip()
    if not api_key:
        return False
    try:
        import resend
        resend.api_key = api_key
        from_email = (settings.RESEND_FROM_EMAIL or "noreply@infraquip.com").strip()
        from_name = (settings.RESEND_FROM_NAME or "InfraQuip").strip()
        resend.Emails.send({
            "from": f"{from_name} <{from_email}>",
            "to": [to],
            "subject": subject,
            "html": html,
            "text": _html_to_text(html),
        })
        logger.info(f"Email sent via Resend to {to} (Subject: {subject})")
        return True
    except Exception as e:
        logger.error(f"Resend email send failed to {to}: {e}", exc_info=True)
        return False


def _build_smtp_message(to: str, subject: str, html: str, from_name: str, from_email: str) -> MIMEMultipart:
    """Build a standards-compliant multipart/alternative MIME message."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = str(Header(subject, "utf-8"))
    msg["From"] = formataddr((from_name, from_email))
    msg["To"] = to
    msg["Reply-To"] = from_email
    msg["Date"] = formatdate(localtime=True)
    domain = from_email.split("@")[-1] if "@" in from_email else None
    msg["Message-ID"] = make_msgid(domain=domain)

    msg.attach(MIMEText(_html_to_text(html), "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def _deliver_via_smtp_port(
    host: str,
    port: int,
    use_tls: bool,
    user: str,
    password: str,
    from_email: str,
    to: str,
    raw_message: str,
) -> None:
    """Connect, authenticate, and send a serialized email over SMTP."""
    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        if use_tls:
            server.starttls()

    try:
        if user and password:
            server.login(user, password)
        server.sendmail(from_email, [to], raw_message)
    finally:
        try:
            server.quit()
        except Exception:
            pass


def _send_smtp(to: str, subject: str, html: str) -> bool:
    """Send via standard SMTP (Gmail App Password, Brevo, Mailgun, Amazon SES, etc.)."""
    host = (settings.SMTP_HOST or "").strip()
    if not host:
        return False

    from_email = (settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@infraquip.com").strip()
    from_name = (settings.SMTP_FROM_NAME or "InfraQuip").strip()
    smtp_user = (settings.SMTP_USER or "").strip()
    smtp_password = (settings.SMTP_PASSWORD or "").strip()

    msg = _build_smtp_message(to, subject, html, from_name, from_email)
    raw_message = msg.as_string()

    try:
        _deliver_via_smtp_port(
            host=host,
            port=settings.SMTP_PORT,
            use_tls=settings.SMTP_USE_TLS,
            user=smtp_user,
            password=smtp_password,
            from_email=from_email,
            to=to,
            raw_message=raw_message,
        )
        logger.info(f"Email sent via SMTP ({host}:{settings.SMTP_PORT}) to {to} (Subject: {subject})")
        return True
    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(f"SMTP authentication failed for {to}: {auth_err}", exc_info=True)
        return False
    except (OSError, TimeoutError) as conn_err:
        if settings.SMTP_PORT != 465 and not isinstance(conn_err, socket.gaierror):
            logger.warning(
                f"SMTP connection failed on {host}:{settings.SMTP_PORT} ({conn_err}); retrying SSL on port 465."
            )
            try:
                _deliver_via_smtp_port(
                    host=host,
                    port=465,
                    use_tls=False,
                    user=smtp_user,
                    password=smtp_password,
                    from_email=from_email,
                    to=to,
                    raw_message=raw_message,
                )
                logger.info(f"Email sent via SMTP ({host}:465) to {to} (Subject: {subject})")
                return True
            except Exception as retry_err:
                logger.error(f"SMTP SSL fallback send failed to {to}: {retry_err}", exc_info=True)
                return False
        logger.error(f"SMTP email send failed to {to}: {conn_err}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"SMTP email send failed to {to}: {e}", exc_info=True)
        return False


def _send(to: str, subject: str, html: str) -> bool:
    """Dispatches email based on configured provider (Resend, SMTP, or mock logger)."""
    provider = (settings.EMAIL_PROVIDER or "auto").strip().lower()
    has_resend = bool((settings.RESEND_API_KEY or "").strip())
    has_smtp = bool((settings.SMTP_HOST or "").strip() and (settings.SMTP_USER or "").strip())

    if provider == "console":
        logger.info(f"[EMAIL MOCK - CONSOLE MODE] To: {to} | Subject: {subject}")
        return False

    senders = [_send_smtp, _send_resend] if provider == "smtp" else [_send_resend, _send_smtp]
    for sender in senders:
        if sender(to, subject, html):
            return True

    if not has_resend and not has_smtp:
        logger.warning(f"[EMAIL SKIPPED - NO SMTP/RESEND CONFIGURED] To: {to} | Subject: {subject}")
    else:
        if os.getenv("RENDER") and not has_resend:
            logger.error(
                "[EMAIL DELIVERY FAILED ON RENDER] Outbound SMTP ports are blocked on Render free instances; "
                "configure RESEND_API_KEY and EMAIL_PROVIDER=auto for production email delivery."
            )
        logger.error(f"[EMAIL DELIVERY FAILED] All configured email providers failed for {to} | Subject: {subject}")
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


def _get_base_url() -> str:
    if settings.FRONTEND_URL and settings.FRONTEND_URL.strip():
        return settings.FRONTEND_URL.strip().rstrip("/")
    origins = [o.strip().rstrip("/") for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
    if settings.APP_ENV.lower() in ("production", "prod") or os.getenv("RENDER"):
        prod_origin = next(
            (o for o in origins if "localhost" not in o and "127.0.0.1" not in o and "192.168." not in o),
            None,
        )
        if prod_origin:
            return prod_origin
    return origins[0] if origins else "http://localhost:3000"


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


def send_account_request_received_email(email: str, full_name: str) -> bool:
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
    return _send(email, "We received your InfraQuip access request", html)


def send_account_approved_email(
    email: str, full_name: str, role: str, temp_password: str
) -> bool:
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
    return _send(email, "Your InfraQuip account is ready — temporary credentials inside", html)


def send_account_rejected_email(email: str, full_name: str, reason: str) -> bool:
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
    return _send(email, "Update on your InfraQuip account request", html)


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

