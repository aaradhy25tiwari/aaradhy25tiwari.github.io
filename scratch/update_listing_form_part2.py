import re

file_path = r"infraquip-frontend/components/dashboard/ListingForm.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state variables inside ListingForm component
state_anchor = "  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);"

new_state = """  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── RTO & Serial Plate State ──
  const [rtoError, setRtoError] = useState<string | null>(null);
  const [isUploadingPlate, setIsUploadingPlate] = useState(false);
  const [plateUploadError, setPlateUploadError] = useState<string | null>(null);

  // ── Term Sheet State ──
  const [rentalTerms, setRentalTerms] = useState<RentalTermSheet>(
    (machine?.rental_term_sheet as RentalTermSheet) || DEFAULT_RENTAL_TERMS
  );
  const [saleTerms, setSaleTerms] = useState<SaleTermSheet>(
    (machine?.sale_term_sheet as SaleTermSheet) || DEFAULT_SALE_TERMS
  );
  const [previousListingsTerms, setPreviousListingsTerms] = useState<any[]>([]);
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  // Fetch previous terms when step 4 is active
  useEffect(() => {
    if (step === 4) {
      apiClient.get<any[]>("/vendor/listings-previous-terms")
        .then((r) => setPreviousListingsTerms(r.data || []))
        .catch(() => {});
    }
  }, [step]);

  const handleSerialPlateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPlate(true);
    setPlateUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await apiClient.post<{ storage_path: string; url: string }>("/vendor/upload-serial-plate", fd);
      setValue("serial_plate_photo_url", data.url, { shouldValidate: true, shouldDirty: true });
      if (rtoError) setRtoError(null);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to upload nameplate photo.";
      setPlateUploadError(msg);
    } finally {
      setIsUploadingPlate(false);
    }
  };

  const handleSaveTermSheetAndFinish = async () => {
    const targetId = savedId || machine?.id;
    if (!targetId) return;
    setIsSavingTerms(true);
    setServerError(null);
    try {
      const hasCustom = Boolean(rentalTerms?.special_terms?.trim() || saleTerms?.special_terms?.trim());
      await apiClient.put(`/vendor/listings/${targetId}`, {
        rental_term_sheet: rentalTerms,
        sale_term_sheet: saleTerms,
        has_custom_terms: hasCustom,
      });
      await queryClient.invalidateQueries({ queryKey: ["vendor-listing", targetId] });
      await queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
      setDone(true);
      scrollToTop();
      setTimeout(() => router.push("/dashboard/vendor/listings"), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to save term sheet.";
      setServerError(msg);
      scrollToTop();
    } finally {
      setIsSavingTerms(false);
    }
  };"""

content = content.replace(state_anchor, new_state, 1)

# 2. Add validation in nextStep for Step 0
old_next_step_0 = """    // Validate Step 0 fields
    if (step === 0) {
      const valid = await trigger(stepFields[0]);
      if (!valid) return;
    }"""

new_next_step_0 = """    // Validate Step 0 fields
    if (step === 0) {
      const valid = await trigger(stepFields[0]);
      if (!valid) return;

      const isRto = watch("is_rto_registered");
      if (isRto) {
        const reg = watch("registration_number");
        if (!reg || reg.trim().length < 3) {
          setRtoError("Registration number is required for RTO registered equipment.");
          return;
        }
      } else {
        const sr = watch("machine_serial_no");
        if (!sr || sr.trim().length < 3) {
          setRtoError("Machine serial number is required for non-registrable equipment.");
          return;
        }
        const plate = watch("serial_plate_photo_url");
        if (!plate) {
          setRtoError("Serial number plate photo is mandatory for machine age validation.");
          return;
        }
      }
      setRtoError(null);
    }"""

content = content.replace(old_next_step_0, new_next_step_0, 1)

# 3. Add cleanPayload additions in onSubmit
old_payload_assign = """      if (isEditing && machine) {"""

new_payload_assign = """      cleanPayload.is_rto_registered = watch("is_rto_registered");
      cleanPayload.registration_number = watch("registration_number") || null;
      cleanPayload.chassis_number = watch("chassis_number") || null;
      cleanPayload.machine_serial_no = watch("machine_serial_no") || null;
      cleanPayload.serial_plate_photo_url = watch("serial_plate_photo_url") || null;
      cleanPayload.rental_term_sheet = rentalTerms;
      cleanPayload.sale_term_sheet = saleTerms;
      cleanPayload.has_custom_terms = Boolean(rentalTerms?.special_terms?.trim() || saleTerms?.special_terms?.trim());

      if (isEditing && machine) {"""

content = content.replace(old_payload_assign, new_payload_assign, 1)

# 4. Insert RTO & Identification Section in Step 0 before Description
old_description_field = """              {/* Description spanning full width below 2-column grid */}
              <Field label="Description *" error={errors.description?.message} hint="Describe machine condition, working hours, attachments included.">"""

rto_section = """              {/* ── RTO Registration & Age Validation ── */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Registration & Machine Identification (Age Validation)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Specify whether this equipment is road/commercial RTO registered or off-road plant & machinery.
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Required for Verification
                  </span>
                </div>

                {/* Radio selection */}
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setValue("is_rto_registered", true, { shouldValidate: true, shouldDirty: true });
                      setRtoError(null);
                    }}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                      watch("is_rto_registered")
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-background hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      className="mt-0.5 text-primary focus:ring-primary"
                      checked={Boolean(watch("is_rto_registered"))}
                      onChange={() => setValue("is_rto_registered", true)}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">RTO Registered</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Commercial or road-registered vehicles (Cranes, Excavators, Tippers, Transit Mixers, etc.)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setValue("is_rto_registered", false, { shouldValidate: true, shouldDirty: true });
                      setRtoError(null);
                    }}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                      !watch("is_rto_registered")
                        ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/30"
                        : "border-border bg-background hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                      checked={!watch("is_rto_registered")}
                      onChange={() => setValue("is_rto_registered", false)}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">Non-Registrable Heavy Equipment</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Off-road plant & machinery (DG Sets, Compactors, Concrete Pumps, Piling Rigs, etc.)
                      </p>
                    </div>
                  </button>
                </div>

                {/* Conditional Inputs */}
                {watch("is_rto_registered") ? (
                  <div className="grid gap-4 sm:grid-cols-2 pt-2 animate-in fade-in duration-200">
                    <Field
                      label="Vehicle Registration Number *"
                      hint="e.g. MH 12 AB 1234 (Masked for customer privacy on public search)"
                      error={rtoError && !watch("registration_number") ? rtoError : undefined}
                    >
                      <Input
                        placeholder="e.g. MH 12 AB 1234"
                        value={watch("registration_number") || ""}
                        onChange={(e) => {
                          setValue("registration_number", e.target.value.toUpperCase(), { shouldValidate: true, shouldDirty: true });
                          if (rtoError) setRtoError(null);
                        }}
                      />
                    </Field>
                    <Field
                      label="Chassis Number / VIN"
                      hint="17-character chassis number for RTO database cross-check"
                    >
                      <Input
                        placeholder="e.g. MAT1234567890ABCD"
                        value={watch("chassis_number") || ""}
                        onChange={(e) => setValue("chassis_number", e.target.value.toUpperCase(), { shouldValidate: true, shouldDirty: true })}
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                    <Field
                      label="Machine Serial Number (Chassis / Body Sr No) *"
                      hint="Stamped on metal body / nameplate (e.g. CAT0320DHKL12345)"
                      error={rtoError && !watch("machine_serial_no") ? rtoError : undefined}
                    >
                      <Input
                        placeholder="e.g. CAT0320DHKL12345"
                        value={watch("machine_serial_no") || ""}
                        onChange={(e) => {
                          setValue("machine_serial_no", e.target.value.toUpperCase(), { shouldValidate: true, shouldDirty: true });
                          if (rtoError) setRtoError(null);
                        }}
                      />
                    </Field>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center justify-between">
                        <span>Serial Number Plate / Nameplate Photo *</span>
                        <span className="text-[11px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">
                          🔒 Only for Admin View — Machine Age Validation
                        </span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Upload a clear close-up photo of the metal specification / serial plate showing the Year of Manufacture. This photo is completely confidential and strictly used by platform administrators to validate machine age.
                      </p>

                      {watch("serial_plate_photo_url") ? (
                        <div className="flex items-center gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
                          <img
                            src={watch("serial_plate_photo_url") || ""}
                            alt="Serial Plate Preview"
                            className="h-16 w-24 object-cover rounded-lg border border-border bg-black/40"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Nameplate photo attached
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              Securely stored for administrator age review.
                            </p>
                          </div>
                          <label className="text-xs font-medium text-primary hover:underline cursor-pointer">
                            Replace Photo
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={handleSerialPlateUpload}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-center">
                          {isUploadingPlate ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <p className="text-xs font-medium text-muted-foreground">Uploading nameplate photo securely...</p>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center cursor-pointer gap-2">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Upload className="h-5 w-5" />
                              </div>
                              <span className="text-xs font-semibold text-foreground">
                                Click to upload Serial Number Plate photo
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                PNG, JPG or WebP up to 10MB
                              </span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleSerialPlateUpload}
                              />
                            </label>
                          )}
                        </div>
                      )}
                      {plateUploadError && (
                        <p className="text-xs text-destructive">{plateUploadError}</p>
                      )}
                      {rtoError && !watch("serial_plate_photo_url") && (
                        <p className="text-xs text-destructive">{rtoError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Description spanning full width below 2-column grid */}
              <Field label="Description *" error={errors.description?.message} hint="Describe machine condition, working hours, attachments included.">"""

content = content.replace(old_description_field, rto_section, 1)

# 5. Add Step 4 (Term Sheet) after Step 3
old_step_3_end = """              )}
            </div>
          )}

          {/* ── Error ────────────────────────────────────────── */}"""

new_step_3_and_4 = """              )}
            </div>
          )}

          {/* ── Step 4: Term Sheet ───────────────────────────── */}
          {step === 4 && (
            <TermSheetFormStep
              listingType={watch("listing_type")}
              rentalTerms={rentalTerms}
              setRentalTerms={setRentalTerms}
              saleTerms={saleTerms}
              setSaleTerms={setSaleTerms}
              previousListings={previousListingsTerms}
            />
          )}

          {/* ── Error ────────────────────────────────────────── */}"""

content = content.replace(old_step_3_end, new_step_3_and_4, 1)

# 6. Update navigation buttons for step 3 and step 4
old_nav_buttons_step_3 = """              {step === 3 && (
                <Button
                  type="button"
                  className="btn-amber-glow gap-2 cursor-pointer"
                  onClick={async () => {
                    await queryClient.invalidateQueries({ queryKey: ["vendor-listing", machine?.id || savedId] });
                    await queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
                    setDone(true);
                    setTimeout(() => router.push("/dashboard/vendor/listings"), 1500);
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  {isEditing ? "Done (Back to Listings)" : "Submit Listing"}
                </Button>
              )}"""

new_nav_buttons_step_3_and_4 = """              {step === 3 && (
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => {
                        setDone(true);
                        setTimeout(() => router.push("/dashboard/vendor/listings"), 1500);
                      }}
                    >
                      Save & Exit
                    </Button>
                  )}
                  <Button
                    type="button"
                    className="btn-amber-glow gap-2 cursor-pointer"
                    onClick={() => {
                      setStep(4);
                      scrollToTop();
                    }}
                  >
                    Continue to Term Sheet <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === 4 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    className="btn-amber-glow gap-2 cursor-pointer"
                    disabled={isSavingTerms}
                    onClick={handleSaveTermSheetAndFinish}
                  >
                    {isSavingTerms ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        {isEditing ? "Save & Update Listing" : "Complete & Submit for Review"}
                      </>
                    )}
                  </Button>
                </div>
              )}"""

content = content.replace(old_nav_buttons_step_3, new_nav_buttons_step_3_and_4, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Part 2 of ListingForm updated successfully!")

