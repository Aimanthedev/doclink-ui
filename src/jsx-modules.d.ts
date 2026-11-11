// The ported DOCLINK pages are plain JavaScript; treat their modules as untyped.
declare module "@/pages/*" {
  const Component: (props: Record<string, unknown>) => import("react").ReactNode;
  export default Component;
}
declare module "@/components/layout/*" {
  const Component: (props: { children?: import("react").ReactNode }) => import("react").ReactNode;
  export default Component;
}
declare module "@/lib/*";
declare module "@/contexts/*";
declare module "@/components/ui/*";
declare module "@/hooks/*";
