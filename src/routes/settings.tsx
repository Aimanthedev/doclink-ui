import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/SettingsPage";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings — DocLink" },
      { name: "description", content: "DocLink Settings: manage your firm's settings." },
      { property: "og:title", content: "Settings — DocLink" },
      { property: "og:description", content: "DocLink Settings: manage your firm's settings." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
