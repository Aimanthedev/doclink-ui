import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import Page from "@/pages/employees/EmployeesPage";

export const Route = createFileRoute("/employees")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Employees — DocLink" },
      { name: "description", content: "DocLink Employees: manage your firm's team members." },
      { property: "og:title", content: "Employees — DocLink" },
      { property: "og:description", content: "DocLink Employees: manage your firm's team members." },
    ],
  }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});
