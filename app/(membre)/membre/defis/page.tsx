import type { Metadata } from "next";
import MemberDefisView from "@/components/membre/MemberDefisView";

export const metadata: Metadata = {
  title: "Défis & Progression | Espace Membre Striking Camp",
  robots: { index: false, follow: false },
};

export default function MembreDefisPage() {
  return <MemberDefisView />;
}
