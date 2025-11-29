import db, { Resource } from './db';

// sampleListings now reference a resource by name; the seeder will lookup/insert resources and link by id
export const sampleListings: Array<{ vendorName: string; vendorID: string; productsInReturn: string; ressourceName: string }> = [
    { vendorName: 'Vendor A', vendorID: 'vendor_a', productsInReturn: 'None', ressourceName: 'Hammer' },
    { vendorName: 'Vendor B', vendorID: 'vendor_b', productsInReturn: '1 x Small Widget', ressourceName: 'Screwdriver' },
];

export async function seedListings() {
    await db.initDB();
    for (const listing of sampleListings) {
        // find resource by name or create it
        let res = await db.getRessourceByName(listing.ressourceName);
        let resId: number | null = res?.id ?? null;
        if (!resId) {
            resId = (await db.addResource({ name: listing.ressourceName, description: listing.ressourceName, quantity: 1 })) as any;
        }
        if (resId != null) {
            // insert listing with ressource id
            await db.addListing({ ressource: Number(resId), vendorName: listing.vendorName, vendorID: listing.vendorID, productsInReturn: listing.productsInReturn } as any);
        }
    }
}

export default seedListings;

export const sampleResources: Resource[] = [
    {
        name: 'Hammer',
        description: 'Standard carpenter hammer',
        image: 'https://example.com/hammer.jpg',
        quantity: 10,
    },
    {
        name: 'Screwdriver',
        description: 'Flat-head screwdriver',
        image: 'https://example.com/screwdriver.jpg',
        quantity: 14,
    },
];

export async function seedResources() {
    await db.initDB();
    for (const r of sampleResources) {
        await db.addResource(r);
    }
}

export async function seedAll() {
    await db.initDB();
    // Insert resources first
    for (const r of sampleResources) await db.addResource(r);
    // Insert listings referencing resource IDs (create resource if missing)
    for (const listing of sampleListings) {
        let res = await db.getRessourceByName(listing.ressourceName);
        let resId: number | null = res?.id ?? null;
        if (!resId) {
            resId = (await db.addResource({ name: listing.ressourceName, description: listing.ressourceName, quantity: 1 })) as any;
        }
        if (resId != null) {
            await db.addListing({ ressource: Number(resId), vendorName: listing.vendorName, vendorID: listing.vendorID, productsInReturn: listing.productsInReturn } as any);
        }
    }
}
