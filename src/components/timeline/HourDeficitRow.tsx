import { useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import { getAgentsNeededPerHour } from "../../utils/capacityCalc";

export default function HourDeficitRow() {
  const { state, capacityData } = useAppContext();
  const callsPerDay = state.agents[0]?.callsPerDay ?? 16;

  const hourStats = useMemo(
    () => getAgentsNeededPerHour(capacityData, callsPerDay),
    [capacityData, callsPerDay]
  );

  return (
    <div className="flex border-b border-gray-700 sticky top-[33px] bg-gray-900 z-10">
      <div className="w-48 shrink-0 px-3 flex items-center">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Need</span>
      </div>
      {hourStats.map(({ hour, agentsNeeded, worstDeficit }) => {
        const bg =
          agentsNeeded === 0
            ? "bg-green-500/10"
            : agentsNeeded <= 2
              ? "bg-amber-500/15"
              : "bg-red-500/15";
        const textColor =
          agentsNeeded === 0
            ? "text-green-500"
            : agentsNeeded <= 2
              ? "text-amber-400"
              : "text-red-400";

        return (
          <div
            key={hour}
            className={`flex-1 flex flex-col items-center justify-center py-1 border-l border-gray-700/50 ${bg}`}
            title={
              agentsNeeded > 0
                ? `Worst deficit: ${worstDeficit} calls — need ${agentsNeeded} more agent(s)`
                : "Fully covered"
            }
          >
            {agentsNeeded > 0 ? (
              <span className={`text-xs font-bold ${textColor}`}>
                +{agentsNeeded}
              </span>
            ) : (
              <span className="text-[10px] text-green-600">OK</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
