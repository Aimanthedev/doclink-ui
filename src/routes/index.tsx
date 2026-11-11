import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/overview/OverviewRouter";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Overview — DocLink" },
      { name: "description", content: "DocLink Overview: manage your firm's work at a glance." },
      { property: "og:title", content: "Overview — DocLink" },
      { property: "og:description", content: "DocLink Overview: manage your firm's work at a glance." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
