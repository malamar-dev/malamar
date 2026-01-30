import { AppLayout } from "@/components/layout/app-layout/app-layout.tsx";
import { useDocumentTitle } from "@/hooks/use-document-title.ts";

export const DashboardPage = () => {
  useDocumentTitle("Dashboard");

  return (
    <AppLayout>
      <p>Lorem ipsum dolor sit amet</p>
    </AppLayout>
  );
};
