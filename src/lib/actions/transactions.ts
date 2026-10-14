"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { categoryKindFor, signedCents } from "@/lib/transactions";
import { idSchema, toFieldErrors, transactionFormSchema } from "@/lib/validation";
import { authedClient, formValues, toBaseAmount, type ActionState } from "./shared";

export async function saveTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = transactionFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const id = values.id ? idSchema.safeParse(values.id) : null;
  if (id && !id.success) return { error: "invalid" };

  const v = parsed.data;
  const supabase = await authedClient();

  // The category must match the transaction type; transfers have none.
  const expectedKind = categoryKindFor(v.type);
  let categoryId = expectedKind ? v.category_id : null;
  if (categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("kind")
      .eq("id", categoryId)
      .maybeSingle();
    if (!category || category.kind !== expectedKind) {
      return { fieldErrors: { category_id: "categoryMismatch" } };
    }
  } else {
    categoryId = null;
  }

  // Amount as entered (in v.currency) → EUR at the rate of the transaction date.
  const original = signedCents(v.type, v.amount, v.direction);
  const money = await toBaseAmount(original, v.currency, v.date, v.fx_rate);
  if (!money) return { fieldErrors: { fx_rate: "rateUnavailable" } };

  const row = {
    date: v.date,
    ...money,
    description: v.description,
    merchant: v.merchant,
    category_id: categoryId,
    account_id: v.account_id,
    savings_goal_id: v.type === "savings" ? v.savings_goal_id : null,
    is_transfer: v.type === "transfer",
    note: v.note,
  };

  const { error } = id
    ? await supabase.from("transactions").update(row).eq("id", id.data)
    : await supabase.from("transactions").insert({ ...row, source: "manual" });

  if (error) return { error: "saveFailed" };

  revalidatePath("/", "layout");
  redirect("/transactions");
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { error: "invalid" };

  const supabase = await authedClient();
  const { error } = await supabase.from("transactions").delete().eq("id", parsed.data);
  if (error) return { error: "deleteFailed" };

  revalidatePath("/", "layout");
  redirect("/transactions");
}

const bulkIdsSchema = z.array(idSchema).min(1).max(1000);

export async function deleteTransactions(ids: string[]): Promise<ActionState> {
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) return { error: "invalid" };

  const supabase = await authedClient();
  const { error } = await supabase.from("transactions").delete().in("id", parsed.data);
  if (error) return { error: "deleteFailed" };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Inline category edit from the list. "" = no category, "transfer" = mark as transfer. */
export async function updateTransactionCategory(id: string, value: string): Promise<ActionState> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "invalid" };

  const supabase = await authedClient();
  let patch: { category_id: string | null; is_transfer: boolean };
  if (value === "transfer") patch = { category_id: null, is_transfer: true };
  else if (value === "") patch = { category_id: null, is_transfer: false };
  else {
    const parsedCategory = idSchema.safeParse(value);
    if (!parsedCategory.success) return { error: "invalid" };
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", parsedCategory.data)
      .maybeSingle();
    if (!category) return { error: "invalid" };
    patch = { category_id: category.id, is_transfer: false };
  }

  const { error } = await supabase.from("transactions").update(patch).eq("id", parsedId.data);
  if (error) return { error: "saveFailed" };
  revalidatePath("/", "layout");
  return { ok: true };
}
