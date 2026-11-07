import type { Metadata } from "next";
import { MachineDetailClient } from "@/components/machines/MachineDetailClient";

interface MachinePageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: MachinePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `${resolvedParams.slug} | InfraQuip`,
    description: "View the machine listing details, location, price and vendor information on InfraQuip.",
  };
}

export default async function MachinePage({ params, searchParams }: MachinePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const fromVendor = resolvedSearchParams?.from === "vendor";
  return <MachineDetailClient slug={resolvedParams.slug} fromVendor={fromVendor} />;
}
