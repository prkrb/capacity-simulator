import { useRef, useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { SPECIALIST_QUEUES } from "../../types";
import HourHeaders from "./HourHeaders";
import QueueGroupRow from "./QueueGroupRow";

export default function TimelineGrid() {
  const { state } = useAppContext();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        // Subtract the 80px label column
        const rowArea = timelineRef.current.querySelector(".timeline-row-area");
        if (rowArea) {
          setTimelineWidth(rowArea.clientWidth);
        } else {
          setTimelineWidth(timelineRef.current.clientWidth - 80);
        }
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const grouped = SPECIALIST_QUEUES.map((queue) => ({
    queue,
    agents: state.agents.filter((a) => a.specialistQueue === queue),
  }));

  return (
    <div ref={timelineRef} className="flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <HourHeaders />
      <div className="overflow-y-auto flex-1">
        {/* Hidden measurement element */}
        <div className="flex invisible h-0 overflow-hidden">
          <div className="w-20 shrink-0" />
          <div className="flex-1 timeline-row-area" />
        </div>
        {grouped.map(({ queue, agents }) => (
          <QueueGroupRow
            key={queue}
            queue={queue}
            agents={agents}
            timelineWidth={timelineWidth}
          />
        ))}
      </div>
    </div>
  );
}
