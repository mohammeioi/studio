import { DebtManager } from "@/components/debt-flow/debt-flow-client";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-4 font-body">
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>
      <div className="max-w-6xl mx-auto">
        <DebtManager />
      </div>
    </div>
  );
}
