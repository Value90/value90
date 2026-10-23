import type { Metadata } from "next";
import PublicInformationPage from "@/components/public/PublicInformationPage";

export const metadata: Metadata = { title: "Cookies y anuncios" };
export default function CookiesPage() { return <PublicInformationPage kind="cookies" />; }
