import ProductImage from '@/components/base/ProductImage';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import ApiStatus from '@/components/base/ApiStatus';
import Button from '@/components/base/Button';
import Modal from '@/components/base/Modal';
import { EmptyState, Delta, StatusPill } from '@/components/base/Bits';
import { Field, Select, inputClass } from '@/components/base/Controls';
import { money } from '@/lib/format';

export default function CollectionsPage() {
  const {
    collections,
    products,
    createCollection,
    renameCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    pushToast,
    error: workspaceError,
    pending,
    refresh,
  } = useWorkspace();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addId, setAddId] = useState('');

  const selected = collections.find((collection) => collection.id === selectedId) ?? null;
  const selectedProducts = selected ? products.filter((product) => selected.productIds.includes(product.id)) : [];
  const available = selected ? products.filter((product) => !selected.productIds.includes(product.id)) : [];

  const collectionStats = (ids: string[]) => {
    const list = products.filter((product) => ids.includes(product.id));
    const value = list.reduce((sum, product) => sum + (Number.isFinite(product.price) ? product.price : 0), 0);
    const savings = list.reduce((sum, product) => sum + (Number.isFinite(product.changePct) ? Math.max(0, product.previousPrice - product.price) : 0), 0);
    return { count: list.length, value, savings };
  };

  const submitCreate = async () => {
    if (name.trim().length < 2) {
      setError('Give the collection a name');
      return;
    }
    if(!await createCollection(name.trim(),description.trim()))return;
    pushToast(`Collection “${name.trim()}” created`);
    setName('');
    setDescription('');
    setError('');
    setCreateOpen(false);
  };

  return (
    <div className="space-y-4">
      <ApiStatus loading={pending} error={workspaceError} retry={refresh} />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[25px]">
            Collections
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground-500">
            Group products by project or intention. {collections.length} collections ·{' '}
            {collections.reduce((sum, collection) => sum + collection.productIds.length, 0)} products organised
          </p>
        </div>
        <Button size="sm" icon="ri-folder-add-line" onClick={() => setCreateOpen(true)}>
          New collection
        </Button>
      </div>

      {selected && (
        <div className="rounded-xl border border-background-200 bg-background-50 anim-fade">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-background-200 p-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Collection</p>
              <h2 className="mt-1 font-heading text-[17px] font-semibold text-foreground-950">{selected.name}</h2>
              <p className="mt-0.5 text-[12px] text-foreground-500">{selected.description || 'No description yet.'}</p>
              <p className="mt-1.5 font-label text-[11.5px] text-foreground-600">
                {selectedProducts.length} products · {money(collectionStats(selected.productIds).value)} total value
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={addId}
                onChange={(value) => {
                  setAddId(value);
                  if (value) {
                    addToCollection(selected.id, value);
                    pushToast('Product added to collection');
                    setAddId('');
                  }
                }}
                aria-label="Add product to collection"
                className="w-44"
                options={[
                  { value: '', label: 'Add a product…' },
                  ...available.map((product) => ({ value: product.id, label: product.title.slice(0, 26) })),
                ]}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedId(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>

          {selectedProducts.length === 0 ? (
            <EmptyState
              icon="ri-folder-open-line"
              title="This collection is empty"
              body="Use the selector above to move tracked products into this collection."
            />
          ) : (
            <div className="divide-y divide-background-200">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/products/${product.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
                  >
                    <ProductImage
                      src={product.image || undefined}
                      alt=""
                      width={34}
                      height={34}
                      className="h-[34px] w-[34px] shrink-0 rounded-md border border-background-200 object-cover object-top"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-foreground-900">{product.title}</span>
                      <span className="block text-[10.5px] text-foreground-400">
                        {product.marketplace} · target {money(product.targetPrice)}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <span className="font-label text-[11.5px] font-medium text-foreground-950">{money(product.price)}</span>
                    <Delta value={product.changePct} className="text-[11px]" />
                    <StatusPill status={product.status} compact />
                    <button
                      type="button"
                      onClick={async () => {
                        if(!await removeFromCollection(selected.id, product.id))return;
                        pushToast('Removed from collection', 'info');
                      }}
                      aria-label="Remove from collection"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-400 hover:bg-danger-500/10 hover:text-danger-600 cursor-pointer"
                    >
                      <i aria-hidden="true" className="ri-close-line text-sm"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => {
          const stats = collectionStats(collection.productIds);
          const items = products.filter((product) => collection.productIds.includes(product.id));
          const active = collection.id === selectedId;
          return (
            <div
              key={collection.id}
              className={`group relative rounded-xl border bg-background-50 p-4 transition-all duration-200 ${
                active ? 'border-foreground-950/25 shadow-card' : 'border-background-200 hover:border-background-300 hover:shadow-card'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => setSelectedId(collection.id)} className="min-w-0 text-left cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-background-100 text-foreground-600">
                      <i aria-hidden="true" className="ri-folder-3-line text-[14px]"></i>
                    </span>
                    <h2 className="truncate font-heading text-[14px] font-semibold text-foreground-950">{collection.name}</h2>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRenameId(collection.id);
                      setRenameValue(collection.name);
                    }}
                    aria-label="Rename collection"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-800 cursor-pointer"
                  >
                    <i aria-hidden="true" className="ri-pencil-line text-[13px]"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(collection.id)}
                    aria-label="Delete collection"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-400 hover:bg-danger-500/10 hover:text-danger-600 cursor-pointer"
                  >
                    <i aria-hidden="true" className="ri-delete-bin-line text-[13px]"></i>
                  </button>
                </div>
              </div>

              <button type="button" onClick={() => setSelectedId(collection.id)} className="mt-2 block w-full text-left cursor-pointer">
                <p className="line-clamp-2 min-h-[30px] text-[11.5px] leading-relaxed text-foreground-500">
                  {collection.description || 'No description yet.'}
                </p>
              </button>

              <div className="mt-3 flex gap-1.5">
                {items.slice(0, 4).map((product) => (
                  <ProductImage
                    key={product.id}
                    src={product.image || undefined}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-lg border border-background-200 object-cover object-top"
                  />
                ))}
                {items.length === 0 && (
                  <div className="flex h-10 flex-1 items-center justify-center rounded-lg border border-dashed border-background-300 text-[10.5px] text-foreground-400">
                    No products yet
                  </div>
                )}
                {items.length > 4 && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-background-200 bg-background-100 font-label text-[10.5px] text-foreground-500">
                    +{items.length - 4}
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-background-200 pt-2.5">
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.08em] text-foreground-400">Products</p>
                  <p className="font-label text-[11px] font-medium text-foreground-900">{stats.count}</p>
                </div>
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.08em] text-foreground-400">Value</p>
                  <p className="truncate font-label text-[11px] font-medium text-foreground-900">{money(stats.value)}</p>
                </div>
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.08em] text-foreground-400">Potential</p>
                  <p className="truncate font-label text-[11px] font-medium text-primary-600 dark:text-primary-400">
                    {money(stats.savings)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex min-h-[182px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-background-300 bg-background-50/50 p-4 text-foreground-400 transition-colors hover:border-foreground-300 hover:text-foreground-700 cursor-pointer"
        >
          <i aria-hidden="true" className="ri-add-line text-xl"></i>
          <span className="text-[12px] font-medium">Create a collection</span>
          <span className="max-w-[180px] text-center text-[10.5px] leading-relaxed">
            Keep phones, gaming or home upgrades separate
          </span>
        </button>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New collection"
        description="Collections help you keep watchlists organised by project or room."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate}>Create collection</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Collection name">
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              placeholder="e.g. Gaming setup"
              className={inputClass}
              data-modal-autofocus
            />
          </Field>
          <Field label="Description" hint="Optional, shown on the collection card.">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this collection for?"
              className={inputClass}
            />
          </Field>
          {error && (
            <p className="flex items-center gap-1 text-[11.5px] text-danger-600">
              <i aria-hidden="true" className="ri-error-warning-line text-xs"></i>
              {error}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(renameId)}
        onClose={() => setRenameId(null)}
        title="Rename collection"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!renameId) return;
                if (renameValue.trim().length < 2) {
                  pushToast('Name is too short', 'error');
                  return;
                }
                if(!await renameCollection(renameId, renameValue.trim()))return;
                pushToast('Collection renamed');
                setRenameId(null);
              }}
            >
              Save name
            </Button>
          </>
        }
      >
        <Field label="Collection name">
          <input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            className={inputClass}
            data-modal-autofocus
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete collection"
        description="The products stay in your watchlist. Only the grouping is removed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteId) {
                  deleteCollection(deleteId);
                  if (selectedId === deleteId) setSelectedId(null);
                  pushToast('Collection deleted', 'info');
                }
                setDeleteId(null);
              }}
            >
              Delete collection
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-foreground-600">
          {collections.find((collection) => collection.id === deleteId)?.name} will be removed from this workspace.
        </p>
      </Modal>
    </div>
  );
}
