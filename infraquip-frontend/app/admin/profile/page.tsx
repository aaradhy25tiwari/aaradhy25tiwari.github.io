import { Metadata } from "next";
import ProfilePageContent from "@/components/dashboard/ProfilePageContent";

export const metadata: Metadata = {
  title: "Profile | Admin Dashboard",
  description: "Manage your admin profile and account settings.",
};

export default function AdminProfilePage() {
  return <ProfilePageContent />;
}
