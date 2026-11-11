import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/calendar/CalendarPage";

export const Route = createFileRoute("/calendar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Calendar — DocLink" },
      { name: "description", content: "DocLink Calendar: manage your firm's events and follow-ups." },
      { property: "og:title", content: "Calendar — DocLink" },
      { property: "og:description", content: "DocLink Calendar: manage your firm's events and follow-ups." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
