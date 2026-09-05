import { useMemo } from "react";
import { api } from "../../../api/client";

interface HeatmapProps {
  date: string;
  depth: number;
}

export default function Heatmap({
  date,
  depth,
}: HeatmapProps) {
  const imageUrl = useMemo(
    () => api.heatmapUrl(date, depth),
    [date, depth]
  );

  return (
    <div className="w-full overflow-hidden rounded-xl">
      <img
        src={imageUrl}
        alt={`Predicted ocean temperature at ${depth} m on ${date}`}
        className="w-full h-auto block"
      />
    </div>
  );
}