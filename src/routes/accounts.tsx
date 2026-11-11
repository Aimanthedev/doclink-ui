import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/accounts/AccountsPage";

export const Route = createFileRoute("/accounts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accounts — DocLink" },
      { name: "description", content: "DocLink Accounts: manage your firm's expenses and accounts." },
      { property: "og:title", content: "Accounts — DocLink" },
      { property: "og:description", content: "DocLink Accounts: manage your firm's expenses and accounts." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
