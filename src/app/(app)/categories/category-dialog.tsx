"use client";

import type { ReactElement } from "react";
import { CATEGORY_ICONS, CATEGORY_ICON_NAMES } from "@/components/category-icon";
import { Field, errorProps } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RowActions } from "@/components/row-actions";
import { deleteCategory, saveCategory } from "@/lib/actions/settings";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import { CATEGORY_KINDS } from "@/lib/validation";
import type { Category } from "@/lib/data";

type CategoryDialogProps = {
  trigger: ReactElement;
  category?: Category;
  defaultKind?: Category["kind"];
};

export function CategoryDialog({ trigger, category, defaultKind = "expense" }: CategoryDialogProps) {
  const { t } = useI18n();
  return (
    <FormDialog
      title={category ? t.categories.edit : t.categories.add}
      trigger={trigger}
      action={saveCategory}
    >
      {(fe) => (
        <>
          {category && <input type="hidden" name="id" value={category.id} />}
          <Field id="name" label={t.categories.name} error={fe.name}>
            <Input id="name" name="name" defaultValue={category?.name} autoFocus {...errorProps("name", fe.name)} />
          </Field>

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <Field id="kind" label={t.categories.kind} error={fe.kind}>
              <NativeSelect id="kind" name="kind" defaultValue={category?.kind ?? defaultKind} className="w-full">
                {CATEGORY_KINDS.map((k) => (
                  <NativeSelectOption key={k} value={k}>
                    {t.categories.kinds[k]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field id="color" label={t.categories.color} error={fe.color}>
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue={category?.color ?? "#64748b"}
                className="w-16 cursor-pointer p-1"
              />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t.categories.icon}</legend>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {CATEGORY_ICON_NAMES.map((name) => {
                const Icon = CATEGORY_ICONS[name];
                return (
                  <label
                    key={name}
                    title={name}
                    className={cn(
                      "flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-colors hover:bg-muted",
                      "has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground",
                      "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    )}
                  >
                    <input
                      type="radio"
                      name="icon"
                      value={name}
                      defaultChecked={(category?.icon ?? "circle") === name}
                      className="sr-only"
                    />
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="sr-only">{name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </>
      )}
    </FormDialog>
  );
}

export function CategoryRowActions({ category }: { category: Category }) {
  const { t } = useI18n();
  return (
    <RowActions
      editDialog={(trigger) => <CategoryDialog trigger={trigger} category={category} />}
      deleteTitle={fmt(t.categories.deleteTitle, { name: category.name })}
      deleteDescription={t.categories.deleteDescription}
      onDelete={() => deleteCategory(category.id)}
    />
  );
}
