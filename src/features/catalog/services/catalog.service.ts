import { createClient } from "@/lib/db/client";
import type {
  CreateProductInput,
  CreateSupplierInput,
  CreateCategoryInput,
  CreateUnitInput,
  CreateOfferInput,
  Product,
  Supplier,
  Category,
  Unit,
  SupplierOffer,
} from "../schemas/catalog.schema";

const supabase = createClient();

export const catalogService = {
  // --- Products ---
  async listProducts(hotelId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("name")
      .limit(500);
    if (error) throw error;
    return data ?? [];
  },

  async createProduct(hotelId: string, input: CreateProductInput) {
    const { data, error } = await supabase.rpc("upsert_product", {
      p_hotel_id: hotelId,
      p_name: input.name,
      p_category_id: input.category_id ?? null,
      p_default_unit_id: input.default_unit_id ?? null,
      p_allergens: input.allergens,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async updateProduct(hotelId: string, productId: string, input: Partial<CreateProductInput>) {
    const { data, error } = await supabase.rpc("upsert_product", {
      p_hotel_id: hotelId,
      p_product_id: productId,
      p_name: input.name ?? null,
      p_category_id: input.category_id ?? null,
      p_default_unit_id: input.default_unit_id ?? null,
      p_allergens: input.allergens ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async searchProducts(hotelId: string, query: string, categoryId?: string) {
    const { data, error } = await supabase.rpc("search_products", {
      p_hotel_id: hotelId,
      p_query: query,
      p_category_id: categoryId ?? null,
    });
    if (error) throw error;
    return data ?? [];
  },

  async getProductWithOffers(hotelId: string, productId: string) {
    const { data, error } = await supabase.rpc("get_product_with_offers", {
      p_hotel_id: hotelId,
      p_product_id: productId,
    });
    if (error) throw error;
    return data;
  },

  // --- Suppliers ---
  async listSuppliers(hotelId: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("name");
    if (error) throw error;
    return data ?? [];
  },

  async createSupplier(hotelId: string, input: CreateSupplierInput) {
    const { data, error } = await supabase.rpc("upsert_supplier", {
      p_hotel_id: hotelId,
      p_name: input.name,
      p_contact_name: input.contact_name ?? null,
      p_email: input.email ?? null,
      p_phone: input.phone ?? null,
      p_address: input.address ?? null,
      p_tax_id: input.tax_id ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async updateSupplier(hotelId: string, supplierId: string, input: Partial<CreateSupplierInput>) {
    const { data, error } = await supabase.rpc("upsert_supplier", {
      p_hotel_id: hotelId,
      p_supplier_id: supplierId,
      p_name: input.name ?? null,
      p_contact_name: input.contact_name ?? null,
      p_email: input.email ?? null,
      p_phone: input.phone ?? null,
      p_address: input.address ?? null,
      p_tax_id: input.tax_id ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  // --- Categories ---
  async listCategories(hotelId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },

  async createCategory(hotelId: string, input: CreateCategoryInput) {
    const { data, error } = await supabase
      .from("categories")
      .insert({ hotel_id: hotelId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCategory(hotelId: string, categoryId: string, input: Partial<CreateCategoryInput>) {
    const { data, error } = await supabase
      .from("categories")
      .update(input)
      .eq("id", categoryId)
      .eq("hotel_id", hotelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Units ---
  async listUnits(hotelId: string): Promise<Unit[]> {
    const { data, error } = await supabase
      .from("units_of_measure")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("unit_type")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },

  async createUnit(hotelId: string, input: CreateUnitInput) {
    const { data, error } = await supabase
      .from("units_of_measure")
      .insert({ hotel_id: hotelId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Offers ---
  async listOffersBySupplier(
    hotelId: string,
    supplierId: string
  ): Promise<(SupplierOffer & { product_name: string; unit_abbreviation: string })[]> {
    const { data, error } = await supabase
      .from("supplier_offers")
      .select("*, products(name), units_of_measure(abbreviation)")
      .eq("hotel_id", hotelId)
      .eq("supplier_id", supplierId)
      .order("is_preferred", { ascending: false })
      .order("price");
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => {
      const { products, units_of_measure, ...rest } = row as Record<string, unknown>;
      return {
        ...rest,
        product_name: (products as { name: string } | null)?.name ?? "Sin nombre",
        unit_abbreviation: (units_of_measure as { abbreviation: string } | null)?.abbreviation ?? "ud",
      } as unknown as SupplierOffer & { product_name: string; unit_abbreviation: string };
    });
  },

  async listOffers(hotelId: string, productId?: string): Promise<SupplierOffer[]> {
    let query = supabase
      .from("supplier_offers")
      .select("*")
      .eq("hotel_id", hotelId);

    if (productId) query = query.eq("product_id", productId);

    const { data, error } = await query.order("is_preferred", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createOffer(hotelId: string, input: CreateOfferInput) {
    const { data, error } = await supabase
      .from("supplier_offers")
      .insert({ hotel_id: hotelId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setPreferredOffer(hotelId: string, offerId: string) {
    const { data, error } = await supabase.rpc("set_preferred_offer", {
      p_hotel_id: hotelId,
      p_offer_id: offerId,
    });
    if (error) throw error;
    return data;
  },
};
