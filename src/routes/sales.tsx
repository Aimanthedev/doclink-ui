import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/sales/SalesPage";

export const Route = createFileRoute("/sales")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sales — DocLink" },
      { name: "description", content: "DocLink Sales: manage your firm's leads and sales pipeline." },
      { property: "og:title", content: "Sales — DocLink" },
      { property: "og:description", content: "DocLink Sales: manage your firm's leads and sales pipeline." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
