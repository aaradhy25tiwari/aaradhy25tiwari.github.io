export interface PublicLead {
  id: string;
  requirement_type: string;
  location_of_use?: string;
  required_from?: string;
  machine_title?: string;
  machine_category?: string;
  created_at: string;
  customer_first_name: string;
}

export interface EnquiryMessage {
  id: string;
  sender_id: string;
  message_text: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Enquiry {
  id: string;
  machine_id?: string;
  vendor_id: string;
  customer_id: string;
  requirement_type: string;
  customer_company?: string;
  required_from?: string;
  required_duration_days?: number;
  location_of_use?: string;
  message?: string;
  status: string;
  is_read_by_vendor: boolean;
  machine_title?: string;
  machine_slug?: string;
  customer_name?: string;
  messages: EnquiryMessage[];
  created_at: string;
  updated_at: string;
}
