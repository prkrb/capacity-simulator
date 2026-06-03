import { ALL_QUEUES } from "../../types";
import QueueChart from "./QueueChart";

export default function ChartsPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
      {ALL_QUEUES.map((queue) => (
        <QueueChart key={queue} queue={queue} />
      ))}
    </div>
  );
}
