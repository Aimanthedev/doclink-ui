import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/pages/LoginPage";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — DocLink" },
      { name: "description", content: "Sign in to the DocLink dashboard." },
      { property: "og:title", content: "Sign in — DocLink" },
      { property: "og:description", content: "Sign in to the DocLink dashboard." },
    ],
  }),
  component: LoginPage,
});
