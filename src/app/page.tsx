
import { DebtManager } from "@/components/debt-flow/debt-flow-client";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-4 font-body">
      <div className="max-w-6xl mx-auto">
        <DebtManager />
      </div>
    </div>
  );
}
