"""
Models package — import all models here so Alembic can discover them.
"""
from app.models.user import User, VendorProfile, CustomerProfile, BrokerProfile, UserRole
from app.models.machine import (
    Machine, Category, SubCategory, MachineImage, MachineDocument,
    MachineCondition, ListingType, MachineStatus,
    MachineRunningCondition, MachineOwnershipType,
)
from app.models.enquiry import Enquiry, EnquiryMessage, EnquiryStatus
from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionStatus
from app.models.analytics import (
    Review, Wishlist, Notification, MachineAnalytics, PlatformAnalytics, AuditLog
)
from app.models.account_request import AccountRequest, AccountRequestStatus
from app.models.master_data import EquipmentMasterData

__all__ = [
    "User", "VendorProfile", "CustomerProfile", "BrokerProfile", "UserRole",
    "Machine", "Category", "SubCategory", "MachineImage", "MachineDocument",
    "MachineCondition", "ListingType", "MachineStatus",
    "MachineRunningCondition", "MachineOwnershipType",
    "Enquiry", "EnquiryMessage", "EnquiryStatus",
    "SubscriptionPlan", "Subscription", "SubscriptionStatus",
    "Review", "Wishlist", "Notification",
    "MachineAnalytics", "PlatformAnalytics", "AuditLog",
    "AccountRequest", "AccountRequestStatus", "EquipmentMasterData",
]
