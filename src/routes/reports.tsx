import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/reports/ReportsPage";

export const Route = createFileRoute("/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reports — DocLink" },
      { name: "description", content: "DocLink Reports: manage your firm's reports." },
      { property: "og:title", content: "Reports — DocLink" },
      { property: "og:description", content: "DocLink Reports: manage your firm's reports." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
