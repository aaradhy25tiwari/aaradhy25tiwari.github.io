import type { Metadata } from "next";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const cityName = resolvedParams.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `Construction Equipment in ${cityName} | InfraQuip`,
    description: `Find verified construction equipment for rent and purchase in ${cityName}. Browse excavators, loaders, cranes, and more from trusted local vendors.`,
    openGraph: {
      title: `Equipment in ${cityName} | InfraQuip`,
      description: `Rent or buy construction equipment in ${cityName}.`,
      siteName: "InfraQuip",
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  redirect(`/machines?city=${resolvedParams.slug}`);
}
