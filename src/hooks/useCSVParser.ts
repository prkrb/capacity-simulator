import { useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import type { CSVParseResult } from "../utils/csvParser";
import { parseVolumeCSV } from "../utils/csvParser";

export function useCSVParser() {
  const { dispatch } = useAppContext();

  const handleFile = useCallback(
    (file: File): Promise<CSVParseResult> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const result = parseVolumeCSV(text);
          if (result.errors.length === 0 && result.data.length > 0) {
            dispatch({ type: "SET_VOLUME_DATA", data: result.data });
          }
          resolve(result);
        };
        reader.readAsText(file);
      });
    },
    [dispatch]
  );

  return { handleFile };
}
