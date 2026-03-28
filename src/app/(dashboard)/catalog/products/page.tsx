"use client";

import { useState } from "react";
import { useProducts, useCreateProduct } from "@/features/catalog/hooks/use-products";
import { useCategories } from "@/features/catalog/hooks/use-categories";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateProductSchema,
  type CreateProductInput,
  type Product,
} from "@/features/catalog/schemas/catalog.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Package, Plus, Search } from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import { AllergenEditor } from "@/features/catalog/components/allergen-editor";
import { ProductAliases } from "@/features/catalog/components/product-aliases";
import { type AllergenKey } from "@/features/catalog/allergen-types";
import { ALLERGENS } from "@/features/catalog/allergen-types";

// Mock allergens for demo — keyed by product ID
const DEMO_ALLERGENS: Record<string, AllergenKey[]> = {
  "30000000-0000-0000-0000-000000000002": ["gluten"],                              // Harina
  "30000000-0000-0000-0000-000000000005": ["pescado"],                             // Salmón
  "30000000-0000-0000-0000-000000000006": ["pescado"],                             // Merluza
  "30000000-0000-0000-0000-000000000009": ["lacteos"],                             // Leche
  "30000000-0000-0000-0000-000000000010": ["lacteos"],                             // Queso
  "30000000-0000-0000-0000-000000000011": ["lacteos"],                             // Mantequilla
  "30000000-0000-0000-0000-000000000015": ["sulfitos"],                            // Vino
};

// ─── Product Detail Sheet ──────────────────────────────────────────────────────

interface ProductDetailSheetProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryName: string | undefined
}

function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  categoryName,
}: ProductDetailSheetProps) {
  if (!product) return null

  const initialAllergens = DEMO_ALLERGENS[product.id] ?? (product.allergens as AllergenKey[])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg">{product.name}</SheetTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant={product.is_active ? "default" : "secondary"}>
              {product.is_active ? "Activo" : "Inactivo"}
            </Badge>
            {categoryName && (
              <Badge variant="outline">{categoryName}</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="px-4 pb-4 space-y-6">
          {product.notes && (
            <p className="text-sm text-muted-foreground">{product.notes}</p>
          )}

          <div className="rounded-lg border p-4 space-y-3">
            <AllergenEditor
              productId={product.id}
              initialAllergens={initialAllergens}
            />
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <ProductAliases productId={product.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Products Page ─────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(CreateProductSchema),
    defaultValues: { name: "", allergens: [] },
  });

  async function onSubmit(data: CreateProductInput) {
    await createProduct.mutateAsync(data);
    setDialogOpen(false);
    form.reset();
  }

  function openProductDetail(product: Product) {
    setSelectedProduct(product);
    setSheetOpen(true);
  }

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground mt-1">
            {products?.length ?? 0} productos en el catálogo
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo producto</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" {...form.register("name")} placeholder="Nombre del producto" />
                {form.formState.errors.name && (
                  <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <select
                  id="category"
                  {...form.register("category_id")}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Input id="notes" {...form.register("notes")} placeholder="Notas opcionales" />
              </div>
              <Button type="submit" className="w-full" disabled={createProduct.isPending}>
                {createProduct.isPending ? "Creando..." : "Crear producto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filteredProducts?.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos"
          description="Agrega productos al catálogo para usarlos en recetas y compras"
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Alérgenos</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts?.map((product) => {
                const demoAllergens = DEMO_ALLERGENS[product.id] ?? (product.allergens as AllergenKey[])
                return (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openProductDetail(product)}
                  >
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {categories?.find((c) => c.id === product.category_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {demoAllergens.length > 0
                        ? demoAllergens.map((a) => {
                            const allergen = ALLERGENS.find((al) => al.key === a)
                            return allergen ? (
                              <span key={a} title={allergen.label} className="mr-1 text-base">
                                {allergen.emoji}
                              </span>
                            ) : (
                              <Badge key={a} variant="outline" className="mr-1">{a}</Badge>
                            )
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductDetailSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        categoryName={
          selectedProduct
            ? categories?.find((c) => c.id === selectedProduct.category_id)?.name
            : undefined
        }
      />
    </div>
  );
}
