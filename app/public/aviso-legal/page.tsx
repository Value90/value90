import type { Metadata } from "next";
import PublicInformationPage from "@/components/public/PublicInformationPage";

export const metadata: Metadata = { title: "Aviso legal" };
export default function LegalPage() { return <PublicInformationPage kind="legal" />; }
