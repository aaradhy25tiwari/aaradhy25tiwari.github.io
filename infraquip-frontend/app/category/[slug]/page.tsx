import type { Metadata } from "next";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const categoryName = resolvedParams.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${categoryName} Equipment for Rent & Sale | InfraQuip`,
    description: `Browse verified ${categoryName} equipment available for rent and purchase in India. Compare prices, read reviews, and connect with trusted vendors.`,
    openGraph: {
      title: `${categoryName} Equipment | InfraQuip`,
      description: `Find ${categoryName} construction equipment for rent or purchase.`,
      siteName: "InfraQuip",
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  redirect(`/machines?category=${resolvedParams.slug}`);
}
