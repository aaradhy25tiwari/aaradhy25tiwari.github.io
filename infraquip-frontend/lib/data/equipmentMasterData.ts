import masterDataRaw from "./master_data.json";

export interface EquipmentMasterItem {
  "Equipment Type": string;
  "Equipment Make": string;
  "Equipment Model": string;
  "Capacity Text 1"?: string;
  "Capacity Unit 1"?: string;
  "Capacity 1"?: number | string;
  "Capacity 1 Range"?: string;
  "Capacity Text 2"?: string;
  "Capacity Unit 2"?: string;
  "Capacity 2"?: number | string;
  "Capacity 2 Range"?: string;
}

export const masterData: EquipmentMasterItem[] = masterDataRaw as EquipmentMasterItem[];

// List of all unique makes sorted alphabetically
export const ALL_MAKES: string[] = Array.from(
  new Set(
    masterData
      .map((item) => item["Equipment Make"]?.trim())
      .filter((m): m is string => Boolean(m))
  )
).sort((a, b) => a.localeCompare(b));

// Get unique makes optionally filtered by equipment category
export function getMakesForCategory(categoryName?: string): string[] {
  if (!categoryName) return ALL_MAKES;
  const filtered = masterData.filter(
    (item) => item["Equipment Type"]?.toLowerCase() === categoryName.toLowerCase()
  );
  if (filtered.length === 0) return ALL_MAKES;
  return Array.from(new Set(filtered.map((item) => item["Equipment Make"]?.trim()))).sort((a, b) =>
    a.localeCompare(b)
  );
}

// Get models for a selected make
export function getModelsForMake(
  make?: string,
  categoryName?: string
): { model: string; capacity: string }[] {
  if (!make) return [];
  const makeNormalized = make.trim().toLowerCase();

  const filtered = masterData.filter((item) => {
    const itemMake = item["Equipment Make"]?.trim().toLowerCase();
    const matchesMake = itemMake === makeNormalized || (itemMake && makeNormalized.includes(itemMake));
    if (categoryName) {
      return (
        matchesMake &&
        item["Equipment Type"]?.toLowerCase() === categoryName.toLowerCase()
      );
    }
    return matchesMake;
  });

  const result: { model: string; capacity: string }[] = [];
  const seen = new Set<string>();

  for (const item of filtered) {
    const model = item["Equipment Model"]?.trim();
    if (model && !seen.has(model.toLowerCase())) {
      seen.add(model.toLowerCase());

      const cap1 = item["Capacity 1 Range"] || (item["Capacity 1"] ? `${item["Capacity 1"]} ${item["Capacity Unit 1"] || ""}`.trim() : "");
      const cap2 = item["Capacity 2 Range"] || (item["Capacity 2"] ? `${item["Capacity 2"]} ${item["Capacity Unit 2"] || ""}`.trim() : "");
      const capacity = [cap1, cap2].filter(Boolean).join(", ");

      result.push({ model, capacity });
    }
  }

  return result.sort((a, b) => a.model.localeCompare(b.model));
}

// Get capacity text for a specific make and model
export function getCapacityForModel(make?: string, model?: string): string {
  if (!make || !model) return "";
  const makeNorm = make.trim().toLowerCase();
  const modelNorm = model.trim().toLowerCase();

  const found = masterData.find(
    (item) =>
      item["Equipment Make"]?.trim().toLowerCase() === makeNorm &&
      item["Equipment Model"]?.trim().toLowerCase() === modelNorm
  );

  if (!found) return "";
  const cap1 = found["Capacity 1 Range"] || (found["Capacity 1"] ? `${found["Capacity 1"]} ${found["Capacity Unit 1"] || ""}`.trim() : "");
  const cap2 = found["Capacity 2 Range"] || (found["Capacity 2"] ? `${found["Capacity 2"]} ${found["Capacity Unit 2"] || ""}`.trim() : "");
  return [cap1, cap2].filter(Boolean).join(", ");
}
