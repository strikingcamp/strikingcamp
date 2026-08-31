import AdminMembershipRequestsView from "@/components/admin/AdminMembershipRequestsView";

export const metadata = {
  title: "Validation des Adhésions | Admin Striking Camp",
  description: "Validation manuelle des demandes d'adhésion et activation des formules membres.",
};

export default function AdminAdhesionsPage() {
  return <AdminMembershipRequestsView />;
}
