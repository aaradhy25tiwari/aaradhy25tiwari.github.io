import type { Metadata } from "next";
import { MachineDetailClient } from "@/components/machines/MachineDetailClient";

interface MachinePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: MachinePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `${resolvedParams.slug} | InfraQuip`,
    description: "View the machine listing details, location, price and vendor information on InfraQuip.",
  };
}

export default async function MachinePage({ params }: MachinePageProps) {
  const resolvedParams = await params;
  return <MachineDetailClient slug={resolvedParams.slug} />;
}
