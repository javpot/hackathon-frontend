import * as SQLite from 'expo-sqlite';

// --- TYPES ---
export type Listing = {
    id?: number;
    ressource: number;
    vendorName: string;
    vendorID: string;
    productsInReturn: string;
    description?: string;
    image?: string; // Base64 encoded image
};

export type Resource = {
    id?: number;
    name: string;
    description: string;
    image?: string;
    quantity: number;
};

const DATABASE_NAME = 'app.db';


const db = SQLite.openDatabaseSync(DATABASE_NAME);

// --- INITIALISATION ---
export async function initDB() {
    // execAsync permet d'exécuter plusieurs commandes SQL d'un coup
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY NOT NULL,
            ressource INTEGER,
            vendorName TEXT,
            vendorID TEXT,
            productsInReturn TEXT,
            description TEXT,
            image TEXT
        );
        CREATE TABLE IF NOT EXISTS Ressources (
            id INTEGER PRIMARY KEY NOT NULL,
            name TEXT,
            description TEXT,
            image TEXT,
            quantity INTEGER
        );
    `);
    
    // Migrate existing listings table to add new columns if they don't exist
    try {
        await db.execAsync(`
            ALTER TABLE listings ADD COLUMN image TEXT;
        `);
    } catch (error: any) {
        // Column already exists, ignore error
        if (!error.message?.includes('duplicate column')) {
            console.error('Migration error:', error);
        }
    }
    
    try {
        await db.execAsync(`
            ALTER TABLE listings ADD COLUMN description TEXT;
        `);
    } catch (error: any) {
        // Column already exists, ignore error
        if (!error.message?.includes('duplicate column')) {
            console.error('Migration error:', error);
        }
    }
}

// --- LISTINGS ---

export async function addListing(listing: Listing) {
    const result = await db.runAsync(
        'INSERT INTO listings (ressource, vendorName, vendorID, productsInReturn, description, image) VALUES (?, ?, ?, ?, ?, ?)',
        [listing.ressource, listing.vendorName, listing.vendorID, listing.productsInReturn, listing.description ?? null, listing.image ?? null]
    );
    return result.lastInsertRowId;
}

export async function getAllListings(): Promise<Listing[]> {
    const rows = await db.getAllAsync('SELECT * FROM listings') as Listing[];
    return rows;
}

export async function getAllListingsWithRessources(): Promise<Array<{ listing: Listing; ressource?: Resource }>> {
    const rows = await db.getAllAsync(`
        SELECT l.*, r.id AS res_id, r.name AS res_name, r.description AS res_description, r.image AS res_image, r.quantity AS res_quantity 
        FROM listings l 
        LEFT JOIN Ressources r ON l.ressource = r.id
    `);

    return rows.map((r: any): { listing: Listing; ressource?: Resource } => {
        const listing: Listing = { 
            id: r.id, 
            ressource: r.ressource, 
            vendorName: r.vendorName, 
            vendorID: r.vendorID, 
            productsInReturn: r.productsInReturn,
            description: r.description,
            image: r.image
        };
        const res: Resource | undefined = r.res_id ? { 
            id: r.res_id, 
            name: r.res_name, 
            description: r.res_description, 
            image: r.res_image, 
            quantity: r.res_quantity 
        } : undefined;
        
        return { listing, ressource: res };
    });
}

export async function getListingById(id: number): Promise<Listing | null> {
    const row = await db.getFirstAsync('SELECT * FROM listings WHERE id = ?', [id]) as Listing | null;
    return row ?? null;
}

export async function deleteListingById(id: number) {
    await db.runAsync('DELETE FROM listings WHERE id = ?', [id]);
}

// --- RESSOURCES ---

export async function addResource(resource: Resource) {
    const result = await db.runAsync(
        'INSERT INTO Ressources (name, description, image, quantity) VALUES (?, ?, ?, ?)',
        [resource.name, resource.description, resource.image ?? null, resource.quantity]
    );
    return result.lastInsertRowId;
}

export async function getAllRessources(): Promise<Resource[]> {
    const rows = await db.getAllAsync('SELECT * FROM Ressources') as Resource[];
    return rows;
}

export async function getRessourceById(id: number): Promise<Resource | null> {
    const row = await db.getFirstAsync('SELECT * FROM Ressources WHERE id = ?', [id]) as Resource | null;
    return row ?? null;
}

export async function getRessourceByName(name: string): Promise<Resource | null> {
    const row = await db.getFirstAsync('SELECT * FROM Ressources WHERE name = ? LIMIT 1', [name]) as Resource | null;
    return row ?? null;
}

export async function deleteRessourceById(id: number) {
    await db.runAsync('DELETE FROM Ressources WHERE id = ?', [id]);
}

// --- SPÉCIAL CHATBOT (RAG) ---
// C'est la fonction que le bot utilise pour lire ton inventaire
export async function getInventoryForBot(): Promise<string> {
    try {
        const rows = await db.getAllAsync(
            'SELECT name, quantity, description FROM Ressources'
        ) as {name: string, quantity: number, description: string}[];

        if (rows.length === 0) {
            return "L'inventaire est vide. Le joueur n'a aucune ressource.";
        }

        return rows.map((r: { name: string; quantity: number; description: string }) => `${r.quantity}x ${r.name} (${r.description})`).join(', ');

    } catch (error) {
        console.error("Erreur inventaire bot:", error);
        return "Erreur lecture DB.";
    }
}

export default {
    initDB,
    addListing,
    getAllListings,
    getListingById,
    deleteListingById,
    addResource,
    getAllRessources,
    getRessourceById,
    getRessourceByName,
    deleteRessourceById,
    getAllListingsWithRessources,
    getInventoryForBot, 
};