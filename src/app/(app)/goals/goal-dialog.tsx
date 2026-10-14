"use client";

import type { ReactElement } from "react";
import { Field, errorProps } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { RowActions } from "@/components/row-actions";
import { Input } from "@/components/ui/input";
import { deleteGoal, saveGoal } from "@/lib/actions/settings";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/types";
import { centsToInput } from "@/lib/money";
import type { Goal } from "@/lib/data";

export function GoalDialog({ trigger, goal }: { trigger: ReactElement; goal?: Goal }) {
  const { t } = useI18n();
  return (
    <FormDialog title={goal ? t.goals.edit : t.goals.add} trigger={trigger} action={saveGoal}>
      {(fe) => (
        <>
          {goal && <input type="hidden" name="id" value={goal.id} />}
          <Field id="name" label={t.goals.name} error={fe.name}>
            <Input id="name" name="name" defaultValue={goal?.name} autoFocus {...errorProps("name", fe.name)} />
          </Field>
          <Field id="target" label={t.goals.target} error={fe.target}>
            <Input
              id="target"
              name="target"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={goal ? centsToInput(goal.target_cents) : ""}
              {...errorProps("target", fe.target)}
            />
          </Field>
          <Field id="deadline" label={t.goals.deadline} optional error={fe.deadline}>
            <Input
              id="deadline"
              name="deadline"
              type="date"
              defaultValue={goal?.deadline ?? ""}
              {...errorProps("deadline", fe.deadline)}
            />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

export function GoalRowActions({ goal }: { goal: Goal }) {
  const { t } = useI18n();
  return (
    <RowActions
      editDialog={(trigger) => <GoalDialog trigger={trigger} goal={goal} />}
      deleteTitle={fmt(t.goals.deleteTitle, { name: goal.name })}
      deleteDescription={t.goals.deleteDescription}
      onDelete={() => deleteGoal(goal.id)}
    />
  );
}
