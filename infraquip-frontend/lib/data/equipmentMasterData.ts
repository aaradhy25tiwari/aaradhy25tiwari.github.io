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

// Helper to match category names flexibly (e.g. Excavators vs EXCAVATOR, Cranes vs HYD TELE CRANE)
export function matchesCategory(itemCatRaw?: string, targetCatRaw?: string): boolean {
  if (!itemCatRaw || !targetCatRaw) return false;
  const a = itemCatRaw.toLowerCase().trim();
  const b = targetCatRaw.toLowerCase().trim();
  if (a === b) return true;
  if (b === "all" || b === "all equipment") return true;

  const aSingular = a.endsWith("s") ? a.slice(0, -1) : a;
  const bSingular = b.endsWith("s") ? b.slice(0, -1) : b;
  if (aSingular === bSingular) return true;
  if (a.includes(bSingular) || b.includes(aSingular)) return true;

  // Domain mappings between platform categories and master data equipment types
  if ((a.includes("dozer") || a.includes("bulldozer")) && (b.includes("dozer") || b.includes("bulldozer"))) return true;
  if ((a.includes("roller") || a.includes("compactor")) && (b.includes("roller") || b.includes("compactor"))) return true;
  if ((a.includes("crane") || a.includes("hydra")) && (b.includes("crane") || b.includes("hydra"))) return true;
  if ((a.includes("concrete") || a.includes("pump")) && (b.includes("concrete") || b.includes("pump"))) return true;
  if (a.includes("grader") && b.includes("grader")) return true;
  if (a.includes("loader") && b.includes("loader")) return true;

  return false;
}

// Get unique makes optionally filtered by equipment category
export function getMakesForCategory(categoryName?: string, dynamicCatalog?: EquipmentMasterItem[]): string[] {
  const dataset = dynamicCatalog && dynamicCatalog.length > 0 ? dynamicCatalog : masterData;
  if (!categoryName || categoryName.toLowerCase().trim() === "all" || categoryName.toLowerCase().trim() === "all equipment") {
    return Array.from(
      new Set(dataset.map((item) => (item.make || item["Equipment Make"] || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }
  const filtered = dataset.filter((item) => {
    const cat = (item.category_name || item["Equipment Type"] || "").trim();
    return matchesCategory(cat, categoryName);
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
    if (categoryName && categoryName.toLowerCase().trim() !== "all" && categoryName.toLowerCase().trim() !== "all equipment") {
      const cat = (item.category_name || item["Equipment Type"] || "").trim();
      return matchesMake && matchesCategory(cat, categoryName);
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
    if (categoryName && categoryName.toLowerCase().trim() !== "all" && categoryName.toLowerCase().trim() !== "all equipment") {
      const cat = (item.category_name || item["Equipment Type"] || "").trim();
      return matches && matchesCategory(cat, categoryName);
    }
    return matches;
  });

  if (!found) return "";
  return found.capacity_specs || "";
}

