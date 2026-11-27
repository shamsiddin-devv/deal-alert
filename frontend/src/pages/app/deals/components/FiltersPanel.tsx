import { Switch, inputClass } from '@/components/base/Controls';

export type DealFilters = {
  query: string;
  marketplaces: string[];
  category: string;
  brand: string;
  condition: string;
  min: string;
  max: string;
  minDiscount: string;
  inStock: boolean;
  histLow: boolean;
  dropOnly: boolean;
};

export const defaultFilters: DealFilters = {
  query: '',
  marketplaces: [],
  category: 'all',
  brand: 'all',
  condition: 'all',
  min: '',
  max: '',
  minDiscount: '',
  inStock: false,
  histLow: false,
  dropOnly: false,
};

export default function FiltersPanel({
  filters,
  onChange,
  marketplaces,
  categories,
  brands,
  activeCount,
  onReset,
}: {
  filters: DealFilters;
  onChange: (patch: Partial<DealFilters>) => void;
  marketplaces: string[];
  categories: string[];
  brands: string[];
  activeCount: number;
  onReset: () => void;
}) {
  const toggleMarketplace = (name: string) => {
    const next = filters.marketplaces.includes(name)
      ? filters.marketplaces.filter((item) => item !== name)
      : [...filters.marketplaces, name];
    onChange({ marketplaces: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-400">
          Filters
          {activeCount > 0 && (
            <span className="ml-1.5 rounded-full bg-foreground-950 px-1.5 py-0.5 font-label text-[9.5px] text-background-50">
              {activeCount}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-medium text-foreground-500 hover:text-foreground-950 cursor-pointer"
        >
          Reset
        </button>
      </div>

      <div>
        <p className="mb-1.5 text-[11.5px] font-medium text-foreground-700">Marketplace</p>
        <div className="space-y-1">
          {marketplaces.map((name) => {
            const checked = filters.marketplaces.includes(name);
            return (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[11.5px] text-foreground-700 hover:bg-background-100"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMarketplace(name)}
                  className="h-3.5 w-3.5 rounded border-background-300 accent-primary-600 cursor-pointer"
                />
                {name}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-foreground-700">Category</span>
          <select
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
            className="h-8 w-full rounded-lg border border-background-200 bg-background-50 px-2 text-[11.5px] text-foreground-900 outline-none cursor-pointer focus:border-primary-500"
          >
            <option value="all">All</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-foreground-700">Brand</span>
          <select
            value={filters.brand}
            onChange={(event) => onChange({ brand: event.target.value })}
            className="h-8 w-full rounded-lg border border-background-200 bg-background-50 px-2 text-[11.5px] text-foreground-900 outline-none cursor-pointer focus:border-primary-500"
          >
            <option value="all">All</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-1.5 text-[11.5px] font-medium text-foreground-700">Price range (UZS)</p>
        <div className="flex items-center gap-1.5">
          <input
            value={filters.min}
            onChange={(event) => onChange({ min: event.target.value.replace(/[^\d]/g, '') })}
            placeholder="Min"
            inputMode="numeric"
            className={`${inputClass} h-8 text-[11.5px]`}
          />
          <span className="text-foreground-300">–</span>
          <input
            value={filters.max}
            onChange={(event) => onChange({ max: event.target.value.replace(/[^\d]/g, '') })}
            placeholder="Max"
            inputMode="numeric"
            className={`${inputClass} h-8 text-[11.5px]`}
          />
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[11.5px] font-medium text-foreground-700">Minimum discount</span>
        <div className="flex items-center gap-1">
          {['5', '10', '15', '20'].map((value) => {
            const active = filters.minDiscount === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ minDiscount: active ? '' : value })}
                className={`h-7 flex-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${
                  active
                    ? 'border-foreground-950 bg-foreground-950 text-background-50'
                    : 'border-background-200 bg-background-50 text-foreground-600 hover:border-background-300'
                }`}
              >
                {value}%
              </button>
            );
          })}
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-foreground-700">Condition</span>
        <select
          value={filters.condition}
          onChange={(event) => onChange({ condition: event.target.value })}
          className="h-8 w-full rounded-lg border border-background-200 bg-background-50 px-2 text-[11.5px] text-foreground-900 outline-none cursor-pointer focus:border-primary-500"
        >
          <option value="all">Any condition</option>
          <option value="New">New</option>
          <option value="Used — like new">Used — like new</option>
          <option value="Refurbished">Refurbished</option>
        </select>
      </label>

      <div className="space-y-2.5 border-t border-background-200 pt-3">
        <Switch checked={filters.inStock} onChange={(next) => onChange({ inStock: next })} label="Available only" />
        <Switch checked={filters.histLow} onChange={(next) => onChange({ histLow: next })} label="Historical low" />
        <Switch checked={filters.dropOnly} onChange={(next) => onChange({ dropOnly: next })} label="Price decreased" />
      </div>
    </div>
  );
}