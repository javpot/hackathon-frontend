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

// Database name will be set per device to ensure isolation
let db: SQLite.SQLiteDatabase | null = null;
let currentDatabaseName = 'app.db';

/**
 * Initialize database with a device-specific name
 * This ensures each device/emulator has its own isolated database
 */
export async function initDB(deviceVendorID?: string) {
    // If deviceVendorID is provided, use it to create a unique database name
    // This ensures each device has its own database file
    if (deviceVendorID) {
        const uniqueDbName = `app_${deviceVendorID.replace(/[^a-zA-Z0-9]/g, '_')}.db`;
        // Only recreate if database name changed
        if (uniqueDbName !== currentDatabaseName || !db) {
            currentDatabaseName = uniqueDbName;
            db = SQLite.openDatabaseSync(uniqueDbName);
            console.log(`[DB] Using device-specific database: ${uniqueDbName}`);
        } else {
            console.log(`[DB] Database already initialized: ${currentDatabaseName}`);
        }
    } else if (!db) {
        // Fallback to default if no device ID yet
        currentDatabaseName = 'app.db';
        db = SQLite.openDatabaseSync('app.db');
        console.log(`[DB] Using default database: app.db`);
    }
    
    if (!db) {
        throw new Error('Failed to initialize database');
    }
    
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
        CREATE TABLE IF NOT EXISTS waypoints (
            id TEXT PRIMARY KEY NOT NULL,
            latitude REAL,
            longitude REAL,
            type TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            message TEXT
        );
    `);
    
    // Migrate existing listings table to add new columns if they don't exist
    const database = ensureDB();
    
    try {
        await database.execAsync(`
            ALTER TABLE listings ADD COLUMN image TEXT;
        `);
    } catch (error: any) {
        // Column already exists, ignore error
        if (!error.message?.includes('duplicate column')) {
            console.error('Migration error:', error);
        }
    }
    
    try {
        await database.execAsync(`
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

// Ensure database is initialized before operations
function ensureDB() {
    if (!db) {
        // Try to initialize with current database name if not already initialized
        console.log(`[DB] ⚠️ Database not initialized, opening: ${currentDatabaseName}`);
        try {
            db = SQLite.openDatabaseSync(currentDatabaseName);
            console.log(`[DB] ✅ Database opened: ${currentDatabaseName}`);
        } catch (error) {
            console.error(`[DB] ❌ Failed to open database ${currentDatabaseName}:`, error);
            // Fallback to default
            currentDatabaseName = 'app.db';
            db = SQLite.openDatabaseSync('app.db');
            console.log(`[DB] ✅ Fallback to default database: app.db`);
        }
    }
    if (!db) {
        throw new Error('Database is null - cannot perform operation. Make sure initDB() is called first.');
    }
    return db;
}

export async function addListing(listing: Listing) {
    const database = ensureDB();
    const result = await database.runAsync(
        'INSERT INTO listings (ressource, vendorName, vendorID, productsInReturn, description, image) VALUES (?, ?, ?, ?, ?, ?)',
        [listing.ressource, listing.vendorName, listing.vendorID, listing.productsInReturn, listing.description ?? null, listing.image ?? null]
    );
    return result.lastInsertRowId;
}

export async function getAllListings(): Promise<Listing[]> {
    const database = ensureDB();
    const rows = await database.getAllAsync('SELECT * FROM listings') as Listing[];
    return rows;
}

export async function getAllListingsWithRessources(): Promise<Array<{ listing: Listing; ressource?: Resource }>> {
    const database = ensureDB();
    const rows = await database.getAllAsync(`
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
    const database = ensureDB();
    const row = await database.getFirstAsync('SELECT * FROM listings WHERE id = ?', [id]) as Listing | null;
    return row ?? null;
}

export async function deleteListingById(id: number) {
    const database = ensureDB();
    await database.runAsync('DELETE FROM listings WHERE id = ?', [id]);
}

/**
 * Delete ALL listings from the database (useful for clearing cache)
 */
export async function deleteAllListings(): Promise<void> {
    const database = ensureDB();
    await database.runAsync('DELETE FROM listings');
    console.log('[DB] ✅ All listings deleted');
}

// --- RESSOURCES ---

export async function addResource(resource: Resource) {
    const database = ensureDB();
    const result = await database.runAsync(
        'INSERT INTO Ressources (name, description, image, quantity) VALUES (?, ?, ?, ?)',
        [resource.name, resource.description, resource.image ?? null, resource.quantity]
    );
    return result.lastInsertRowId;
}

export async function getAllRessources(): Promise<Resource[]> {
    const database = ensureDB();
    const rows = await database.getAllAsync('SELECT * FROM Ressources') as Resource[];
    return rows;
}

export async function getRessourceById(id: number): Promise<Resource | null> {
    const database = ensureDB();
    const row = await database.getFirstAsync('SELECT * FROM Ressources WHERE id = ?', [id]) as Resource | null;
    return row ?? null;
}

export async function getRessourceByName(name: string): Promise<Resource | null> {
    const database = ensureDB();
    const row = await database.getFirstAsync('SELECT * FROM Ressources WHERE name = ? LIMIT 1', [name]) as Resource | null;
    return row ?? null;
}

export async function deleteRessourceById(id: number) {
    const database = ensureDB();
    await database.runAsync('DELETE FROM Ressources WHERE id = ?', [id]);
}

// --- SPÉCIAL CHATBOT (RAG) ---
// C'est la fonction que le bot utilise pour lire ton inventaire
export async function getInventoryForBot(): Promise<string> {
    try {
        const database = ensureDB();
        const rows = await database.getAllAsync(
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

// --- WAYPOINTS ---

export type Waypoint = {
    id: string;
    latitude?: number;
    longitude?: number;
    type: string;
    createdAt: number;
    message?: string;
};

export async function addWaypoint(waypoint: Waypoint): Promise<void> {
    const database = ensureDB();
    await database.runAsync(
        'INSERT OR REPLACE INTO waypoints (id, latitude, longitude, type, createdAt, message) VALUES (?, ?, ?, ?, ?, ?)',
        [waypoint.id, waypoint.latitude ?? null, waypoint.longitude ?? null, waypoint.type, waypoint.createdAt, waypoint.message ?? null]
    );
}

export async function getAllWaypoints(): Promise<Waypoint[]> {
    const database = ensureDB();
    const rows = await database.getAllAsync('SELECT * FROM waypoints ORDER BY createdAt DESC') as Waypoint[];
    return rows;
}

export async function deleteWaypointById(id: string): Promise<void> {
    const database = ensureDB();
    await database.runAsync('DELETE FROM waypoints WHERE id = ?', [id]);
}

export async function clearAllWaypoints(): Promise<void> {
    const database = ensureDB();
    await database.runAsync('DELETE FROM waypoints');
}

export default {
    initDB,
    addListing,
    getAllListings,
    getListingById,
    deleteListingById,
    deleteAllListings,
    addResource,
    getAllRessources,
    getRessourceById,
    getRessourceByName,
    deleteRessourceById,
    getAllListingsWithRessources,
    getInventoryForBot,
    addWaypoint,
    getAllWaypoints,
    deleteWaypointById,
    clearAllWaypoints,
};