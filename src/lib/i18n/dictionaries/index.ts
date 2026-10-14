import type { Dictionary, Locale } from "../types";
import { de } from "./de";
import { en } from "./en";
import { ru } from "./ru";
import { uk } from "./uk";

export const dictionaries: Record<Locale, Dictionary> = { uk, en, de, ru };
