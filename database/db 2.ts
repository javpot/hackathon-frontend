import * as SQLite from 'expo-sqlite';

export type Listing = {
    id?: number;
    // listing now references a resource
    ressource: number;
    vendorName: string;
    vendorID: string;
    productsInReturn: string;
};

export type Resource = {
    id?: number;
    name: string;
    description: string;
    image?: string;
    quantity: number;
};

const DATABASE_NAME = 'app.db';

const db = SQLite.openDatabase(DATABASE_NAME);

function runSql<T = any>(sql: string, params: (string | number | null)[] = []) {
    return new Promise<T>((resolve, reject) => {
        db.transaction((tx: any) => {
            tx.executeSql(
                sql,
                params as any,
                (_: any, result: any) => resolve(result as unknown as T),
                (_: any, err: any) => {
                    reject(err);
                    return false;
                }
            );
        });
    });
}

export async function initDB() {
    const createListingsSql = `
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY NOT NULL,
            ressource INTEGER,
            vendorName TEXT,
            vendorID TEXT,
            productsInReturn TEXT
        );
    `;

    const createResourcesSql = `
        CREATE TABLE IF NOT EXISTS Ressources (
            id INTEGER PRIMARY KEY NOT NULL,
            name TEXT,
            description TEXT,
            image TEXT,
            quantity INTEGER
        );
    `;

    await runSql(createListingsSql);
    await runSql(createResourcesSql);
}

export async function addListing(listing: Listing) {
    const sql = `INSERT INTO listings (ressource, vendorName, vendorID, productsInReturn) VALUES (?, ?, ?, ?);`;
    const params = [listing.ressource, listing.vendorName, listing.vendorID, listing.productsInReturn];
    const result = await runSql(sql, params);
    // @ts-ignore - Result type for `executeSql` returns insertId in rowsAffected result
    return (result as any).insertId ?? null;
}

export async function getAllListings(): Promise<Listing[]> {
    const sql = `SELECT * FROM listings;`;
    const result: any = await runSql(sql);
    const rows = result.rows && result.rows._array ? result.rows._array : [];
    return rows as Listing[];
}

export async function getAllListingsWithRessources(): Promise<Array<{ listing: Listing; ressource?: Resource }>> {
    const sql = `SELECT l.*, r.id AS res_id, r.name AS res_name, r.description AS res_description, r.image AS res_image, r.quantity AS res_quantity FROM listings l LEFT JOIN Ressources r ON l.ressource = r.id;`;
    const result: any = await runSql(sql);
    const rows = result.rows && result.rows._array ? result.rows._array : [];
    const mapped = rows.map((r: any) => {
        const listing: Listing = { id: r.id, ressource: r.ressource, vendorName: r.vendorName, vendorID: r.vendorID, productsInReturn: r.productsInReturn } as Listing;
        const res = r.res_id ? { id: r.res_id, name: r.res_name, description: r.res_description, image: r.res_image, quantity: r.res_quantity } as Resource : undefined;
        return { listing, ressource: res };
    });
    return mapped;
}

export async function getListingById(id: number): Promise<Listing | null> {
    const sql = `SELECT * FROM listings WHERE id = ?;`;
    const result: any = await runSql(sql, [id]);
    const rows = result.rows && result.rows._array ? result.rows._array : [];
    return rows[0] ?? null;
}

export async function deleteListingById(id: number) {
    const sql = `DELETE FROM listings WHERE id = ?;`;
    await runSql(sql, [id]);
}

// ---------------------
// Ressources helpers
// ---------------------

export async function addResource(resource: Resource) {
    const sql = `INSERT INTO Ressources (name, description, image, quantity) VALUES (?, ?, ?, ?);`;
    const params = [resource.name, resource.description, resource.image ?? null, resource.quantity];
    const result = await runSql(sql, params);
    // @ts-ignore
    return (result as any).insertId ?? null;
}

export async function getAllRessources(): Promise<Resource[]> {
    const sql = `SELECT * FROM Ressources;`;
    const result: any = await runSql(sql);
    const rows = result.rows && result.rows._array ? result.rows._array : [];
    return rows as Resource[];
}

export async function getRessourceById(id: number): Promise<Resource | null> {
    const sql = `SELECT * FROM Ressources WHERE id = ?;`;
    const result: any = await runSql(sql, [id]);
    const rows = result.rows && result.rows._array ? result.rows._array : [];
    return rows[0] ?? null;
}

export async function getRessourceByName(name: string): Promise<Resource | null> {
    const sql = `SELECT * FROM Ressources WHERE name = ? LIMIT 1;`;
    const result: any = await runSql(sql, [name]);
    const rows = result.rows && result.rows._array ? result.rows._array : [];
    return rows[0] ?? null;
}

export async function deleteRessourceById(id: number) {
    const sql = `DELETE FROM Ressources WHERE id = ?;`;
    await runSql(sql, [id]);
}

export default {
    initDB,
    addListing,
    getAllListings,
    getListingById,
    deleteListingById,
    // Ressources
    addResource,
    getAllRessources,
    getRessourceById,
    getRessourceByName,
    deleteRessourceById,
    getAllListingsWithRessources,
};
