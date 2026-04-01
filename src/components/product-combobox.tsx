"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "@/lib/mock-data";
import { useProducts } from "@/features/catalog/hooks/use-products";
import { useActiveHotel } from "@/lib/auth/hooks";
import { ALLERGENS } from "@/features/catalog/allergen-types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ── Allergen emoji lookup ────────────────────────────────────────────────────
const allergenEmojiMap: Record<string, string> = Object.fromEntries(
  ALLERGENS.map((a) => [a.key, a.emoji])
);

function allergenEmojis(keys: string[]): string {
  return keys.map((k) => allergenEmojiMap[k] ?? "").join("");
}

// ── Props ────────────────────────────────────────────────────────────────────
interface ProductComboboxProps {
  value: string | null; // product_id
  onSelect: (
    product: {
      id: string;
      name: string;
      category: string;
      unit: string;
      allergens: string[];
    } | null
  ) => void;
  placeholder?: string;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export function ProductCombobox({
  value,
  onSelect,
  placeholder = "Buscar producto...",
  className,
}: ProductComboboxProps) {
  const { hotelId } = useActiveHotel();
  const { data: remoteProducts } = useProducts();

  // Choose data source: remote when hotelId exists, otherwise mock
  const products = useMemo(() => {
    if (hotelId && remoteProducts) return remoteProducts;
    return MOCK_PRODUCTS;
  }, [hotelId, remoteProducts]);

  // Category name map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    MOCK_CATEGORIES.forEach((c) => map.set(c.id, c.name));
    return map;
  }, []);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selectedProduct = useMemo(() => {
    if (!value) return null;
    const found = products.find((p) => p.id === value);
    if (!found) return null;

    return {
      id: found.id,
      name: found.name,
      category: found.category_id
        ? categoryMap.get(found.category_id) ?? ""
        : "",
      unit: found.default_unit_id ?? "",
      allergens: found.allergens,
    };
  }, [value, products, categoryMap]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? products.filter(
          (p) =>
            p.is_active && p.name.toLowerCase().includes(q)
        )
      : products.filter((p) => p.is_active);
    return list.slice(0, 10);
  }, [query, products]);

  const handleSelect = useCallback(
    (product: (typeof products)[number]) => {
      const result = {
        id: product.id,
        name: product.name,
        category: product.category_id
          ? categoryMap.get(product.category_id) ?? ""
          : "",
        unit: product.default_unit_id ?? "",
        allergens: product.allergens,
      };
      setQuery("");
      setOpen(false);
      onSelect(result);
    },
    [categoryMap, onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onSelect(null);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleBlur = useCallback(() => {
    // Small delay so click events on dropdown items fire first
    blurTimeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (!selectedProduct) setOpen(true);
  }, [selectedProduct]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* ── Selected state ──────────────────────────────────────────────── */}
      {selectedProduct ? (
        <div className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
          <span className="truncate font-semibold">
            {selectedProduct.name}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Borrar seleccion"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* ── Search input ──────────────────────────────────────────────── */
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
      )}

      {/* ── Dropdown ───────────────────────────────────────────────────── */}
      {open && !selectedProduct && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover text-popover-foreground shadow-md">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Sin resultados
            </li>
          ) : (
            filtered.map((product) => (
              <li
                key={product.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(product);
                }}
                className="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-accent"
              >
                <div className="flex flex-col truncate">
                  <span className="truncate font-medium">{product.name}</span>
                  {product.category_id && (
                    <span className="truncate text-xs text-muted-foreground">
                      {categoryMap.get(product.category_id) ?? ""}
                    </span>
                  )}
                </div>
                {product.allergens.length > 0 && (
                  <span
                    className="shrink-0 text-sm"
                    title={product.allergens.join(", ")}
                  >
                    {allergenEmojis(product.allergens)}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
