"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Plus, Edit2, Trash2, Search, Filter, Database, CheckCircle, 
  AlertCircle, Wrench, X, Upload, Download, Tag, Layers, Check, RefreshCw, 
  ChevronLeft, ChevronRight, FileSpreadsheet, Power
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MasterCatalogItem {
  id: string;
  category_name: string;
  make: string;
  model: string;
  capacity_specs?: string | null;
  created_at?: string;
}

interface AdminCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon_url?: string | null;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  total_listings: number;
  approved_listings: number;
  sub_categories: Array<{ id: string; name: string; slug: string }>;
}

export default function AdminMasterDataPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"catalog" | "categories">("catalog");

  // ── Equipment Catalog State ─────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMake, setSelectedMake] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  // Modals for Equipment Catalog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editItem, setEditItem] = useState<MasterCatalogItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MasterCatalogItem | null>(null);

  // Form states for Catalog Item
  const [formCategory, setFormCategory] = useState("");
  const [formMake, setFormMake] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Import Form
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);

  // ── Categories State ───────────────────────────────────────────
  const [categorySearch, setCategorySearch] = useState("");
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<AdminCategoryItem | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<AdminCategoryItem | null>(null);

  // Category Form states
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catIconUrl, setCatIconUrl] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catSortOrder, setCatSortOrder] = useState(0);
  const [catIsActive, setCatIsActive] = useState(true);
  const [catFormError, setCatFormError] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────

  // Master Catalog Query
  const { data: catalogData, isLoading: isCatalogLoading } = useQuery<{
    results: MasterCatalogItem[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }>({
    queryKey: ["admin-master-catalog", search, selectedCategory, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      params.set("page", page.toString());
      params.set("per_page", perPage.toString());
      const res = await apiClient.get(`/admin/master-catalog?${params.toString()}`);
      return res.data;
    },
  });

  // Categories Query
  const { data: categoriesData = [], isLoading: isCategoriesLoading } = useQuery<AdminCategoryItem[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/categories");
      return res.data;
    },
  });

  // Derived filter options
  const catalogItems = catalogData?.results || [];
  const totalItems = catalogData?.total || 0;
  const totalPages = catalogData?.total_pages || 1;

  // Extract unique categories & makes
  const uniqueCategories = useMemo(() => {
    const fromCat = categoriesData.map(c => c.name.toUpperCase());
    const fromItems = catalogItems.map(i => i.category_name.toUpperCase());
    return Array.from(new Set([...fromCat, ...fromItems])).filter(Boolean).sort();
  }, [categoriesData, catalogItems]);

  const uniqueMakes = useMemo(() => {
    return Array.from(new Set(catalogItems.map(i => i.make))).filter(Boolean).sort();
  }, [catalogItems]);

  // Filtered catalog items on client for make
  const filteredCatalogItems = useMemo(() => {
    if (selectedMake === "all") return catalogItems;
    return catalogItems.filter(i => i.make.toLowerCase() === selectedMake.toLowerCase());
  }, [catalogItems, selectedMake]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoriesData;
    const q = categorySearch.toLowerCase();
    return categoriesData.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.slug.toLowerCase().includes(q) || 
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categoriesData, categorySearch]);

  // ── Master Catalog Mutations ────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (payload: { category_name: string; make: string; model: string; capacity_specs?: string }) => {
      const { data } = await apiClient.post("/admin/master-catalog", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      setIsAddOpen(false);
      resetCatalogForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to add master catalog item.");
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (payload: { items: Array<{ category_name: string; make: string; model: string; capacity_specs?: string }> }) => {
      const { data } = await apiClient.post("/admin/master-catalog/bulk", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      setIsBulkOpen(false);
      setBulkText("");
      setBulkError(null);
    },
    onError: (err: any) => {
      setBulkError(err.response?.data?.detail || "Failed to bulk import items.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<MasterCatalogItem> }) => {
      const { data } = await apiClient.put(`/admin/master-catalog/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      setEditItem(null);
      resetCatalogForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to update master catalog item.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/admin/master-catalog/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      setDeleteItem(null);
    },
  });

  // ── Category Mutations ──────────────────────────────────────────

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; slug?: string; icon_url?: string; description?: string; sort_order: number; is_active: boolean }) => {
      const { data } = await apiClient.post("/admin/categories", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsAddCategoryOpen(false);
      resetCategoryForm();
    },
    onError: (err: any) => {
      setCatFormError(err.response?.data?.detail || "Failed to create category.");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AdminCategoryItem> }) => {
      const { data } = await apiClient.put(`/admin/categories/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditCategory(null);
      resetCategoryForm();
    },
    onError: (err: any) => {
      setCatFormError(err.response?.data?.detail || "Failed to update category.");
    },
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/admin/categories/${id}/toggle-status`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/admin/categories/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteCategory(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to delete category.");
    },
  });

  // ── Form Helpers ───────────────────────────────────────────────

  const resetCatalogForm = () => {
    setFormCategory("");
    setFormMake("");
    setFormModel("");
    setFormCapacity("");
    setFormError(null);
  };

  const resetCategoryForm = () => {
    setCatName("");
    setCatSlug("");
    setCatIconUrl("");
    setCatDescription("");
    setCatSortOrder(0);
    setCatIsActive(true);
    setCatFormError(null);
  };

  const openAddCatalog = () => {
    resetCatalogForm();
    setIsAddOpen(true);
  };

  const openEditCatalog = (item: MasterCatalogItem) => {
    resetCatalogForm();
    setFormCategory(item.category_name);
    setFormMake(item.make);
    setFormModel(item.model);
    setFormCapacity(item.capacity_specs || "");
    setEditItem(item);
  };

  const openAddCategory = () => {
    resetCategoryForm();
    setIsAddCategoryOpen(true);
  };

  const openEditCategory = (item: AdminCategoryItem) => {
    resetCategoryForm();
    setCatName(item.name);
    setCatSlug(item.slug);
    setCatIconUrl(item.icon_url || "");
    setCatDescription(item.description || "");
    setCatSortOrder(item.sort_order);
    setCatIsActive(item.is_active);
    setEditCategory(item);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory.trim() || !formMake.trim() || !formModel.trim()) {
      setFormError("Category, Make, and Model are required.");
      return;
    }
    createMutation.mutate({
      category_name: formCategory.trim(),
      make: formMake.trim(),
      model: formModel.trim(),
      capacity_specs: formCapacity.trim() || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    if (!formCategory.trim() || !formMake.trim() || !formModel.trim()) {
      setFormError("Category, Make, and Model are required.");
      return;
    }
    updateMutation.mutate({
      id: editItem.id,
      payload: {
        category_name: formCategory.trim(),
        make: formMake.trim(),
        model: formModel.trim(),
        capacity_specs: formCapacity.trim() || undefined,
      },
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) {
      setBulkError("Please paste or enter CSV/tabular data.");
      return;
    }

    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    const parsedItems: Array<{ category_name: string; make: string; model: string; capacity_specs?: string }> = [];

    for (const line of lines) {
      // Support comma or tab separated
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      if (parts.length >= 3) {
        const cat = parts[0]?.trim();
        const mk = parts[1]?.trim();
        const md = parts[2]?.trim();
        const cap = parts.slice(3).join(", ")?.trim();

        if (cat && mk && md && cat.toLowerCase() !== "category" && mk.toLowerCase() !== "make") {
          parsedItems.push({
            category_name: cat,
            make: mk,
            model: md,
            capacity_specs: cap || undefined,
          });
        }
      }
    }

    if (parsedItems.length === 0) {
      setBulkError("Could not parse valid items. Format must be: Category, Make, Model, [Optional Specs]");
      return;
    }

    bulkCreateMutation.mutate({ items: parsedItems });
  };

  const handleCategoryAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatFormError("Category Name is required.");
      return;
    }
    createCategoryMutation.mutate({
      name: catName.trim(),
      slug: catSlug.trim() || undefined,
      icon_url: catIconUrl.trim() || undefined,
      description: catDescription.trim() || undefined,
      sort_order: Number(catSortOrder) || 0,
      is_active: catIsActive,
    });
  };

  const handleCategoryEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory) return;
    if (!catName.trim()) {
      setCatFormError("Category Name is required.");
      return;
    }
    updateCategoryMutation.mutate({
      id: editCategory.id,
      payload: {
        name: catName.trim(),
        slug: catSlug.trim() || undefined,
        icon_url: catIconUrl.trim() || undefined,
        description: catDescription.trim() || undefined,
        sort_order: Number(catSortOrder) || 0,
        is_active: catIsActive,
      },
    });
  };

  const exportCatalogToCSV = () => {
    const headers = ["Category", "Make", "Model", "Capacity Specs"];
    const rows = filteredCatalogItems.map(i => [
      `"${(i.category_name || "").replace(/"/g, '""')}"`,
      `"${(i.make || "").replace(/"/g, '""')}"`,
      `"${(i.model || "").replace(/"/g, '""')}"`,
      `"${(i.capacity_specs || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `infraquip_master_catalog_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Database className="h-6 w-6 text-primary" />
            Master Data Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centralized registry for equipment taxonomy, makes, models, and specifications.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "catalog" ? (
            <>
              <Button 
                onClick={() => setIsBulkOpen(true)} 
                variant="outline" 
                className="gap-2 text-xs h-9 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> 
                Bulk Import
              </Button>
              <Button 
                onClick={exportCatalogToCSV} 
                variant="outline" 
                className="gap-2 text-xs h-9 cursor-pointer"
              >
                <Download className="h-4 w-4 text-muted-foreground" /> 
                Export CSV
              </Button>
              <Button onClick={openAddCatalog} className="gap-2 text-xs h-9 shadow-sm cursor-pointer">
                <Plus className="h-4 w-4" /> Add Model
              </Button>
            </>
          ) : (
            <Button onClick={openAddCategory} className="gap-2 text-xs h-9 shadow-sm cursor-pointer">
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Models</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalItems.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unique Makes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{uniqueMakes.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Categories</p>
          <p className="text-2xl font-bold text-foreground mt-1">{categoriesData.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Categories</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {categoriesData.filter(c => c.is_active).length}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "catalog"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wrench className="h-4 w-4" />
          Equipment Catalog ({totalItems})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="h-4 w-4" />
          Platform Categories ({categoriesData.length})
        </button>
      </div>

      {/* TAB 1: EQUIPMENT CATALOG */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by make, model, capacity, or category..."
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="all">All Makes</option>
                {uniqueMakes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            {isCatalogLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCatalogItems.length === 0 ? (
              <div className="p-12 text-center">
                <Wrench className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="font-semibold text-foreground">No equipment master entries found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or click Add Model / Bulk Import.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Category / Type</th>
                      <th className="px-5 py-3.5">Make / Brand</th>
                      <th className="px-5 py-3.5">Model</th>
                      <th className="px-5 py-3.5">Capacity & Specifications</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredCatalogItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            {item.category_name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-foreground">{item.make}</td>
                        <td className="px-5 py-3.5 font-mono text-sm text-foreground/90">{item.model}</td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{item.capacity_specs || "—"}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditCatalog(item)}
                              className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteItem(item)}
                              className="p-1.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground bg-muted/10">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-border bg-card px-2 py-1 outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span>entries per page (Total {totalItems.toLocaleString()})</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isCatalogLoading}
                  className="h-8 px-2 text-xs cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="px-2 font-medium text-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isCatalogLoading}
                  className="h-8 px-2 text-xs cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLATFORM CATEGORIES */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories by name or slug..."
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            {isCategoriesLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="font-semibold text-foreground">No categories found</p>
                <p className="text-xs text-muted-foreground mt-1">Click Add Category to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Sort</th>
                      <th className="px-5 py-3.5">Category Name</th>
                      <th className="px-5 py-3.5">Slug</th>
                      <th className="px-5 py-3.5">Live Listings</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                          #{cat.sort_order}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-foreground">
                          {cat.name}
                          {cat.description && (
                            <p className="text-xs font-normal text-muted-foreground line-clamp-1 mt-0.5">
                              {cat.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                          {cat.slug}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-foreground">
                          <span className="font-semibold">{cat.approved_listings}</span> approved / {cat.total_listings} total
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => toggleCategoryMutation.mutate(cat.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                              cat.is_active
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title="Click to toggle status"
                          >
                            <Power className="h-3 w-3" />
                            {cat.is_active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditCategory(cat)}
                              className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteCategory(cat)}
                              className="p-1.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Add Single Master Model Modal */}
      <Dialog open={isAddOpen} onOpenChange={(o) => !o && setIsAddOpen(false)}>
        <DialogContent>
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle>Add Equipment Master Entry</DialogTitle>
              <DialogDescription>
                Add a new equipment model to the canonical catalog. Vendors will immediately see this in dropdowns.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="my-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="my-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Category / Equipment Type *</label>
                <input
                  type="text"
                  placeholder="e.g. EXCAVATOR, BACKHOE LOADER, CRANE"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Make / Brand *</label>
                <input
                  type="text"
                  placeholder="e.g. JCB, CATERPILLAR, VOLVO, KOMATSU"
                  value={formMake}
                  onChange={(e) => setFormMake(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Model *</label>
                <input
                  type="text"
                  placeholder="e.g. 320D, 3DX, PC210"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Capacity & Specs</label>
                <input
                  type="text"
                  placeholder='e.g. Operating Weight: 20 MT | Bucket Capacity: 1.0 Cum'
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add to Master Catalog
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Master Models Modal */}
      <Dialog open={isBulkOpen} onOpenChange={(o) => !o && setIsBulkOpen(false)}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleBulkSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Bulk Import Master Equipment
              </DialogTitle>
              <DialogDescription>
                Paste comma-separated (CSV) or tab-separated lines from Excel. Format: <br />
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                  Category, Make, Model, [Optional Specs]
                </code>
              </DialogDescription>
            </DialogHeader>

            {bulkError && (
              <div className="my-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            <div className="my-4">
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`EXCAVATOR, CATERPILLAR, 320D, Operating Weight: 20 MT
BACKHOE LOADER, JCB, 3DX, Engine: 76 HP
AIR COMPRESSOR, ATLAS COPCO, XA316, 650 CFM`}
                className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Duplicates against existing records will automatically be skipped.
              </p>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkCreateMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {bulkCreateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Import All Entries
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Master Item Modal */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Master Catalog Entry</DialogTitle>
              <DialogDescription>
                Modify details for this equipment make/model.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="my-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="my-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Category / Equipment Type *</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Make / Brand *</label>
                <input
                  type="text"
                  value={formMake}
                  onChange={(e) => setFormMake(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Model *</label>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Capacity & Specs</label>
                <input
                  type="text"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Catalog Confirmation Modal */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Master Catalog Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{deleteItem?.make} {deleteItem?.model}</span> from the master catalog?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => setDeleteItem(null)}
              className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={isAddCategoryOpen} onOpenChange={(o) => !o && setIsAddCategoryOpen(false)}>
        <DialogContent>
          <form onSubmit={handleCategoryAddSubmit}>
            <DialogHeader>
              <DialogTitle>Add Platform Category</DialogTitle>
              <DialogDescription>
                Create a high-level equipment classification category.
              </DialogDescription>
            </DialogHeader>

            {catFormError && (
              <div className="my-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{catFormError}</span>
              </div>
            )}

            <div className="my-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Earthmoving Equipment"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Slug (Optional URL Identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. earthmoving-equipment"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Sort Order</label>
                <input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of what equipment belongs in this category"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="cat-active-check"
                  checked={catIsActive}
                  onChange={(e) => setCatIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="cat-active-check" className="text-sm font-medium text-foreground cursor-pointer">
                  Active (Visible across platform)
                </label>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createCategoryMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {createCategoryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Category
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent>
          <form onSubmit={handleCategoryEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Platform Category</DialogTitle>
              <DialogDescription>
                Modify details for {editCategory?.name}.
              </DialogDescription>
            </DialogHeader>

            {catFormError && (
              <div className="my-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{catFormError}</span>
              </div>
            )}

            <div className="my-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Category Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Slug</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Sort Order</label>
                <input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="cat-edit-active-check"
                  checked={catIsActive}
                  onChange={(e) => setCatIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="cat-edit-active-check" className="text-sm font-medium text-foreground cursor-pointer">
                  Active (Visible across platform)
                </label>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditCategory(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateCategoryMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {updateCategoryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Modal */}
      <Dialog open={!!deleteCategory} onOpenChange={(o) => !o && setDeleteCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete category <span className="font-semibold text-foreground">{deleteCategory?.name}</span>?
              {deleteCategory && deleteCategory.total_listings > 0 && (
                <span className="block mt-2 font-semibold text-destructive">
                  Warning: This category currently has {deleteCategory.total_listings} listing(s) attached. You must reassign or remove those listings first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => setDeleteCategory(null)}
              className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteCategory && deleteCategoryMutation.mutate(deleteCategory.id)}
              disabled={deleteCategoryMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteCategoryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
