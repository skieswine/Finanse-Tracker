"use server";

import { revalidatePath } from "next/cache";
import { fromCents, toCents } from "@/lib/money";
import {
  duplicateCheckSchema,
  idSchema,
  importBatchSchema,
  ruleFormSchema,
  type ImportBatchInput,
} from "@/lib/validation";
import { authedClient, type ActionState } from "./shared";

// Only extracted transactions reach the server — never the raw file.

export type DuplicateInfo = {
  /** dedupe_hash values that already exist (previous imports). */
  existingHashes: string[];
  /** "YYYY-MM-DD|cents" of all transactions in range — possible duplicates
   *  (manual entries, or imports made before a parser change altered the hash). */
  sameDayAmountKeys: string[];
};

export async function checkDuplicates(input: {
  hashes: string[];
  from: string;
  to: string;
}): Promise<DuplicateInfo> {
  const parsed = duplicateCheckSchema.safeParse(input);
  if (!parsed.success) return { existingHashes: [], sameDayAmountKeys: [] };
  const { hashes, from, to } = parsed.data;
  const supabase = await authedClient();

  const existing = new Set<string>();
  // Keep URLs short: query hashes in chunks.
  for (let i = 0; i < hashes.length; i += 200) {
    const { data } = await supabase
      .from("transactions")
      .select("dedupe_hash")
      .in("dedupe_hash", hashes.slice(i, i + 200));
    data?.forEach((r) => r.dedupe_hash && existing.add(r.dedupe_hash));
  }

  const { data: inRange } = await supabase
    .from("transactions")
    .select("date, amount")
    .gte("date", from)
    .lte("date", to);

  return {
    existingHashes: [...existing],
    sameDayAmountKeys: (inRange ?? []).map((r) => `${r.date}|${toCents(r.amount)}`),
  };
}

export type ImportResult = { ok: true; count: number } | { ok: false; error: "invalid" | "saveFailed" };

export async function importTransactions(input: ImportBatchInput): Promise<ImportResult> {
  const parsed = importBatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { rows, ...meta } = parsed.data;
  const supabase = await authedClient();

  // Drop references to categories/accounts that aren't the user's (RLS hides them).
  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from("categories").select("id"),
    supabase.from("accounts").select("id"),
  ]);
  const categoryIds = new Set((categories ?? []).map((c) => c.id));
  const accountId = meta.account_id && accounts?.some((a) => a.id === meta.account_id) ? meta.account_id : null;

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      file_name: meta.file_name,
      file_type: meta.file_type,
      parser_id: meta.parser_id,
      row_count: rows.length,
    })
    .select("id")
    .single();
  if (batchError || !batch) return { ok: false, error: "saveFailed" };

  const records = rows.map((r) => ({
    date: r.date,
    amount: fromCents(r.amount_cents),
    description: r.description,
    merchant: r.merchant,
    category_id: !r.is_transfer && r.category_id && categoryIds.has(r.category_id) ? r.category_id : null,
    account_id: accountId,
    is_transfer: r.is_transfer,
    source: "import" as const,
    import_batch_id: batch.id,
    dedupe_hash: r.dedupe_hash,
  }));

  for (let i = 0; i < records.length; i += 500) {
    const { error } = await supabase.from("transactions").insert(records.slice(i, i + 500));
    if (error) {
      // No multi-statement transactions over PostgREST: undo what was written.
      await supabase.from("transactions").delete().eq("import_batch_id", batch.id);
      await supabase.from("import_batches").delete().eq("id", batch.id);
      return { ok: false, error: "saveFailed" };
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, count: records.length };
}

export type CreatedRule = {
  id: string;
  pattern: string;
  field: "description" | "merchant";
  category_id: string;
  priority: number;
};

export async function createRule(input: {
  pattern: string;
  field: "description" | "merchant";
  category_id: string;
}): Promise<{ ok: true; rule: CreatedRule } | { ok: false; error: NonNullable<ActionState["error"]> }> {
  const parsed = ruleFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await authedClient();
  const { data, error } = await supabase
    .from("category_rules")
    .insert(parsed.data)
    .select("id, pattern, field, category_id, priority")
    .single();
  if (error || !data) return { ok: false, error: "saveFailed" };
  revalidatePath("/import");
  return { ok: true, rule: data };
}

/** Undo an import: delete its transactions, then the batch record. */
export async function deleteImportBatch(id: string): Promise<ActionState> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { error: "invalid" };
  const supabase = await authedClient();

  const { error: txError } = await supabase.from("transactions").delete().eq("import_batch_id", parsed.data);
  if (txError) return { error: "deleteFailed" };
  const { error } = await supabase.from("import_batches").delete().eq("id", parsed.data);
  if (error) return { error: "deleteFailed" };

  revalidatePath("/", "layout");
  return { ok: true };
}
