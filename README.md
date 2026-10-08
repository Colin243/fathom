# Fathom · the endless dive

A fan-made, unlimited-play homage to [Krillion](https://krillion.io). Not affiliated.

Seven prompts, 25 seconds each. Name one thing that fits. Obvious answers float, rare answers sink you deeper. Every point sinks you 10 metres, and 700 points reaches the trench floor.

## How it plays

- **Begin descent**: a fresh random dive, steering away from prompts you've already seen in this browser.
- **Today's dive**: everyone gets the same seven prompts for the date.
- **Challenge friends**: after a dive, copy a link (`?dive=CODE`) that gives friends the exact same prompts so you can compare scores.
- Wrong or unknown answers just bounce, so keep typing. The clock running out scores 0.

| Tier | Points | Meaning |
| --- | --- | --- |
| Seafoam | 10 | the first thing everyone says |
| Took the bait | 15 | feels clever, but everyone thought of it |
| Shoal | 30 | well known, not first to mind |
| Rare | 60 | fewer people get here |
| Deep cut | 85 | obscure |
| Leviathan | 100 | very obscure but valid |

## How scoring works

Unlike the original, which scores answers by how many real players picked them, Fathom scores from hand-curated tier lists in `src/data/bank-*.json`. It needs no server or database, and it's free to host. The trade-off is that a real answer missing from the lists gets bounced. Matching ignores case, accents, punctuation, articles, plurals, and small typos.

## Adding prompts

Add entries to any `src/data/bank-*.json` file (or a new `bank-<name>.json`). Each entry looks like this:

```json
{
  "id": "fd-31",
  "text": "Name a type of cheese",
  "category": "food",
  "tiers": {
    "seafoam": ["Cheddar", "Mozzarella"],
    "bait": ["Brie"],
    "shoal": ["Gouda", "Parmesan|Parmigiano-Reggiano"],
    "rare": ["..."],
    "deep": ["..."],
    "leviathan": ["..."]
  }
}
```

Use `Canonical|alias|alias` for alternate names. Then validate:

```bash
npm run validate
```

## Develop

```bash
npm install
npm run dev
```

In dev builds, pressing Escape skips the current prompt.

## Deploy

It's a static Vite app, so Vercel detects it with zero config. Import the repo at vercel.com/new, or run `npx vercel --prod`.
