import { z } from "zod";
import { isISODate, isMonthKey } from "./dates";
import { parseAmountToCents } from "./money";
import type { Dictionary } from "./i18n/types";
import { CURRENCIES } from "./currency";

/** Error messages are dictionary keys, translated in the UI. */
export type ValidationKey = keyof Dictionary["validation"];

const err = (key: ValidationKey) => ({ error: key });

/** "" / null → null, so optional selects can be submitted empty. */
const optionalId = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.uuid(err("invalid")).nullable(),
);

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max, err("tooLong")).nullable().optional(),
  ).transform((v) => v ?? null);

/** Positive amount typed by the user ("12,50") → integer cents. */
const positiveCents = z
  .string(err("required"))
  .trim()
  .min(1, err("required"))
  .transform((v, ctx) => {
    const cents = parseAmountToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "amountInvalid" satisfies ValidationKey });
      return z.NEVER;
    }
    if (cents <= 0) {
      ctx.addIssue({ code: "custom", message: "amountPositive" satisfies ValidationKey });
      return z.NEVER;
    }
    if (cents >= 1_000_000_000_00) {
      ctx.addIssue({ code: "custom", message: "amountTooLarge" satisfies ValidationKey });
      return z.NEVER;
    }
    return cents;
  });

const isoDate = z
  .string(err("required"))
  .refine(isISODate, err("dateInvalid"));

const name = (max: number) =>
  z.string(err("required")).trim().min(1, err("required")).max(max, err("tooLong"));

// ---------- Transactions ----------

export const TX_TYPES = ["expense", "income", "savings", "transfer"] as const;
export type TxType = (typeof TX_TYPES)[number];

/** "49,58" / "49.5794" → 49.58; "" → null (fetch the rate automatically). */
const optionalRate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .trim()
    .regex(/^\d{1,7}([.,]\d{1,8})?$/, err("rateInvalid"))
    .transform((v) => Number(v.replace(",", ".")))
    .refine((v) => v > 0, err("rateInvalid"))
    .nullable()
    .optional(),
).transform((v) => v ?? null);

export const transactionFormSchema = z.object({
  type: z.enum(TX_TYPES, err("invalid")),
  amount: positiveCents,
  date: isoDate,
  description: z.string().trim().max(500, err("tooLong")).default(""),
  merchant: optionalText(200),
  category_id: optionalId,
  account_id: optionalId,
  savings_goal_id: optionalId,
  direction: z.enum(["out", "in"]).default("out"),
  note: optionalText(1000),
  currency: z.enum(CURRENCIES, err("invalid")).default("EUR"),
  /** Optional manual rate (units per 1 EUR); empty = fetch automatically. */
  fx_rate: optionalRate,
});
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

// ---------- Categories ----------

export const CATEGORY_KINDS = ["expense", "income", "savings"] as const;

export const categoryFormSchema = z.object({
  name: name(60),
  kind: z.enum(CATEGORY_KINDS, err("invalid")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, err("colorInvalid")),
  icon: z.string().trim().min(1, err("required")).max(40, err("tooLong")),
});

// ---------- Accounts ----------

export const ACCOUNT_TYPES = ["checking", "savings", "cash", "credit"] as const;

export const accountFormSchema = z.object({
  name: name(100),
  type: z.enum(ACCOUNT_TYPES, err("invalid")),
  currency: z.enum(CURRENCIES, err("invalid")).default("EUR"),
});

// ---------- Savings goals ----------

export const goalFormSchema = z.object({
  name: name(100),
  target: positiveCents,
  deadline: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    isoDate.nullable(),
  ),
});

// ---------- Budgets ----------

export const budgetFormSchema = z.object({
  category_id: z.uuid(err("required")),
  month: z.string().refine(isMonthKey, err("invalid")),
  limit: positiveCents,
});

// ---------- Shared ----------

export const idSchema = z.uuid();

export type FieldErrors = Partial<Record<string, ValidationKey>>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message as ValidationKey;
  }
  return out;
}

// ---------- Import ----------

export const MAX_IMPORT_ROWS = 2000;

export const importRowSchema = z.object({
  date: isoDate,
  amount_cents: z.number().int().refine((v) => v !== 0 && Math.abs(v) < 1_000_000_000_00, err("amountInvalid")),
  description: z.string().trim().max(500, err("tooLong")),
  merchant: z.string().trim().max(200, err("tooLong")).nullable(),
  category_id: z.uuid().nullable(),
  is_transfer: z.boolean(),
  dedupe_hash: z.string().regex(/^[0-9a-f]{64}$/),
});

export const importBatchSchema = z.object({
  file_name: z.string().trim().min(1).max(200),
  file_type: z.enum(["csv", "pdf", "docx", "image"]),
  parser_id: z.string().min(1).max(50),
  account_id: z.uuid().nullable(),
  /** Currency of the amounts in `rows` (the account's currency). */
  currency: z.enum(CURRENCIES).default("EUR"),
  rows: z.array(importRowSchema).min(1).max(MAX_IMPORT_ROWS),
});
export type ImportBatchInput = z.infer<typeof importBatchSchema>;

export const duplicateCheckSchema = z.object({
  hashes: z.array(z.string().regex(/^[0-9a-f]{64}$/)).max(MAX_IMPORT_ROWS),
  from: isoDate,
  to: isoDate,
});

export const ruleFormSchema = z.object({
  pattern: z.string().trim().min(2, err("required")).max(200, err("tooLong")),
  field: z.enum(["description", "merchant"]),
  category_id: z.uuid(err("required")),
});
