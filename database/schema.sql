-- SQL schema for the listings table
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY NOT NULL,
  ressource INTEGER,
  vendorName TEXT,
  vendorID TEXT,
  productsInReturn TEXT
);

-- SQL schema for the Ressources table
CREATE TABLE IF NOT EXISTS Ressources (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT,
  description TEXT,
  image TEXT,
  quantity INTEGER
);