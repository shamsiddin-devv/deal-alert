import { checkTarget } from '../monitoring';
import type { Listing, Status, WatchOptions } from '../monitoring';

export class TrackedProduct {
  constructor(
    readonly listing: Listing,
    readonly options: WatchOptions,
  ) {
    checkTarget(options.targetPrice, listing.price);
  }
  initialStatus(): Status {
    if (this.listing.stock === 'out-of-stock') return 'unavailable';
    if (
      this.listing.price !== null &&
      this.listing.price <= this.options.targetPrice
    )
      return 'triggered';
    return 'active';
  }
}
