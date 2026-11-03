import { FormEvent, useState } from 'react';
import { ArrowDown, ArrowUp, FolderPlus, Power, Trash2, X } from 'lucide-react';
import type { Category } from '../types/admin';

type CategoryChange = Partial<Pick<Category, 'name' | 'position' | 'isAvailable'>>;

type Props = {
  categories: Category[];
  savingId: string;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, changes: CategoryChange) => Promise<void>;
  onDelete: (category: Category) => Promise<void>;
};

export function CategoryManagerDialog({
  categories,
  savingId,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim());
      setName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
    >
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-[#4169ff]">CATÁLOGO</p>
            <h3 id="category-dialog-title" className="mt-1 text-xl font-bold text-slate-950">
              Categorías y complementos
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Organiza la carta. Pausar una categoría la oculta del sitio sin borrar sus productos.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={create} className="flex gap-2 border-b border-slate-100 bg-slate-50 p-4 sm:px-6">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-[#4169ff] focus:ring-2"
            placeholder="Ej.: Hamburguesas, Bebidas o Complementos"
            minLength={2}
            maxLength={50}
            required
          />
          <button
            disabled={creating}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#4169ff] px-3 text-sm font-semibold text-white hover:bg-[#3156d8] disabled:opacity-60"
          >
            <FolderPlus size={16} /> {creating ? 'Creando…' : 'Crear'}
          </button>
        </form>

        <div className="max-h-[58vh] overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-2">
            {categories.map((category, index) => {
              const productCount = category._count?.products ?? 0;
              const busy = savingId === category.id;
              return (
                <article
                  key={category.id}
                  className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <input
                      aria-label={`Nombre de categoría ${category.name}`}
                      defaultValue={category.name}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next && next !== category.name) void onUpdate(category.id, { name: next });
                        if (!next) event.target.value = category.name;
                      }}
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-slate-950 outline-none hover:border-slate-200 focus:border-[#aebdff] focus:bg-[#f8f9ff]"
                    />
                    <p className="px-2 text-xs text-slate-500">
                      {productCount} {productCount === 1 ? 'producto' : 'productos'} · Posición {category.position + 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Subir categoría"
                      disabled={busy || index === 0}
                      onClick={() => void onUpdate(category.id, { position: Math.max(0, category.position - 1) })}
                      className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      aria-label="Bajar categoría"
                      disabled={busy || index === categories.length - 1}
                      onClick={() => void onUpdate(category.id, { position: category.position + 1 })}
                      className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ArrowDown size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <button
                      disabled={busy}
                      onClick={() => void onUpdate(category.id, { isAvailable: !category.isAvailable })}
                      className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold ${category.isAvailable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Power size={13} /> {category.isAvailable ? 'Activa' : 'Pausada'}
                    </button>
                    <button
                      disabled={busy || productCount > 0}
                      title={productCount > 0 ? 'Mueve o elimina sus productos antes de borrar la categoría.' : 'Eliminar categoría'}
                      onClick={() => void onDelete(category)}
                      className="grid size-8 place-items-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {categories.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">Aún no hay categorías registradas.</p>
          )}
        </div>
      </section>
    </div>
  );
}
