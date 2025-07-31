import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('appdata.db');

// Initialize the database and create tables
export function initializeDatabase() {
  db.withTransactionAsync(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        photoUri TEXT
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY NOT NULL,
        productId TEXT NOT NULL,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        date TEXT NOT NULL
      );`
    );
  });
}

// Load products from the database
export function loadProducts(setProducts) {
  db.withTransactionAsync(tx => {
    tx.executeSql(
      'SELECT * FROM products;',
      [],
      (_, { rows }) => {
        const products = [];
        for (let i = 0; i < rows.length; i++) {
          products.push(rows.item(i));
        }
        setProducts(products);
      },
      (_, error) => {
        console.error('Error loading products:', error);
      }
    );
  });
}

// Save or update a product in the database
export function saveProduct(product) {
  db.withTransactionAsync(tx => {
    tx.executeSql(
      'REPLACE INTO products (id, name, price, photoUri) VALUES (?, ?, ?, ?);',
      [product.id, product.name, product.price, product.photoUri],
      null,
      (_, error) => {
        console.error('Error saving product:', error);
      }
    );
  });
}

// Delete a product from the database
export function deleteProduct(id) {
  db.withTransactionAsync(tx => {
    tx.executeSql(
      'DELETE FROM products WHERE id = ?;',
      [id],
      null,
      (_, error) => {
        console.error('Error deleting product:', error);
      }
    );
  });
}

// Save a sale in the database
export function saveSale(sale) {
  db.withTransactionAsync(tx => {
    tx.executeSql(
      'INSERT INTO sales (id, productId, productName, quantity, price, paymentMethod, date) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [sale.id, sale.productId, sale.productName, sale.quantity, sale.price, sale.paymentMethod, sale.date],
      null,
      (_, error) => {
        console.error('Error saving sale:', error);
      }
    );
  });
}

// Load sales from the database
export function loadSales(setSales) {
  db.withTransactionAsync(tx => {
    tx.executeSql(
      'SELECT * FROM sales ORDER BY date DESC;',
      [],
      (_, { rows }) => {
        const sales = [];
        for (let i = 0; i < rows.length; i++) {
          sales.push(rows.item(i));
        }
        setSales(sales);
      },
      (_, error) => {
        console.error('Error loading sales:', error);
      }
    );
  });
}
