import RewardsBand from "./RewardsBand";
import RewardsContent from "./RewardsContent";

export default function AccountRewards() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <RewardsBand cta={false} />
      <RewardsContent />
    </div>
  );
}
