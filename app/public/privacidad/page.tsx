import type { Metadata } from "next";
import PublicInformationPage from "@/components/public/PublicInformationPage";

export const metadata: Metadata = { title: "Privacidad" };
export default function PrivacyPage() { return <PublicInformationPage kind="privacy" />; }
