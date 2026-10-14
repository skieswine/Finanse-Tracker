"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { ActionState } from "@/lib/actions/shared";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Like useActionState, but submits via onSubmit so React does not reset
 * the form fields — the user keeps their input when validation fails.
 */
export function useFormAction(action: Action) {
  const [state, dispatch, pending] = useActionState(action, {});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, onSubmit, pending };
}
