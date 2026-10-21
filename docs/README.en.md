# HSBC Pulse Statement Rewards Analyzer

A **frontend-only** credit card statement analyser: upload the eStatement PDF of an HSBC Pulse dual-currency card, and every transaction is parsed in your browser with its RewardCash earning and effective reward rate.

[中文](../README.md) · **Live demo**: <https://hsbc-pulse-rewards-keork2rlvbr.qoder.zone>

## Why

Rewards on the HSBC Pulse card are layered, but the statement only prints a single `REWARDCASH EARNED` total. You cannot tell how much each transaction earned or which ones actually qualified for a bonus. This tool breaks the statement down transaction by transaction so you can check the reward rate you really got.

## Features

- **Fully local parsing** — text is extracted from the PDF with pdf.js inside the browser. No uploads, no network requests.
- **Dual sub-accounts** — parses the HKD and CNY sub-accounts together and separates purchases, payments and refunds.
- **Per-transaction rewards** — each row shows its reward breakdown and effective rate, plus how much of the annual bonus caps has been used.
- **Transaction table** — normalised merchant names, detected payment methods, sorting by post date / amount / reward / rate, and pagination.
- **UI** — English and Chinese, light and dark themes, responsive layout for mobile.

## Getting started

Requires Node.js 20 or later (developed on v24).

```bash
npm install
npm run dev
```

Open <http://localhost:4400> and pick a statement PDF from the upload button in the top-right corner.

## Build and deploy

```bash
npm run build
```

Next.js static export is enabled, so the build output in `out/` can be served from any static host (GitHub Pages, Nginx, object storage) with no Node runtime.

## Tests

```bash
npm test
```

Unit tests run on vitest and cover statement text parsing and reward calculation. All statement text and transaction data used by the tests is **synthetic** and contains no real cardholder information.

## Project layout

```
src/
├── components/          # Dashboard / FileUpload / RewardSummary / TransactionTable
├── locale/              # English and Chinese copy, locale context
├── pages/               # Next.js pages router entry
├── store/               # Redux state
├── theme/               # Light/dark theme context
├── types/statement.ts   # Statement, transaction and reward types
├── utils/
│   ├── pdfParser.ts     # pdf.js text extraction
│   ├── statementParser.ts  # statement text -> structured transactions
│   └── rewardCalculator.ts # reward calculation and aggregation
└── __tests__/           # parser/calculator tests and synthetic fixtures
```

## How it works

1. **Extract text** — `pdfParser` pulls the text layer of every page with pdf.js and concatenates it into one string.
2. **Tokenise and locate rows** — `statementParser` splits on whitespace and locates a transaction row by two consecutive `DDMON` date tokens (post date and transaction date), then collects description tokens until it hits an amount token. An amount suffixed with `CR` is a credit.
3. **Merge trailing markers** — the statement layout pushes payment-method markers after the amount, so the parser folds those trailing tokens back into the same transaction. That is what separates a plain card payment from one that qualifies for a bonus.
4. **Calculate rewards** — `rewardCalculator` applies the card's rules per transaction, tracks the annual caps, and the Dashboard renders the summary and the detail table.

## Known limitations

- Targets the **eStatement** layout of the HSBC Pulse dual-currency card only; other cards or paper statements may fail to parse.
- Parsing depends on the token order of the PDF text layer, so the parser needs updating if the bank changes the statement template.
- Rewards are computed locally for reference only — the bank's statement is authoritative.

## Privacy

Everything happens in your browser. There is no backend, and the project never collects, uploads or stores statement data.

## Disclaimer

This is an unofficial personal project. It is not affiliated with, endorsed by, or sponsored by HSBC. All bank names, card names and trademarks belong to their respective owners.

## License

[MIT](../LICENSE)
