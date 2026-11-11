import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/cases/CasesPage";

export const Route = createFileRoute("/cases")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cases — DocLink" },
      { name: "description", content: "DocLink Cases: manage your firm's cases and their progress." },
      { property: "og:title", content: "Cases — DocLink" },
      { property: "og:description", content: "DocLink Cases: manage your firm's cases and their progress." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
