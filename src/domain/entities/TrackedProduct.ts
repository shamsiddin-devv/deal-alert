
export type TrackedProductStatusType = 'active' | 'triggered' | 'paused'

export type ProductSource =
  | 'olx'
  | 'uzum'
  | 'asaxiy'
  | 'mediapark'
  | 'texnomart'
  | 'ishonch'
  | 'nout'
  | 'computerhouse'
  | 'upg';

export interface ITrackedProduct {
  id?: string;
  userId: string;
  productName?: string; 
  productUrl: string;
  source?: ProductSource;
  targetPrice?: number;
  currentPrice?: number;
  status?: TrackedProductStatusType;
  createdAt?: Date
};

export class TrackedProduct {
  private readonly _source: ProductSource 

  constructor(props: ITrackedProduct) {
    // if()
  };
};