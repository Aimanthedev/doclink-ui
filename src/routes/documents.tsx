import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/documents/DocumentsPage";

export const Route = createFileRoute("/documents")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Documents — DocLink" },
      { name: "description", content: "DocLink Documents: manage your firm's documents." },
      { property: "og:title", content: "Documents — DocLink" },
      { property: "og:description", content: "DocLink Documents: manage your firm's documents." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
