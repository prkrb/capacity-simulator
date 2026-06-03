import { useRef, useState } from "react";
import { useCSVParser } from "../../hooks/useCSVParser";
import { generateSampleCSV, downloadCSV } from "../../utils/csvParser";

export default function CSVUploader() {
  const { handleFile } = useCSVParser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | "warning"; message: string; details?: string[] } | null>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await handleFile(file);

    if (result.errors.length > 0) {
      setStatus({ type: "error", message: result.errors.join("; "), details: result.errors });
    } else if (result.warnings.length > 0) {
      setStatus({
        type: "warning",
        message: `Loaded ${result.data.length} entries with ${result.warnings.length} warning(s)`,
        details: result.warnings.slice(0, 10),
      });
    } else {
      setStatus({ type: "success", message: `Loaded ${result.data.length} entries` });
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownloadSample = () => {
    downloadCSV(generateSampleCSV(), "sample-volume.csv");
  };

  const statusColor =
    status?.type === "error" ? "text-red-400" : status?.type === "warning" ? "text-amber-400" : "text-green-400";

  return (
    <div className="px-3 py-3 border-b border-gray-700">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Volume Data
      </h3>
      <div className="flex flex-col gap-2">
        <label className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded px-3 py-2 cursor-pointer transition-colors">
          Upload CSV
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={onFileChange}
            className="hidden"
          />
        </label>
        <button
          onClick={handleDownloadSample}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Download Sample CSV
        </button>
        {status && (
          <div>
            <p className={`text-xs ${statusColor}`}>{status.message}</p>
            {status.details && status.details.length > 0 && (
              <ul className="text-[10px] text-gray-500 mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                {status.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
