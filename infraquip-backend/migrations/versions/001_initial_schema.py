"""Initial schema: PostGIS, all tables, indexes, full-text search

Revision ID: 001
Revises:
Create Date: 2026-07-11
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── PostGIS Extension ──────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # ── Enums ──────────────────────────────────────────────────
    op.execute("CREATE TYPE userrole AS ENUM ('vendor', 'customer', 'admin')")
    op.execute("CREATE TYPE textpreference AS ENUM ('normal', 'large', 'xlarge')")
    op.execute("CREATE TYPE darkpreference AS ENUM ('system', 'light', 'dark')")
    op.execute("CREATE TYPE businesstype AS ENUM ('individual', 'company', 'partnership')")
    op.execute("CREATE TYPE machinecondition AS ENUM ('new', 'excellent', 'good', 'fair')")
    op.execute("CREATE TYPE listingtype AS ENUM ('rent', 'sale', 'both')")
    op.execute("CREATE TYPE machinestatus AS ENUM ('pending', 'approved', 'rejected', 'paused', 'deleted')")
    op.execute("CREATE TYPE minrentalduration AS ENUM ('1_day', '1_week', '1_month')")
    op.execute("CREATE TYPE requirementtype AS ENUM ('rent', 'buy')")
    op.execute("CREATE TYPE enquirystatus AS ENUM ('pending', 'replied', 'closed')")
    op.execute("CREATE TYPE planrole AS ENUM ('vendor', 'customer')")
    op.execute("CREATE TYPE subscriptionstatus AS ENUM ('active', 'cancelled', 'expired', 'trialing', 'past_due')")

    # ── users ──────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("auth_uid", postgresql.UUID(as_uuid=True), unique=True, nullable=True, index=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("role", postgresql.ENUM("vendor", "customer", "admin", name="userrole", create_type=False), nullable=False, server_default="customer"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("is_banned", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("dark_mode_preference", postgresql.ENUM("system", "light", "dark", name="darkpreference", create_type=False), nullable=True, server_default="system"),
        sa.Column("text_size_preference", postgresql.ENUM("normal", "large", "xlarge", name="textpreference", create_type=False), nullable=True, server_default="normal"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── vendor_profiles ────────────────────────────────────────
    op.create_table(
        "vendor_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("company_name", sa.String(300), nullable=False),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("pan", sa.String(15), nullable=True),
        sa.Column("business_type", postgresql.ENUM("individual", "company", "partnership", name="businesstype", create_type=False), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("profile_photo_url", sa.Text, nullable=True),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("response_rate", sa.Integer, nullable=True),
        sa.Column("member_since", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("total_views", sa.Integer, server_default=sa.text("0")),
    )

    # ── customer_profiles ──────────────────────────────────────
    op.create_table(
        "customer_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("company_name", sa.String(300), nullable=True),
        sa.Column("designation", sa.String(200), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("corporate_id", sa.String(50), nullable=True),
    )

    # ── categories ─────────────────────────────────────────────
    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("slug", sa.String(120), unique=True, nullable=False),
        sa.Column("icon_url", sa.Text, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
    )

    # ── sub_categories ─────────────────────────────────────────
    op.create_table(
        "sub_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
    )
    op.create_index("idx_sub_categories_category_slug", "sub_categories", ["category_id", "slug"], unique=True)

    # ── machines ───────────────────────────────────────────────
    op.create_table(
        "machines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("sub_category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sub_categories.id"), nullable=True),
        sa.Column("slug", sa.String(300), unique=True, nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("make", sa.String(100), nullable=False),
        sa.Column("model", sa.String(200), nullable=False),
        sa.Column("year_of_manufacture", sa.Integer, nullable=False),
        sa.Column("condition", postgresql.ENUM("new", "excellent", "good", "fair", name="machinecondition", create_type=False), nullable=False),
        sa.Column("capacity_specs", sa.Text, nullable=False),
        sa.Column("specifications", postgresql.JSONB, nullable=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("listing_type", postgresql.ENUM("rent", "sale", "both", name="listingtype", create_type=False), nullable=False),
        sa.Column("min_rental_duration", postgresql.ENUM("1_day", "1_week", "1_month", name="minrentalduration", create_type=False), nullable=True, server_default="1_day"),
        sa.Column("availability", sa.Boolean, server_default=sa.text("true")),
        sa.Column("status", postgresql.ENUM("pending", "approved", "rejected", "paused", "deleted", name="machinestatus", create_type=False), nullable=False, server_default="pending"),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("rental_price_daily", sa.Numeric(12, 2), nullable=True),
        sa.Column("rental_price_weekly", sa.Numeric(12, 2), nullable=True),
        sa.Column("rental_price_monthly", sa.Numeric(12, 2), nullable=True),
        sa.Column("purchase_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("contact_for_price", sa.Boolean, server_default=sa.text("false")),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("address_line", sa.Text, nullable=True),
        sa.Column("location", geoalchemy2.Geometry("POINT", srid=4326), nullable=True),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        sa.Column("search_vector", postgresql.TSVECTOR, nullable=True),
        sa.Column("views_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("enquiries_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("wishlist_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_machines_vendor_id", "machines", ["vendor_id"])
    op.create_index("idx_machines_category_id", "machines", ["category_id"])
    op.create_index("idx_machines_status", "machines", ["status"])
    op.create_index("idx_machines_listing_type", "machines", ["listing_type"])
    op.create_index("idx_machines_availability", "machines", ["availability"])
    op.create_index("idx_machines_city", "machines", ["city"])
    op.create_index("idx_machines_search_vector", "machines", ["search_vector"], postgresql_using="gin")
    op.execute("CREATE INDEX idx_machines_location_gist ON machines USING GIST (location)")

    # ── machine_images ─────────────────────────────────────────
    op.create_table(
        "machine_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("storage_path", sa.Text, nullable=False),
        sa.Column("display_url", sa.Text, nullable=True),
        sa.Column("alt_text", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, server_default=sa.text("0")),
        sa.Column("is_primary", sa.Boolean, server_default=sa.text("false")),
        sa.Column("file_size_bytes", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── machine_documents ──────────────────────────────────────
    op.create_table(
        "machine_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doc_type", sa.String(50), nullable=True),
        sa.Column("storage_path", sa.Text, nullable=False),
        sa.Column("original_filename", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── enquiries ──────────────────────────────────────────────
    op.create_table(
        "enquiries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id", ondelete="SET NULL"), nullable=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requirement_type", postgresql.ENUM("rent", "buy", name="requirementtype", create_type=False), nullable=False),
        sa.Column("customer_company", sa.String(300), nullable=True),
        sa.Column("required_from", sa.Date, nullable=True),
        sa.Column("required_duration_days", sa.Integer, nullable=True),
        sa.Column("location_of_use", sa.Text, nullable=True),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("status", postgresql.ENUM("pending", "replied", "closed", name="enquirystatus", create_type=False), nullable=False, server_default="pending"),
        sa.Column("is_read_by_vendor", sa.Boolean, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_enquiries_vendor_id", "enquiries", ["vendor_id"])
    op.create_index("idx_enquiries_customer_id", "enquiries", ["customer_id"])
    op.create_index("idx_enquiries_machine_id", "enquiries", ["machine_id"])
    op.create_index("idx_enquiries_status", "enquiries", ["status"])

    # ── enquiry_messages ───────────────────────────────────────
    op.create_table(
        "enquiry_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("enquiry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("enquiries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message_text", sa.Text, nullable=False),
        sa.Column("attachment_url", sa.Text, nullable=True),
        sa.Column("is_read", sa.Boolean, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_enquiry_messages_enquiry_id", "enquiry_messages", ["enquiry_id"])

    # ── subscription_plans ─────────────────────────────────────
    op.create_table(
        "subscription_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_code", sa.String(60), unique=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("role", postgresql.ENUM("vendor", "customer", name="planrole", create_type=False), nullable=False),
        sa.Column("price_monthly", sa.Numeric(10, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("active_listing_limit", sa.Integer, nullable=True),
        sa.Column("photos_per_listing", sa.Integer, nullable=False, server_default=sa.text("5")),
        sa.Column("enquiry_limit_monthly", sa.Integer, nullable=True),
        sa.Column("wishlist_limit", sa.Integer, nullable=True),
        sa.Column("has_featured_boost", sa.Boolean, server_default=sa.text("false")),
        sa.Column("boost_multiplier", sa.Numeric(3, 1), server_default=sa.text("1.0")),
        sa.Column("has_full_analytics", sa.Boolean, server_default=sa.text("false")),
        sa.Column("has_export", sa.Boolean, server_default=sa.text("false")),
        sa.Column("has_daily_digest", sa.Boolean, server_default=sa.text("false")),
        sa.Column("has_bulk_rfq", sa.Boolean, server_default=sa.text("false")),
        sa.Column("has_priority_badge", sa.Boolean, server_default=sa.text("false")),
        sa.Column("has_spec_download", sa.Boolean, server_default=sa.text("false")),
        sa.Column("verified_badge_eligible", sa.Boolean, server_default=sa.text("false")),
        sa.Column("razorpay_plan_id", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
    )

    # ── subscriptions ──────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscription_plans.id"), nullable=False),
        sa.Column("status", postgresql.ENUM("active", "cancelled", "expired", "trialing", "past_due", name="subscriptionstatus", create_type=False), nullable=False, server_default="active"),
        sa.Column("razorpay_subscription_id", sa.String(200), unique=True, nullable=True),
        sa.Column("razorpay_customer_id", sa.String(200), nullable=True),
        sa.Column("razorpay_order_id", sa.String(200), nullable=True),
        sa.Column("razorpay_payment_id", sa.String(200), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── reviews ────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enquiry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("enquiries.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("rating_overall", sa.SmallInteger, nullable=False),
        sa.Column("rating_condition", sa.SmallInteger, nullable=False),
        sa.Column("rating_communication", sa.SmallInteger, nullable=False),
        sa.Column("review_text", sa.Text, nullable=True),
        sa.Column("is_visible", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_reviews_machine_id", "reviews", ["machine_id"])
    op.create_index("idx_reviews_vendor_id", "reviews", ["vendor_id"])

    # ── wishlists ──────────────────────────────────────────────
    op.create_table(
        "wishlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint("uq_wishlist_user_machine", "wishlists", ["user_id", "machine_id"])
    op.create_index("idx_wishlist_user_id", "wishlists", ["user_id"])

    # ── notifications ──────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(60), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("link", sa.Text, nullable=True),
        sa.Column("is_read", sa.Boolean, server_default=sa.text("false")),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_notifications_user_id", "notifications", ["user_id"])
    op.create_index("idx_notifications_is_read", "notifications", ["is_read"])

    # ── machine_analytics ──────────────────────────────────────
    op.create_table(
        "machine_analytics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("machine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("machines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("views", sa.Integer, server_default=sa.text("0")),
        sa.Column("enquiries", sa.Integer, server_default=sa.text("0")),
        sa.Column("wishlist_adds", sa.Integer, server_default=sa.text("0")),
    )
    op.create_unique_constraint("uq_machine_analytics_machine_date", "machine_analytics", ["machine_id", "date"])
    op.create_index("idx_machine_analytics_machine_id", "machine_analytics", ["machine_id"])

    # ── platform_analytics ─────────────────────────────────────
    op.create_table(
        "platform_analytics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("date", sa.Date, unique=True, nullable=False),
        sa.Column("dau", sa.Integer, server_default=sa.text("0")),
        sa.Column("new_users", sa.Integer, server_default=sa.text("0")),
        sa.Column("new_listings", sa.Integer, server_default=sa.text("0")),
        sa.Column("total_enquiries", sa.Integer, server_default=sa.text("0")),
        sa.Column("total_revenue", sa.Numeric(14, 2), server_default=sa.text("0")),
    )

    # ── audit_logs ─────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(60), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("ip_address", postgresql.INET, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("idx_audit_logs_created_at", "audit_logs", ["created_at"])

    # ── Full-Text Search Trigger ───────────────────────────────
    op.execute("""
    CREATE FUNCTION machines_search_vector_update() RETURNS trigger AS $$
    BEGIN
        NEW.search_vector := to_tsvector('english',
            COALESCE(NEW.title, '') || ' ' ||
            COALESCE(NEW.make, '') || ' ' ||
            COALESCE(NEW.model, '') || ' ' ||
            COALESCE(NEW.description, '') || ' ' ||
            COALESCE(NEW.capacity_specs, '') || ' ' ||
            COALESCE(NEW.city, '') || ' ' ||
            COALESCE(NEW.state, '')
        );
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    CREATE TRIGGER machines_search_vector_trigger
        BEFORE INSERT OR UPDATE OF title, make, model, description, capacity_specs, city, state
        ON machines
        FOR EACH ROW
        EXECUTE FUNCTION machines_search_vector_update();
    """)

    # ── updated_at auto-update trigger ─────────────────────────
    op.execute("""
    CREATE FUNCTION update_updated_at_column() RETURNS trigger AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    for table in ["users", "machines", "enquiries", "subscriptions"]:
        op.execute(f"""
        CREATE TRIGGER {table}_updated_at_trigger
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS machines_search_vector_trigger ON machines")
    op.execute("DROP FUNCTION IF EXISTS machines_search_vector_update()")
    for table in ["users", "machines", "enquiries", "subscriptions"]:
        op.execute(f"DROP TRIGGER IF EXISTS {table}_updated_at_trigger ON {table}")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
    op.drop_table("audit_logs")
    op.drop_table("platform_analytics")
    op.drop_table("machine_analytics")
    op.drop_table("notifications")
    op.drop_table("wishlists")
    op.drop_table("reviews")
    op.drop_table("subscriptions")
    op.drop_table("subscription_plans")
    op.drop_table("enquiry_messages")
    op.drop_table("enquiries")
    op.drop_table("machine_documents")
    op.drop_table("machine_images")
    op.drop_table("machines")
    op.drop_table("sub_categories")
    op.drop_table("categories")
    op.drop_table("customer_profiles")
    op.drop_table("vendor_profiles")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
    op.execute("DROP TYPE IF EXISTS planrole")
    op.execute("DROP TYPE IF EXISTS enquirystatus")
    op.execute("DROP TYPE IF EXISTS requirementtype")
    op.execute("DROP TYPE IF EXISTS minrentalduration")
    op.execute("DROP TYPE IF EXISTS machinestatus")
    op.execute("DROP TYPE IF EXISTS listingtype")
    op.execute("DROP TYPE IF EXISTS machinecondition")
    op.execute("DROP TYPE IF EXISTS businesstype")
    op.execute("DROP TYPE IF EXISTS darkpreference")
    op.execute("DROP TYPE IF EXISTS textpreference")
    op.execute("DROP TYPE IF EXISTS userrole")
