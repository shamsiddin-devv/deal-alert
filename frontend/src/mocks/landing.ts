export const marketplaces = [
  { name: 'Uzum Market', note: 'Largest local catalog' },
  { name: 'OLX.uz', note: 'Private sellers' },
  { name: 'Texnomart', note: 'Electronics retail' },
  { name: 'Mediapark', note: 'Home & tech' },
  { name: 'Asaxiy', note: 'Marketplace & retail' },
];

export const landingStats = [
  { value: '5', label: 'marketplaces monitored' },
  { value: '365 days', label: 'of price history per product' },
  { value: '2.4M', label: 'price points analysed monthly' },
  { value: '18%', label: 'average saving on tracked deals' },
];

export const features = [
  {
    icon: 'ri-line-chart-line',
    title: 'Full price history',
    body: 'Every price change is stored with timestamps, so you can see the minimum, maximum, average and median for any product.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Fake discount detection',
    body: 'We compare the claimed discount with the real 90-day history and flag listings that were quietly marked up first.',
  },
  {
    icon: 'ri-links-line',
    title: 'Same product, many stores',
    body: 'Listings are matched by model and configuration. Used and new offers are never presented as the same thing.',
  },
  {
    icon: 'ri-notification-3-line',
    title: 'Alerts that respect you',
    body: 'Target price, percentage drop, historical low or back in stock. Only the events you asked for reach your inbox.',
  },
  {
    icon: 'ri-wallet-3-line',
    title: 'True final cost',
    body: 'Delivery, fees and seller conditions are included, so the cheapest sticker price is not mistaken for the best deal.',
  },
  {
    icon: 'ri-pie-chart-2-line',
    title: 'Savings you can verify',
    body: 'Confirmed savings are separated from potential ones. Nothing is presented as money saved until you actually buy.',
  },
];

export const steps = [
  {
    step: '01',
    title: 'Add a product link',
    body: 'Paste a link from Uzum, OLX, Texnomart, Mediapark or Asaxiy. We read the title, price, seller, condition and specifications.',
  },
  {
    step: '02',
    title: 'Set your buying conditions',
    body: 'Choose a target price, a percentage drop, the historical low, back in stock — or combine several conditions.',
  },
  {
    step: '03',
    title: 'We watch the market',
    body: 'Prices, availability, seller and listing details are checked continuously and every change is written to the history.',
  },
  {
    step: '04',
    title: 'Buy at the right moment',
    body: 'When your conditions are met you get an alert with the old price, the new price, the saving and the historical context.',
  },
];

export const benefits = [
  {
    role: 'For everyday shoppers',
    title: 'Never buy the week before a price drop',
    body: 'See how the price behaved through sales seasons before, and know whether to buy now or wait for the next campaign.',
    points: ['Track up to 30 products free', 'Target price alerts', 'True delivery-inclusive cost'],
  },
  {
    role: 'For researchers',
    title: 'Compare the same model across every store',
    body: 'Match configurations correctly, compare final cost and seller reliability, and keep notes in collections.',
    points: ['Cross-marketplace comparison', 'Condition-aware matching', 'Specification diffing'],
  },
  {
    role: 'For small teams',
    title: 'Buy equipment with evidence',
    body: 'Keep purchasing decisions documented with price history, seller information and savings estimates.',
    points: ['Shared collections', 'Exportable price events', 'Spend insight reports'],
  },
];

export const landingFaqs = [
  {
    q: 'Which marketplaces does Deal Alert monitor?',
    a: 'Uzum Market, OLX.uz, Texnomart, Mediapark and Asaxiy. Every product keeps a link to its original listing so you can always verify the offer yourself.',
  },
  {
    q: 'How is the Deal Score calculated?',
    a: 'The score compares the current price with the historical average and minimum, how long the drop has lasted, delivery costs, seller reputation, and prices of equivalent products elsewhere. A large "discount" from an inflated price scores low.',
  },
  {
    q: 'Can I choose the price I want to pay?',
    a: 'Yes. Set a target price, a percentage drop, "historical low" or "back in stock", or combine them. Each condition can be paused, edited or removed at any time.',
  },
  {
    q: 'Will I be flooded with notifications?',
    a: 'No. Alerts are grouped by type and sent only for the events you selected, with the old price, new price, saving and historical context in every message.',
  },
  {
    q: 'How are used listings from OLX handled?',
    a: 'Listings are matched by model and configuration, and condition is always shown separately. A used item is never displayed as identical to a new one.',
  },
  {
    q: 'Where do marketplace prices come from?',
    a: 'The workspace displays recorded listings from supported marketplaces. The public preview uses sample prices.',
  },
];

export const showcaseProduct = {
  name: 'Apple iPhone 15 128GB Blue',
  note: 'Same model and configuration. Condition and delivery always shown separately.',
  rows: [
    { marketplace: 'Uzum Market', seller: 'iStore Uzbekistan', condition: 'New', price: 11890000, delivery: 0, warranty: '12 months official', stock: 'In stock', best: true },
    { marketplace: 'Texnomart', seller: 'Texnomart', condition: 'New', price: 12190000, delivery: 0, warranty: '12 months', stock: 'In stock', best: false },
    { marketplace: 'Mediapark', seller: 'Mediapark', condition: 'New', price: 12040000, delivery: 35000, warranty: '12 months', stock: '2 left', best: false },
    { marketplace: 'OLX.uz', seller: 'Aziz R. (private)', condition: 'Used — like new', price: 9900000, delivery: 30000, warranty: 'None', stock: 'Listing active', best: false },
  ],
};

export const footerLinks = [
  {
    title: 'Product',
    links: ['Overview', 'Explore deals', 'Price history', 'Alerts', 'Insights'],
  },
  {
    title: 'Marketplaces',
    links: ['Uzum Market', 'OLX.uz', 'Texnomart', 'Mediapark', 'Asaxiy'],
  },
  {
    title: 'Company',
    links: ['About', 'How it works', 'FAQ', 'Contact', 'Privacy'],
  },
];