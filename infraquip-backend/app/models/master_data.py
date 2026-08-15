import uuid
from sqlalchemy import Column, String, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class EquipmentMasterData(Base):
    __tablename__ = "equipment_master_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_type = Column(String(100), nullable=False)
    equipment_make = Column(String(100), nullable=False)
    equipment_model = Column(String(200), nullable=False)
    
    capacity_text_1 = Column(String(100), nullable=True)
    capacity_unit_1 = Column(String(50), nullable=True)
    capacity_1 = Column(Numeric, nullable=True)
    capacity_1_range = Column(String(100), nullable=True)

    capacity_text_2 = Column(String(100), nullable=True)
    capacity_unit_2 = Column(String(50), nullable=True)
    capacity_2 = Column(Numeric, nullable=True)
    capacity_2_range = Column(String(100), nullable=True)
