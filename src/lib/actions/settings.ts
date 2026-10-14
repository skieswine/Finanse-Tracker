"use server";

import { revalidatePath } from "next/cache";
import { monthStart } from "@/lib/dates";
import { fromCents } from "@/lib/money";
import {
  accountFormSchema,
  budgetFormSchema,
  categoryFormSchema,
  goalFormSchema,
  idSchema,
  toFieldErrors,
} from "@/lib/validation";
import {
  authedClient,
  formValues,
  isUniqueViolation,
  type ActionState,
} from "./shared";

// CRUD for categories, accounts, savings goals and budgets.
// Forms live in dialogs, so save actions return { ok: true } instead of redirecting.

type Table = "categories" | "accounts" | "savings_goals" | "budgets";

function parseId(values: Record<string, string>) {
  if (!values.id) return { id: null };
  const parsed = idSchema.safeParse(values.id);
  return parsed.success ? { id: parsed.data } : { invalid: true as const };
}

function done(): ActionState {
  revalidatePath("/", "layout");
  return { ok: true };
}

async function remove(table: Table, id: string): Promise<ActionState> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { error: "invalid" };
  const supabase = await authedClient();
  const { error } = await supabase.from(table).delete().eq("id", parsed.data);
  if (error) return { error: "deleteFailed" };
  return done();
}

// ---------- Categories ----------

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = categoryFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const ref = parseId(values);
  if ("invalid" in ref) return { error: "invalid" };

  const supabase = await authedClient();
  const { error } = ref.id
    ? await supabase.from("categories").update(parsed.data).eq("id", ref.id)
    : await supabase.from("categories").insert(parsed.data);

  if (isUniqueViolation(error)) return { fieldErrors: { name: "duplicate" } };
  if (error) return { error: "saveFailed" };
  return done();
}

export async function deleteCategory(id: string) {
  return remove("categories", id);
}

// ---------- Accounts ----------

export async function saveAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = accountFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const ref = parseId(values);
  if ("invalid" in ref) return { error: "invalid" };

  const supabase = await authedClient();
  const { error } = ref.id
    ? await supabase.from("accounts").update(parsed.data).eq("id", ref.id)
    : await supabase.from("accounts").insert(parsed.data);

  if (isUniqueViolation(error)) return { fieldErrors: { name: "duplicate" } };
  if (error) return { error: "saveFailed" };
  return done();
}

export async function deleteAccount(id: string) {
  return remove("accounts", id);
}

// ---------- Savings goals ----------

export async function saveGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = goalFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const ref = parseId(values);
  if ("invalid" in ref) return { error: "invalid" };

  const row = {
    name: parsed.data.name,
    target: fromCents(parsed.data.target),
    deadline: parsed.data.deadline,
  };

  const supabase = await authedClient();
  const { error } = ref.id
    ? await supabase.from("savings_goals").update(row).eq("id", ref.id)
    : await supabase.from("savings_goals").insert(row);

  if (error) return { error: "saveFailed" };
  return done();
}

export async function deleteGoal(id: string) {
  return remove("savings_goals", id);
}

// ---------- Budgets ----------

export async function saveBudget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = budgetFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await authedClient();
  const { data: category } = await supabase
    .from("categories")
    .select("kind")
    .eq("id", parsed.data.category_id)
    .maybeSingle();
  if (category?.kind !== "expense") {
    return { fieldErrors: { category_id: "categoryMismatch" } };
  }

  // One budget per category and month: saving again updates the limit.
  const { error } = await supabase.from("budgets").upsert(
    {
      category_id: parsed.data.category_id,
      month: monthStart(parsed.data.month),
      limit_amount: fromCents(parsed.data.limit),
    },
    { onConflict: "user_id,category_id,month" },
  );

  if (error) return { error: "saveFailed" };
  return done();
}

export async function deleteBudget(id: string) {
  return remove("budgets", id);
}
