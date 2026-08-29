import type { Metadata } from "next";
import MemberPlanningView from "@/components/membre/MemberPlanningView";

export const metadata: Metadata = {
  title: "Planning — Espace Membre Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Page Planning de l'espace membre — /membre/planning
 *
 * Permet la réservation des cours Small Group et la consultation des cours collectifs.
 */
export default function MembrePlanningPage() {
  return <MemberPlanningView />;
}
