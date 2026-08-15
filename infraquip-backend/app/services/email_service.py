"""
Email Service — Resend integration for transactional emails
"""
import resend
from app.config import settings

resend.api_key = settings.RESEND_API_KEY

FROM = f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>"


def _send(to: str, subject: str, html: str) -> None:
    """Fire-and-forget email send. Errors are logged but not raised."""
    try:
        resend.Emails.send({
            "from": FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Email send failed to {to}: {e}")


def send_welcome_email(email: str, full_name: str, role: str) -> None:
    role_label = {"vendor": "Vendor", "broker": "Broker"}.get(role, "Customer")
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827;">Welcome, {full_name}! 🎉</h2>
      <p style="color: #374151; line-height: 1.6;">
        Your {role_label} account has been created. Please verify your email address
        to activate your account and start {"listing your equipment" if role == "vendor" else "finding equipment"}.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Check your inbox for a verification email from Supabase Auth — click the link
        to confirm your account.
      </p>
      <div style="margin: 32px 0; padding: 20px; background: #fef3c7; border-radius: 12px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          ⚡ <strong>Quick tip:</strong> {"Add your first machine listing in under 5 minutes." if role == "vendor" else "Search for equipment near you and send your first enquiry free."}
        </p>
      </div>
      <a href="{settings.ALLOWED_ORIGINS.split(",")[0]}/{"dashboard/vendor" if role == "vendor" else "machines"}"
         style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        {"Go to Dashboard" if role == "vendor" else "Browse Equipment"}
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">
        InfraQuip · support@infraquip.com · Unsubscribe
      </p>
    </div>
    """
    _send(email, f"Welcome to InfraQuip, {full_name}!", html)


def send_listing_approved_email(email: str, vendor_name: str, machine_title: str, listing_url: str) -> None:
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #f59e0b;">InfraQuip</h1>
      <h2 style="color: #111827;">✅ Your listing is now live!</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi {vendor_name}, your machine listing <strong>"{machine_title}"</strong> has been
        approved and is now visible to all customers on InfraQuip.
      </p>
      <a href="{listing_url}"
         style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View Your Listing
      </a>
    </div>
    """
    _send(email, f"Listing Approved: {machine_title}", html)


def send_listing_rejected_email(
    email: str, vendor_name: str, machine_title: str, reason: str
) -> None:
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #f59e0b;">InfraQuip</h1>
      <h2 style="color: #111827;">Listing Needs Changes</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi {vendor_name}, your listing <strong>"{machine_title}"</strong> requires changes
        before it can be approved.
      </p>
      <div style="padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> {reason}</p>
      </div>
      <p style="color: #374151;">Please update your listing and resubmit. Our team will review it again within 24 hours.</p>
    </div>
    """
    _send(email, f"Action Required: {machine_title}", html)


def send_enquiry_received_email(
    vendor_email: str, vendor_name: str,
    customer_name: str, machine_title: str,
    dashboard_url: str,
) -> None:
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #f59e0b;">InfraQuip</h1>
      <h2 style="color: #111827;">📬 New Enquiry Received!</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi {vendor_name}, <strong>{customer_name}</strong> has sent you an enquiry about
        your listing <strong>"{machine_title}"</strong>.
      </p>
      <p style="color: #374151;">Respond quickly — vendors with fast response rates get more bookings!</p>
      <a href="{dashboard_url}"
         style="display: inline-block; background: #f59e0b; color: #111827; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View & Reply to Enquiry
      </a>
    </div>
    """
    _send(vendor_email, f"New Enquiry: {machine_title}", html)


def send_payment_receipt_email(
    email: str, name: str, plan_name: str, amount: float, period_end: str
) -> None:
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #f59e0b;">InfraQuip</h1>
      <h2 style="color: #111827;">Payment Receipt 🎉</h2>
      <p style="color: #374151;">Hi {name}, your payment has been confirmed.</p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Plan</td><td style="text-align: right; font-weight: 600;">{plan_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Amount</td><td style="text-align: right; font-weight: 600;">₹{amount:,.0f}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Next billing</td><td style="text-align: right; font-weight: 600;">{period_end}</td></tr>
        </table>
      </div>
    </div>
    """
    _send(email, f"Receipt: InfraQuip {plan_name}", html)


def send_account_request_received_email(email: str, full_name: str) -> None:
    """Confirmation email sent to user immediately after submitting a request."""
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827;">Request Received, {full_name}!</h2>
      <p style="color: #374151; line-height: 1.6;">
        Thank you for requesting access to InfraQuip. Our team will review your
        application and send you your account credentials within <strong>24 hours</strong>.
      </p>
      <div style="margin: 24px 0; padding: 20px; background: #fef3c7; border-radius: 12px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          ⏳ <strong>What happens next?</strong><br/>
          Once approved, you'll receive a separate email with your temporary login
          credentials. Use them to log in — you'll be asked to set a new password
          immediately.
        </p>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">
        InfraQuip · support@infraquip.in
      </p>
    </div>
    """
    _send(email, "We received your InfraQuip access request", html)


def send_account_approved_email(
    email: str, full_name: str, role: str, temp_password: str
) -> None:
    """Sent when admin approves a request — includes temporary credentials."""
    role_label = {"vendor": "Vendor", "broker": "Broker"}.get(role, "Customer")
    dashboard_path = {"vendor": "dashboard/vendor", "broker": "dashboard/broker"}.get(role, "dashboard/customer")
    login_url = f"{settings.ALLOWED_ORIGINS.split(',')[0]}/login"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827;">🎉 Your {role_label} Account is Approved!</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi {full_name}, your InfraQuip account request has been approved.
        Here are your temporary login credentials:
      </p>
      <div style="margin: 24px 0; padding: 24px; background: #1f2937; border-radius: 12px; font-family: monospace;">
        <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Login Email</p>
        <p style="margin: 0 0 20px; color: #f9fafb; font-size: 16px; font-weight: 600;">{email}</p>
        <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Temporary Password</p>
        <p style="margin: 0; color: #f59e0b; font-size: 20px; font-weight: 700; letter-spacing: 0.1em;">{temp_password}</p>
      </div>
      <div style="margin: 24px 0; padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
          ⚠️ <strong>You must change this password after your first login.</strong>
          Do not share these credentials with anyone.
        </p>
      </div>
      <a href="{login_url}"
         style="display: inline-block; background: #f59e0b; color: #111827; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
        Log In to InfraQuip →
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">
        InfraQuip · support@infraquip.in
      </p>
    </div>
    """
    _send(email, "Your InfraQuip account is ready — temporary credentials inside", html)


def send_account_rejected_email(
    email: str, full_name: str, reason: str
) -> None:
    """Sent when admin rejects a request."""
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">InfraQuip</h1>
        <p style="color: #6b7280; margin: 4px 0 0;">Construction Equipment Marketplace</p>
      </div>
      <h2 style="color: #111827;">Update on Your Account Request</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi {full_name}, thank you for your interest in InfraQuip.
        Unfortunately, we were unable to approve your account request at this time.
      </p>
      <div style="margin: 24px 0; padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> {reason}</p>
      </div>
      <p style="color: #374151; line-height: 1.6;">
        If you believe this is an error or wish to reapply with additional information,
        please contact us at <a href="mailto:support@infraquip.in" style="color: #f59e0b;">support@infraquip.in</a>.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">
        InfraQuip · support@infraquip.in
      </p>
    </div>
    """
    _send(email, "Update on your InfraQuip account request", html)
