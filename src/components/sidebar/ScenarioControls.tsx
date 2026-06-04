import { useAppContext } from "../../context/AppContext";

export default function ScenarioControls() {
  const { dispatch } = useAppContext();

  const handleOptimize = () => {
    dispatch({ type: "OPTIMIZE_AGENTS" });
  };

  return (
    <div className="px-3 py-3 border-t border-gray-700">
      <button
        onClick={handleOptimize}
        className="w-full text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded px-2 py-2 transition-colors"
      >
        Optimize
      </button>
    </div>
  );
}
