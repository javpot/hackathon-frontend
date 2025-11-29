# Database (SQLite) — listings table

This module contains a simple SQLite database for the Expo frontend app.

## What it provides

- `db.ts` — A TypeScript helper to initialize the database and run basic queries.
- `schema.sql` — The SQL schema to create the `listings` table.
- `seed.ts` — A seed script that populates the table with sample listings.
 - `db.ts` — A TypeScript helper to initialize the database and run basic queries.
 - `schema.sql` — The SQL schema to create the `listings` and `Ressources` tables.
 - `seed.ts` — A seed script that populates the tables with sample data.

## The `listings` table columns

- `id` (INTEGER PRIMARY KEY)
- `ressource` (INTEGER) — fk-like reference to a row in `Ressources`
- `vendorName` (TEXT)
- `vendorID` (TEXT)
- `productsInReturn` (TEXT)

## The `Ressources` table columns

- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT)
- `description` (TEXT)
- `image` (TEXT)
- `quantity` (INTEGER)

## Usage (in a React / Expo app)

1. Initialize the database at app startup (for example, in a root component's effect):

```tsx
import db from '../database/db';

useEffect(() => {
  db.initDB().catch((err) => console.error('Failed to init DB', err));
}, []);
```

2. Insert a listing (now references a resource by id):

```tsx
// assume `resourceId` is an existing id in the Ressources table
await db.addListing({
  ressource: resourceId,
  vendorName: 'Vendor X',
  vendorID: 'vendor_x',
  productsInReturn: 'none',
});
```

3. Query all listings:

```tsx
// Basic listings (contain ressource id)
const listings = await db.getAllListings();

// Listings joined with the full Ressource details for rendering
const rows = await db.getAllListingsWithRessources();
rows.forEach(({ listing, ressource }) => console.log(listing, ressource));
```

4. Optional: call the seed function (e.g. in a dev-only screen):

```tsx
import { seedAll, seedListings, seedResources } from '../database/seed';

// Seed both tables
await seedAll();

// OR seed individually
await seedListings();
await seedResources();
```

## Notes

- This module uses `expo-sqlite`, which is part of the Expo SDK. If you're using bare React Native, install and configure an equivalent SQLite package (e.g., `react-native-sqlite-storage`).
- This is a lightweight helper; you may want to add error handling, migrations, and stronger typing if you plan to use it in production.
