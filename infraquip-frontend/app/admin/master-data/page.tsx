"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Plus, Edit2, Trash2, Search, Filter, Database, CheckCircle, AlertCircle, Wrench, X
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

export default function AdminMasterDataPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<MasterCatalogItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MasterCatalogItem | null>(null);

  // Form states
  const [formCategory, setFormCategory] = useState("");
  const [formMake, setFormMake] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch live master catalog
  const { data, isLoading } = useQuery<{ results: MasterCatalogItem[]; total: number }>({
    queryKey: ["admin-master-catalog", search, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      params.set("per_page", "150");
      const res = await apiClient.get(`/admin/master-catalog?${params.toString()}`);
      return res.data;
    },
  });

  const items = data?.results || [];

  // Get unique categories for filtering
  const uniqueCategories = Array.from(
    new Set(items.map((i) => i.category_name).filter(Boolean))
  ).sort();

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { category_name: string; make: string; model: string; capacity_specs?: string }) => {
      const { data } = await apiClient.post("/admin/master-catalog", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to add master catalog item.");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<MasterCatalogItem> }) => {
      const { data } = await apiClient.put(`/admin/master-catalog/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      setEditItem(null);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to update master catalog item.");
    },
  });

  // Delete mutation
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

  const resetForm = () => {
    setFormCategory("");
    setFormMake("");
    setFormModel("");
    setFormCapacity("");
    setFormError(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (item: MasterCatalogItem) => {
    resetForm();
    setFormCategory(item.category_name);
    setFormMake(item.make);
    setFormModel(item.model);
    setFormCapacity(item.capacity_specs || "");
    setEditItem(item);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Database className="h-6 w-6 text-primary" />
            Equipment Master Catalog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage canonical equipment categories, makes, models, and capacity specs. These populate vendor dropdowns platform-wide.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm self-start sm:self-auto cursor-pointer">
          <Plus className="h-4 w-4" /> Add Equipment Master
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by make, model, capacity, or category..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-border bg-card px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="font-semibold text-foreground">No equipment master data found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or add a new entry.</p>
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
                {items.map((item) => (
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
                          onClick={() => openEdit(item)}
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
      </div>

      {/* Add Master Item Modal */}
      <Dialog open={isAddOpen} onOpenChange={(o) => !o && setIsAddOpen(false)}>
        <DialogContent>
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle>Add Equipment Master Entry</DialogTitle>
              <DialogDescription>
                Add a new Make and Model to the platform catalog. Vendors will immediately see this in their listing dropdowns.
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
                  placeholder="e.g. EXCAVATOR, BACKHOE LOADER, AIR COMPRESSOR"
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
                  placeholder="e.g. JCB, CATERPILLAR, VOLVO, SANY"
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
                  placeholder="e.g. 320D, 3CX, SY245C-9LR"
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

      {/* Edit Master Item Modal */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Master Catalog Entry</DialogTitle>
              <DialogDescription>
                Modify details for this equipment make/model. Changes will reflect across all vendor forms.
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

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Master Catalog Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{deleteItem?.make} {deleteItem?.model}</span> from the master catalog? Vendors will no longer see this model in the dropdown list.
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
    </div>
  );
}
