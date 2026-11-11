import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/renewals/RenewalsPage";

export const Route = createFileRoute("/renewals")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Renewals — DocLink" },
      { name: "description", content: "DocLink Renewals: manage your firm's upcoming renewals." },
      { property: "og:title", content: "Renewals — DocLink" },
      { property: "og:description", content: "DocLink Renewals: manage your firm's upcoming renewals." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
