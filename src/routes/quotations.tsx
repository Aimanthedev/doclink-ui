import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/quotations/QuotationsRoute";

export const Route = createFileRoute("/quotations")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Quotations — DocLink" },
      { name: "description", content: "DocLink Quotations: manage your firm's quotations, invoices and receipts." },
      { property: "og:title", content: "Quotations — DocLink" },
      { property: "og:description", content: "DocLink Quotations: manage your firm's quotations, invoices and receipts." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
