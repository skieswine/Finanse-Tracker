import { Plus } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCategories } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { CATEGORY_KINDS } from "@/lib/validation";
import { CategoryDialog, CategoryRowActions } from "./category-dialog";

export default async function CategoriesPage() {
  const [{ t }, categories] = await Promise.all([getI18n(), getCategories()]);

  return (
    <>
      <PageHeader
        title={t.categories.title}
        actions={
          <CategoryDialog
            trigger={
              <Button size="lg" className="h-10">
                <Plus />
                <span className="hidden sm:inline">{t.categories.add}</span>
              </Button>
            }
          />
        }
      />
      <div className="grid gap-6">
        {CATEGORY_KINDS.map((kind) => {
          const items = categories.filter((c) => c.kind === kind);
          return (
            <section key={kind}>
              <h2 className="mb-2 px-1 text-sm font-medium text-muted-foreground">
                {t.categories.kinds[kind]}
              </h2>
              <Card className="gap-0 py-0">
                {items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">{t.categories.emptyKind}</p>
                ) : (
                  <ul className="divide-y">
                    {items.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
                        <CategoryIcon icon={c.icon} color={c.color} />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <CategoryRowActions category={c} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          );
        })}
      </div>
    </>
  );
}
