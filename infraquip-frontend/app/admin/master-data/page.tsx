"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Plus, Edit2, Trash2, Search, Filter, Database, CheckCircle, 
  AlertCircle, Wrench, X, Upload, Download, Tag, Layers, Check, RefreshCw, 
  ChevronLeft, ChevronRight, FileSpreadsheet, Power, FileUp, AlertTriangle,
  ArrowRight, FileText, CheckCircle2, ArrowLeft
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { cn, sortCategoriesAlphabetical } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BulkItem {
  category_name: string;
  make: string;
  model: string;
  capacity_specs?: string | null;
}

interface BulkAnalysisResult {
  total_rows: number;
  new_count: number;
  existing_count: number;
  duplicate_in_file_count: number;
  invalid_count: number;
  new_items: BulkItem[];
  existing_items: BulkItem[];
  duplicate_in_file_items?: BulkItem[];
  invalid_items?: Array<{ item: any; reason: string }>;
  filename?: string;
}

interface BulkImportResult {
  added: number;
  skipped: number;
  total_processed: number;
  added_items: BulkItem[];
  skipped_items: Array<{ category_name: string; make: string; model: string; reason: string }>;
  message: string;
}

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
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"catalog" | "categories">("catalog");

  // Auto-open bulk modal if query param is set
  useEffect(() => {
    if (searchParams.get("bulk") === "true" || searchParams.get("action") === "bulk") {
      setActiveTab("catalog");
      setIsBulkOpen(true);
    }
  }, [searchParams]);

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

  // Bulk Import Workflow States
  const [bulkInputTab, setBulkInputTab] = useState<"file" | "paste">("file");
  const [bulkStep, setBulkStep] = useState<"input" | "preview" | "summary">("input");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkAnalysis, setBulkAnalysis] = useState<BulkAnalysisResult | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);
  const [previewTab, setPreviewTab] = useState<"new" | "existing">("new");
  const [isDragging, setIsDragging] = useState(false);

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
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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
    const unique = Array.from(new Set([...fromCat, ...fromItems])).filter(Boolean);
    return sortCategoriesAlphabetical(unique);
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
    const q = categorySearch.trim().toLowerCase();
    const base = !q
      ? categoriesData
      : categoriesData.filter(c => 
          c.name.toLowerCase().includes(q) || 
          c.slug.toLowerCase().includes(q) || 
          (c.description && c.description.toLowerCase().includes(q))
        );
    return sortCategoriesAlphabetical(base);
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
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsAddOpen(false);
      resetCatalogForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to add master catalog item.");
    },
  });

  const analyzeFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<BulkAnalysisResult>("/admin/master-catalog/upload-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: (data) => {
      setBulkAnalysis(data);
      setBulkStep("preview");
      setPreviewTab(data.new_count > 0 ? "new" : "existing");
      setBulkError(null);
    },
    onError: (err: any) => {
      setBulkError(err.response?.data?.detail || "Failed to analyze file. Please check format.");
    },
  });

  const analyzeTextMutation = useMutation({
    mutationFn: async (items: BulkItem[]) => {
      const { data } = await apiClient.post<BulkAnalysisResult>("/admin/master-catalog/analyze", { items });
      return data;
    },
    onSuccess: (data) => {
      setBulkAnalysis(data);
      setBulkStep("preview");
      setPreviewTab(data.new_count > 0 ? "new" : "existing");
      setBulkError(null);
    },
    onError: (err: any) => {
      setBulkError(err.response?.data?.detail || "Failed to analyze text data. Please check format.");
    },
  });

  const bulkCommitMutation = useMutation({
    mutationFn: async (items: BulkItem[]) => {
      const { data } = await apiClient.post<BulkImportResult>("/admin/master-catalog/bulk", { items });
      return data;
    },
    onSuccess: (data) => {
      setBulkResult(data);
      setBulkStep("summary");
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setBulkError(null);
    },
    onError: (err: any) => {
      setBulkError(err.response?.data?.detail || "Failed to import items into catalog.");
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
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
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

  const syncFromMasterMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/admin/categories/sync-master");
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      if (data.new_categories_created > 0) {
        setSyncFeedback(`Successfully synced ${data.new_categories_created} new categories from Master Data! (${data.created_category_names?.join(", ")})`);
      } else {
        setSyncFeedback("Categories are already fully in sync with Master Data.");
      }
      setTimeout(() => setSyncFeedback(null), 6000);
    },
    onError: (err: any) => {
      setSyncFeedback(err.response?.data?.detail || "Failed to sync categories with master data.");
      setTimeout(() => setSyncFeedback(null), 6000);
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

  const resetBulkState = () => {
    setIsBulkOpen(false);
    setBulkStep("input");
    setBulkFile(null);
    setBulkText("");
    setBulkError(null);
    setBulkAnalysis(null);
    setBulkResult(null);
    setPreviewTab("new");
    setIsDragging(false);
  };

  const downloadSampleCSV = () => {
    const content = "Category,Make,Model,Capacity Specs\nEXCAVATOR,CATERPILLAR,320D,Operating Weight: 20 MT\nBACKHOE LOADER,JCB,3DX,Engine: 76 HP\nCRANE,ACTION CONSTRUCTION,SX 150,15 Ton\nAIR COMPRESSOR,ATLAS COPCO,XA316,650 CFM";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "master_catalog_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);

    if (bulkInputTab === "file") {
      if (!bulkFile) {
        setBulkError("Please choose or drop an Excel (.xlsx, .xls) or CSV file.");
        return;
      }
      analyzeFileMutation.mutate(bulkFile);
    } else {
      if (!bulkText.trim()) {
        setBulkError("Please paste or enter CSV/tabular lines.");
        return;
      }
      const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
      const parsedItems: BulkItem[] = [];

      for (const line of lines) {
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

      analyzeTextMutation.mutate(parsedItems);
    }
  };

  const handleConfirmCommit = () => {
    if (!bulkAnalysis || bulkAnalysis.new_items.length === 0) return;
    bulkCommitMutation.mutate(bulkAnalysis.new_items);
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
                className="gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm cursor-pointer transition-all"
                id="btn-bulk-upload-machines"
              >
                <FileSpreadsheet className="h-4 w-4" /> 
                Bulk Upload Machines
              </Button>
              <Button onClick={openAddCatalog} className="gap-2 text-xs h-9 shadow-sm cursor-pointer">
                <Plus className="h-4 w-4" /> Add Single Model
              </Button>
              <Button 
                onClick={exportCatalogToCSV} 
                variant="outline" 
                className="gap-2 text-xs h-9 cursor-pointer"
              >
                <Download className="h-4 w-4 text-muted-foreground" /> 
                Export CSV
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => syncFromMasterMutation.mutate()}
                disabled={syncFromMasterMutation.isPending}
                variant="outline"
                className="gap-2 text-xs h-9 cursor-pointer"
                title="Synchronize equipment categories from master catalog"
              >
                <RefreshCw className={cn("h-4 w-4 text-primary", syncFromMasterMutation.isPending && "animate-spin")} />
                {syncFromMasterMutation.isPending ? "Syncing..." : "Sync from Master Data"}
              </Button>
              <Button onClick={openAddCategory} className="gap-2 text-xs h-9 shadow-sm cursor-pointer">
                <Plus className="h-4 w-4" /> Add Category
              </Button>
            </>
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

      {syncFeedback && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3.5 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1 font-medium">{syncFeedback}</span>
          <button onClick={() => setSyncFeedback(null)} className="text-primary hover:text-primary/70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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

              <Button 
                onClick={() => setIsBulkOpen(true)}
                variant="outline"
                className="gap-1.5 text-xs h-9 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium cursor-pointer"
                title="Bulk upload machines from Excel/CSV"
              >
                <Upload className="h-3.5 w-3.5" />
                Bulk Upload / Add
              </Button>
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
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or use the bulk upload to add multiple machines at once.</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button 
                    onClick={() => setIsBulkOpen(true)} 
                    className="gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Bulk Upload Machines
                  </Button>
                  <Button 
                    onClick={openAddCatalog} 
                    variant="outline" 
                    className="gap-2 text-xs h-9 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add Single Model
                  </Button>
                </div>
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Category / Equipment Type *</label>
                  <span className="text-[10px] text-muted-foreground font-normal">Auto-syncs to category list</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. EXCAVATOR, BACKHOE LOADER, CRANE"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                  list="available-categories-list"
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <datalist id="available-categories-list">
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Select existing or type a new category. Any new category will automatically appear in the category list.
                </p>
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
      <Dialog open={isBulkOpen} onOpenChange={(o) => !o && resetBulkState()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* ── STEP 1: INPUT STEP (File or Paste) ──────────────────── */}
          {bulkStep === "input" && (
            <form onSubmit={handleStartAnalysis}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Bulk Upload / Add Machines to Master Catalog
                </DialogTitle>
                <DialogDescription>
                  Upload an Excel or CSV spreadsheet, or paste comma/tab-separated text. The system will compare it against your catalog and show you a preview before anything is added.
                </DialogDescription>
              </DialogHeader>

              {bulkError && (
                <div className="my-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Mode switch pills */}
              <div className="my-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setBulkInputTab("file"); setBulkError(null); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      bulkInputTab === "file"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileUp className="h-3.5 w-3.5" /> Upload File (.xlsx, .csv)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBulkInputTab("paste"); setBulkError(null); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      bulkInputTab === "paste"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" /> Paste Text
                  </button>
                </div>

                <button
                  type="button"
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:underline cursor-pointer"
                  title="Download a template CSV format"
                >
                  <Download className="h-3.5 w-3.5" /> Sample CSV
                </button>
              </div>

              {/* File Upload Zone */}
              {bulkInputTab === "file" && (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setBulkFile(e.dataTransfer.files[0]);
                        setBulkError(null);
                      }
                    }}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all text-center",
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border bg-card/60 hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <input
                      type="file"
                      id="bulk-file-upload"
                      accept=".xlsx,.xls,.csv,.tsv,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setBulkFile(e.target.files[0]);
                          setBulkError(null);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                      <Upload className="h-6 w-6" />
                    </div>
                    {bulkFile ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground">{bulkFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(bulkFile.size / 1024).toFixed(1)} KB &middot; Click or drag to replace
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground">
                          Drop your Excel or CSV spreadsheet here, or <span className="text-primary hover:underline">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports .xlsx, .xls, .csv, and tab-separated text (up to 10MB)
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">Expected Column Structure:</p>
                    <p>Column 1: <strong>Category</strong> (e.g. EXCAVATOR, CRANE)</p>
                    <p>Column 2: <strong>Make</strong> (e.g. CATERPILLAR, JCB)</p>
                    <p>Column 3: <strong>Model</strong> (e.g. 320D, 3DX)</p>
                    <p>Column 4: <strong>Specifications</strong> (Optional summary, e.g. 20 MT)</p>
                  </div>
                </div>
              )}

              {/* Paste Text Zone */}
              {bulkInputTab === "paste" && (
                <div className="space-y-2">
                  <textarea
                    rows={8}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`Category, Make, Model, Capacity Specs\nEXCAVATOR, CATERPILLAR, 320D, Operating Weight: 20 MT\nBACKHOE LOADER, JCB, 3DX, Engine: 76 HP\nAIR COMPRESSOR, ATLAS COPCO, XA316, 650 CFM`}
                    className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Paste lines separated by commas or tabs. If headers are present on the first row, they will be automatically detected.
                  </p>
                </div>
              )}

              <DialogFooter className="mt-5">
                <button
                  type="button"
                  onClick={resetBulkState}
                  className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={analyzeFileMutation.isPending || analyzeTextMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {(analyzeFileMutation.isPending || analyzeTextMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Analyze & Preview Changes
                </button>
              </DialogFooter>
            </form>
          )}

          {/* ── STEP 2: PREVIEW & CONFIRMATION STEP ──────────────────── */}
          {bulkStep === "preview" && bulkAnalysis && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Database className="h-5 w-5 text-primary" />
                  Review & Confirm Catalog Update
                </DialogTitle>
                <DialogDescription>
                  {bulkAnalysis.filename ? (
                    <>Analysis for file <span className="font-semibold text-foreground">{bulkAnalysis.filename}</span>.</>
                  ) : (
                    "Analysis of pasted equipment data."
                  )}{" "}
                  Review new additions and ignored duplicates before confirming.
                </DialogDescription>
              </DialogHeader>

              {bulkError && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Metrics Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-card/60 p-3.5 space-y-1">
                  <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Total in File</p>
                  <p className="text-2xl font-bold text-foreground">{bulkAnalysis.total_rows}</p>
                  <p className="text-[11px] text-muted-foreground">Rows processed</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 space-y-1">
                  <p className="text-xs uppercase font-medium text-emerald-700 dark:text-emerald-400 tracking-wider">New to Add</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{bulkAnalysis.new_count}</p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">Will be created in catalog</p>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-xs uppercase font-medium text-amber-700 dark:text-amber-400 tracking-wider">Already in Catalog</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bulkAnalysis.existing_count}</p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Will be safely ignored</p>
                </div>
              </div>

              {/* Status Note Banner */}
              {bulkAnalysis.new_count > 0 ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Ready to update: </span>
                    {bulkAnalysis.new_count} new machines will be added to the master list. {bulkAnalysis.existing_count > 0 && `${bulkAnalysis.existing_count} existing machines were found in your file and will be ignored.`}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">All machines already exist: </span>
                    Every machine listed in this file is already present in your master catalog. No new entries need to be added.
                  </div>
                </div>
              )}

              {/* Preview Subtabs */}
              <div className="border border-border rounded-2xl overflow-hidden bg-card/60">
                <div className="flex items-center border-b border-border bg-muted/40 p-1.5 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("new")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer",
                      previewTab === "new"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    New Machines ({bulkAnalysis.new_count})
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewTab("existing")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer",
                      previewTab === "existing"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Already Existing ({bulkAnalysis.existing_count})
                  </button>
                </div>

                {/* Table View */}
                <div className="max-h-56 overflow-y-auto p-2">
                  {previewTab === "new" && (
                    bulkAnalysis.new_items.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead className="text-[11px] uppercase text-muted-foreground sticky top-0 bg-card">
                          <tr className="border-b border-border/50">
                            <th className="py-1.5 px-2">Category</th>
                            <th className="py-1.5 px-2">Make</th>
                            <th className="py-1.5 px-2">Model</th>
                            <th className="py-1.5 px-2">Specs</th>
                            <th className="py-1.5 px-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {bulkAnalysis.new_items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="py-1.5 px-2 font-medium">{it.category_name}</td>
                              <td className="py-1.5 px-2">{it.make}</td>
                              <td className="py-1.5 px-2 font-semibold text-foreground">{it.model}</td>
                              <td className="py-1.5 px-2 text-muted-foreground truncate max-w-[150px]">{it.capacity_specs || "—"}</td>
                              <td className="py-1.5 px-2 text-right">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Will Add
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        No new machines to add. All rows in file already exist in the catalog.
                      </p>
                    )
                  )}

                  {previewTab === "existing" && (
                    bulkAnalysis.existing_items.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead className="text-[11px] uppercase text-muted-foreground sticky top-0 bg-card">
                          <tr className="border-b border-border/50">
                            <th className="py-1.5 px-2">Category</th>
                            <th className="py-1.5 px-2">Make</th>
                            <th className="py-1.5 px-2">Model</th>
                            <th className="py-1.5 px-2">Specs</th>
                            <th className="py-1.5 px-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {bulkAnalysis.existing_items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 opacity-75">
                              <td className="py-1.5 px-2">{it.category_name}</td>
                              <td className="py-1.5 px-2">{it.make}</td>
                              <td className="py-1.5 px-2 font-medium text-foreground">{it.model}</td>
                              <td className="py-1.5 px-2 text-muted-foreground truncate max-w-[150px]">{it.capacity_specs || "—"}</td>
                              <td className="py-1.5 px-2 text-right">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Ignored / Duplicate
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        None of the items in this file currently exist in the catalog. All items are brand new!
                      </p>
                    )
                  )}
                </div>
              </div>

              <DialogFooter className="mt-5 gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={() => setBulkStep("input")}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Change File
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCommit}
                  disabled={bulkAnalysis.new_count === 0 || bulkCommitMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {bulkCommitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm & Add {bulkAnalysis.new_count} New {bulkAnalysis.new_count === 1 ? "Machine" : "Machines"}
                </button>
              </DialogFooter>
            </div>
          )}

          {/* ── STEP 3: POST-UPLOAD SUMMARY STEP ───────────────────── */}
          {bulkStep === "summary" && bulkResult && (
            <div className="space-y-5 text-center py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/5">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Master Catalog Updated!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {bulkResult.message}
                </p>
              </div>

              {/* Summary Scoreboard */}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                    New Added
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    +{bulkResult.added}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                    Machines added to list
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
                    Duplicates Ignored
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {bulkResult.skipped}
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    Existing records preserved
                  </p>
                </div>
              </div>

              {/* Scrollable list of added items */}
              {bulkResult.added_items && bulkResult.added_items.length > 0 && (
                <div className="text-left rounded-xl border border-border bg-card/60 p-3 max-w-lg mx-auto">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Newly Added Machines ({bulkResult.added_items.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs pr-1">
                    {bulkResult.added_items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                        <span className="font-semibold text-foreground">{it.make} {it.model}</span>
                        <span className="text-[11px] text-muted-foreground">{it.category_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 sm:justify-center">
                <button
                  type="button"
                  onClick={resetBulkState}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Done & View Catalog
                </button>
              </DialogFooter>
            </div>
          )}
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Category / Equipment Type *</label>
                  <span className="text-[10px] text-muted-foreground font-normal">Auto-syncs to category list</span>
                </div>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                  list="available-categories-list"
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Select existing or type a new category. Any new category will automatically appear in the category list.
                </p>
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
