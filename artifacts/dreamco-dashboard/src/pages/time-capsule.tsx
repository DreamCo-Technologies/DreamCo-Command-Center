import { PlannedSection } from "@/components/planned-section";
import { History } from "lucide-react";

export default function TimeCapsulePage() {
  return (
    <PlannedSection
      title="Time_Capsule"
      icon={<History className="h-8 w-8" />}
      status="planned"
      tagline="Empire history + daily snapshots"
      scope="~3 hours"
      willDo={[
        "Snapshot key metrics (revenue, bot count, builds) once a day",
        "Render a timeline so you can scrub back to any point in the empire's history",
        "Diff any two days to see exactly what changed and what grew",
        "Persist snapshots so progress toward $15k/month is provable over time",
      ]}
    />
  );
}
