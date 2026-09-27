import type { Metadata } from "next";
import { getServerTranslation } from "@/services/i18n";
import PublicSchedule from "./page-content";

type Props = {
  params: Promise<{ language: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { t } = await getServerTranslation(params.language, "schedule");

  return {
    title: t("title"),
    // Shared by direct link only; keep it out of search engines.
    robots: { index: false, follow: false },
  };
}

export default function Page() {
  return <PublicSchedule />;
}
