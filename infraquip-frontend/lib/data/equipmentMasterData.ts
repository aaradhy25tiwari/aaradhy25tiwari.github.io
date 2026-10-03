import masterDataRaw from "./master_data.json";

export interface EquipmentMasterItem {
  id?: string;
  category_name?: string;
  make: string;
  model: string;
  capacity_specs?: string;
  // Legacy / Excel fields
  "Equipment Type"?: string;
  "Equipment Make"?: string;
  "Equipment Model"?: string;
  "Capacity Text 1"?: string;
  "Capacity Unit 1"?: string;
  "Capacity 1"?: number | string;
  "Capacity 1 Range"?: string;
  "Capacity Text 2"?: string;
  "Capacity Unit 2"?: string;
  "Capacity 2"?: number | string;
  "Capacity 2 Range"?: string;
}

// Normalize raw excel json into uniform master items
export const masterData: EquipmentMasterItem[] = (masterDataRaw as any[]).map((item) => {
  const cap1 = item["Capacity 1 Range"] || (item["Capacity 1"] ? `${item["Capacity 1"]} ${item["Capacity Unit 1"] || ""}`.trim() : "");
  const cap2 = item["Capacity 2 Range"] || (item["Capacity 2"] ? `${item["Capacity 2"]} ${item["Capacity Unit 2"] || ""}`.trim() : "");
  const capacity = [cap1, cap2].filter(Boolean).join(" | ");

  return {
    ...item,
    category_name: item["Equipment Type"] || item.category_name || "",
    make: item["Equipment Make"] || item.make || "",
    model: item["Equipment Model"] || item.model || "",
    capacity_specs: capacity || item.capacity_specs || "",
  };
});

// List of all unique makes sorted alphabetically
export const ALL_MAKES: string[] = Array.from(
  new Set(
    masterData
      .map((item) => item.make?.trim())
      .filter((m): m is string => Boolean(m))
  )
).sort((a, b) => a.localeCompare(b));

// Get unique makes optionally filtered by equipment category
export function getMakesForCategory(categoryName?: string, dynamicCatalog?: EquipmentMasterItem[]): string[] {
  const dataset = dynamicCatalog && dynamicCatalog.length > 0 ? dynamicCatalog : masterData;
  if (!categoryName) {
    return Array.from(
      new Set(dataset.map((item) => (item.make || item["Equipment Make"] || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }
  const filtered = dataset.filter((item) => {
    const cat = (item.category_name || item["Equipment Type"] || "").toLowerCase().trim();
    return cat === categoryName.toLowerCase().trim();
  });
  if (filtered.length === 0) {
    return Array.from(
      new Set(dataset.map((item) => (item.make || item["Equipment Make"] || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }
  return Array.from(new Set(filtered.map((item) => (item.make || item["Equipment Make"] || "").trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  );
}

// Get models for a selected make
export function getModelsForMake(
  make?: string,
  categoryName?: string,
  dynamicCatalog?: EquipmentMasterItem[]
): { model: string; capacity: string }[] {
  if (!make) return [];
  const dataset = dynamicCatalog && dynamicCatalog.length > 0 ? dynamicCatalog : masterData;
  const makeNormalized = make.trim().toLowerCase();

  const filtered = dataset.filter((item) => {
    const itemMake = (item.make || item["Equipment Make"] || "").trim().toLowerCase();
    const matchesMake = itemMake === makeNormalized;
    if (categoryName) {
      const cat = (item.category_name || item["Equipment Type"] || "").toLowerCase().trim();
      return matchesMake && cat === categoryName.toLowerCase().trim();
    }
    return matchesMake;
  });

  const result: { model: string; capacity: string }[] = [];
  const seen = new Set<string>();

  for (const item of filtered) {
    const model = (item.model || item["Equipment Model"] || "").trim();
    if (model && !seen.has(model.toLowerCase())) {
      seen.add(model.toLowerCase());
      const capacity = item.capacity_specs || "";
      result.push({ model, capacity });
    }
  }

  return result.sort((a, b) => a.model.localeCompare(b.model));
}

// Get capacity text for a specific make and model
export function getCapacityForModel(
  make?: string,
  model?: string,
  categoryName?: string,
  dynamicCatalog?: EquipmentMasterItem[]
): string {
  if (!make || !model) return "";
  const dataset = dynamicCatalog && dynamicCatalog.length > 0 ? dynamicCatalog : masterData;
  const makeNorm = make.trim().toLowerCase();
  const modelNorm = model.trim().toLowerCase();

  const found = dataset.find((item) => {
    const itemMake = (item.make || item["Equipment Make"] || "").trim().toLowerCase();
    const itemModel = (item.model || item["Equipment Model"] || "").trim().toLowerCase();
    const matches = itemMake === makeNorm && itemModel === modelNorm;
    if (categoryName) {
      const cat = (item.category_name || item["Equipment Type"] || "").toLowerCase().trim();
      return matches && cat === categoryName.toLowerCase().trim();
    }
    return matches;
  });

  if (!found) return "";
  return found.capacity_specs || "";
}

