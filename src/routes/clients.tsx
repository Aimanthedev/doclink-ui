import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/clients/ClientsPage";

export const Route = createFileRoute("/clients")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Clients — DocLink" },
      { name: "description", content: "DocLink Clients: manage your firm's client records." },
      { property: "og:title", content: "Clients — DocLink" },
      { property: "og:description", content: "DocLink Clients: manage your firm's client records." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
