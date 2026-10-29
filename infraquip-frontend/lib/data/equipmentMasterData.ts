import masterDataRaw from "./master_data.json";
import { sortCategoriesAlphabetical } from "@/lib/utils";

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

// List of all unique makes sorted alphabetically with 'Other' last
export const ALL_MAKES: string[] = sortCategoriesAlphabetical(
  Array.from(
    new Set(
      masterData
        .map((item) => item.make?.trim())
        .filter((m): m is string => Boolean(m))
    )
  )
);

export function normalizeCategoryString(cat?: string): string {
  if (!cat) return "";
  return cat
    .toLowerCase()
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

// Helper to match category names flexibly (e.g. Excavators vs EXCAVATOR, Cranes vs HYD TELE CRANE)
export function matchesCategory(itemCatRaw?: string, targetCatRaw?: string): boolean {
  if (!itemCatRaw || !targetCatRaw) return false;
  const a = normalizeCategoryString(itemCatRaw);
  const b = normalizeCategoryString(targetCatRaw);
  if (a === b) return true;
  if (b === "all" || b === "all equipment") return true;

  const aSingular = a.endsWith("s") ? a.slice(0, -1) : a;
  const bSingular = b.endsWith("s") ? b.slice(0, -1) : b;
  if (aSingular === bSingular) return true;

  // Exact word-boundary matching for multi-word equipment types
  if (a.includes(bSingular) && bSingular.length >= 4) return true;
  if (b.includes(aSingular) && aSingular.length >= 4) return true;

  // Domain mappings for generic platform categories in legacy views:
  if ((b === "bulldozer" || b === "bulldozers" || b === "dozer" || b === "dozers") && a.includes("dozer")) return true;
  if ((b === "compactor" || b === "compactors") && (a.includes("roller") || a.includes("compactor"))) return true;
  if ((b === "crane" || b === "cranes") && (a.includes("crane") || a.includes("hydra"))) return true;
  if (b === "concrete" && (a.includes("concrete") || a.includes("pump"))) return true;
  if ((b === "grader" || b === "graders") && a.includes("grader")) return true;
  if ((b === "loader" || b === "loaders") && a.includes("loader")) return true;

  return false;
}

// Get unique makes optionally filtered by equipment category, sorted ascending with 'Other' last
export function getMakesForCategory(categoryName?: string, dynamicCatalog?: EquipmentMasterItem[]): string[] {
  const dataset = dynamicCatalog && dynamicCatalog.length > 0 ? dynamicCatalog : masterData;
  if (!categoryName || categoryName.toLowerCase().trim() === "all" || categoryName.toLowerCase().trim() === "all equipment") {
    const all = Array.from(
      new Set(dataset.map((item) => (item.make || item["Equipment Make"] || "").trim()).filter(Boolean))
    );
    return sortCategoriesAlphabetical(all);
  }

  const filtered = dataset.filter((item) => {
    const cat = (item.category_name || item["Equipment Type"] || "").trim();
    return matchesCategory(cat, categoryName);
  });

  const makes = Array.from(
    new Set(filtered.map((item) => (item.make || item["Equipment Make"] || "").trim()).filter(Boolean))
  );

  return sortCategoriesAlphabetical(makes);
}

// Get models for a selected make, sorted ascending with 'Other' last
export function getModelsForMake(
  make?: string,
  categoryName?: string,
  dynamicCatalog?: EquipmentMasterItem[]
): { model: string; capacity: string }[] {
  if (!make || make === "Other" || make === "other" || make === "__other__") return [];
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

  return result.sort((a, b) => {
    const isOtherA = a.model.toLowerCase().trim().startsWith("other");
    const isOtherB = b.model.toLowerCase().trim().startsWith("other");
    if (isOtherA && !isOtherB) return 1;
    if (!isOtherA && isOtherB) return -1;
    return a.model.localeCompare(b.model, undefined, { numeric: true, sensitivity: "base" });
  });
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

