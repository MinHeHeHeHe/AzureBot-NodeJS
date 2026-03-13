const sql = require('mssql');
const DefaultConfig = require('../config');

class DatabaseHelper {
    constructor() {
        this.config = DefaultConfig.getSqlConfig();
    }

    async getConnection() {
        if (!this.pool) {
            this.pool = await sql.connect(this.config);
        }
        return this.pool;
    }

    // ========== ADMIN FUNCTIONS ==========
    async getSummaryStats() {
        try {
            const pool = await this.getConnection();
            const result = await pool.request().query(`
                SELECT 
                    SUM(sale_dollars) as TotalRevenue,
                    SUM(bottles_sold) as TotalBottles,
                    COUNT(DISTINCT store_id) as TotalStores
                FROM dbo.Iowa_Liquor_Sales2022
            `);
            const row = result.recordset[0];
            return {
                total_revenue: row.TotalRevenue ? parseFloat(row.TotalRevenue) : 0,
                total_bottles: row.TotalBottles ? parseInt(row.TotalBottles) : 0,
                total_stores: row.TotalStores ? parseInt(row.TotalStores) : 0
            };
        } catch (error) {
            console.error(`Error getting summary stats: ${error}`);
            return {};
        }
    }

    async getTopProducts(limit = 5) {
        try {
            const pool = await this.getConnection();
            const result = await pool.request().query(`
                SELECT TOP ${limit} product_name, SUM(sale_dollars) as Revenue
                FROM dbo.Iowa_Liquor_Sales2022
                GROUP BY product_name
                ORDER BY Revenue DESC
            `);
            
            return result.recordset.map(row => ({
                name: row.product_name,
                revenue: row.Revenue ? parseFloat(row.Revenue) : 0
            }));
        } catch (error) {
            console.error(`Error getting top products: ${error}`);
            return [];
        }
    }

    // ========== USER FUNCTIONS ==========
    async getSalesByStore(storeId) {
        try {
            const pool = await this.getConnection();
            const result = await pool.request()
                .input('store_id', sql.NVarChar, storeId)
                .query(`
                    SELECT TOP 10 date, store_name, product_name, sale_dollars, bottles_sold
                    FROM dbo.Iowa_Liquor_Sales2022
                    WHERE store_id = @store_id
                    ORDER BY date DESC
                `);
            
            return result.recordset.map(row => ({
                date: row.date ? new Date(row.date).toLocaleDateString('vi-VN') : "N/A",
                store_name: row.store_name,
                product_name: row.product_name,
                revenue: row.sale_dollars ? parseFloat(row.sale_dollars) : 0,
                bottles: row.bottles_sold ? parseInt(row.bottles_sold) : 0
            }));
        } catch (error) {
            console.error(`Error getting store sales: ${error}`);
            return [];
        }
    }

    async getSalesByCity(city) {
        try {
            const pool = await this.getConnection();
            const result = await pool.request()
                .input('city', sql.NVarChar, `%${city}%`)
                .query(`
                    SELECT TOP 10 date, store_name, product_name, sale_dollars
                    FROM dbo.Iowa_Liquor_Sales2022
                    WHERE city LIKE @city
                    ORDER BY date DESC
                `);
            
            return result.recordset.map(row => ({
                date: row.date ? new Date(row.date).toLocaleDateString('vi-VN') : "N/A",
                store_name: row.store_name,
                product_name: row.product_name,
                revenue: row.sale_dollars ? parseFloat(row.sale_dollars) : 0
            }));
        } catch (error) {
            console.error(`Error getting city sales: ${error}`);
            return [];
        }
    }
}

module.exports = DatabaseHelper;
