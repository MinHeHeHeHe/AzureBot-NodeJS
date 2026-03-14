// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const sql = require('mssql');
const DefaultConfig = require('../config');

class DatabaseHelper {
    constructor() {
        this.config = DefaultConfig.getSqlConfig();
        // Giả sử config trả về đối tượng kết nối của mssql
    }

    async get_connection() {
        /** Tạo kết nối đến Azure SQL Database */
        try {
            return await sql.connect(this.config);
        } catch (err) {
            console.error("CRITICAL SQL CONNECTION ERROR:", err.message);
            throw err;
        }
    }
    async getConnection() { return this.get_connection(); }

    // ─── SUMMARY ───────────────────────────────────────────────────────────────

    async get_summary_stats() {
        /** Lấy doanh số tổng quát */
        try {
            const pool = await this.get_connection();
            const result = await pool.request().query(`
                SELECT
                    SUM(sale_dollars) as TotalRevenue,
                    SUM(bottles_sold) as TotalBottles,
                    COUNT(DISTINCT store_id) as TotalStores
                FROM dbo.Final_Iowa_Liquor_Sales2022
            `);
            const row = result.recordset[0];
            return {
                total_revenue: row.TotalRevenue ? parseFloat(row.TotalRevenue) : 0,
                total_bottles: row.TotalBottles ? parseInt(row.TotalBottles) : 0,
                total_stores: row.TotalStores ? parseInt(row.TotalStores) : 0,
            };
        } catch (error) {
            console.error(`Error getting summary stats: ${error}`);
            return {};
        }
    }
    async getSummaryStats() { return this.get_summary_stats(); }

    // ─── COUNTY / CITY / STORE DRILL-DOWN ──────────────────────────────────────

    async get_counties(from_date = null, to_date = null) {
        /** Lấy danh sách tất cả county (có thể lọc theo ngày) */
        try {
            const pool = await this.get_connection();
            let query = `
                SELECT DISTINCT county
                FROM dbo.Final_Iowa_Liquor_Sales2022
                WHERE county IS NOT NULL AND county != ''
            `;
            const request = pool.request();

            if (from_date) {
                query += " AND date >= @from_date";
                request.input('from_date', sql.Date, new Date(from_date));
            }
            if (to_date) {
                query += " AND date <= @to_date";
                request.input('to_date', sql.Date, new Date(to_date));
            }
            query += " ORDER BY county";

            const result = await request.query(query);
            return result.recordset.map(row => row.county);
        } catch (error) {
            console.error(`Error getting counties: ${error}`);
            return [];
        }
    }
    async getCounties(f, t) { return this.get_counties(f, t); }

    async get_cities_by_county(county, from_date = null, to_date = null) {
        /** Lấy danh sách thành phố trong một county */
        try {
            const pool = await this.get_connection();
            let query = `
                SELECT DISTINCT city
                FROM dbo.Final_Iowa_Liquor_Sales2022
                WHERE county = @county AND city IS NOT NULL AND city != ''
            `;
            const request = pool.request();
            request.input('county', sql.VarChar, county);

            if (from_date) {
                query += " AND date >= @from_date";
                request.input('from_date', sql.Date, new Date(from_date));
            }
            if (to_date) {
                query += " AND date <= @to_date";
                request.input('to_date', sql.Date, new Date(to_date));
            }
            query += " ORDER BY city";

            const result = await request.query(query);
            return result.recordset.map(row => row.city);
        } catch (error) {
            console.error(`Error getting cities: ${error}`);
            return [];
        }
    }
    async getCitiesByCounty(c, f, t) { return this.get_cities_by_county(c, f, t); }

    async get_stores_by_city(city, county, from_date = null, to_date = null) {
        /** Lấy danh sách cửa hàng trong một city */
        try {
            const pool = await this.get_connection();
            let query = `
                SELECT DISTINCT store_id, store_name
                FROM dbo.Final_Iowa_Liquor_Sales2022
                WHERE city = @city AND county = @county
                  AND store_id IS NOT NULL AND store_name IS NOT NULL
            `;
            const request = pool.request();
            request.input('city', sql.VarChar, city);
            request.input('county', sql.VarChar, county);

            if (from_date) {
                query += " AND date >= @from_date";
                request.input('from_date', sql.Date, new Date(from_date));
            }
            if (to_date) {
                query += " AND date <= @to_date";
                request.input('to_date', sql.Date, new Date(to_date));
            }
            query += " ORDER BY store_name";

            const result = await request.query(query);
            return result.recordset.map(row => ({
                store_id: row.store_id,
                store_name: row.store_name
            }));
        } catch (error) {
            console.error(`Error getting stores: ${error}`);
            return [];
        }
    }
    async getStoresByCity(ci, co, f, t) { return this.get_stores_by_city(ci, co, f, t); }

    async get_revenue_by_store(store_id, from_date = null, to_date = null) {
        /** Tổng doanh thu của một cửa hàng */
        try {
            const pool = await this.get_connection();
            let query = `
                SELECT store_name,
                       SUM(sale_dollars) as TotalRevenue,
                       SUM(bottles_sold) as TotalBottles
                FROM dbo.Final_Iowa_Liquor_Sales2022
                WHERE store_id = @store_id
            `;
            const request = pool.request();
            request.input('store_id', sql.VarChar, store_id);

            if (from_date) {
                query += " AND date >= @from_date";
                request.input('from_date', sql.Date, new Date(from_date));
            }
            if (to_date) {
                query += " AND date <= @to_date";
                request.input('to_date', sql.Date, new Date(to_date));
            }
            query += " GROUP BY store_name";

            const result = await request.query(query);
            const row = result.recordset[0];
            if (row) {
                return {
                    store_name: row.store_name,
                    total_revenue: row.TotalRevenue ? parseFloat(row.TotalRevenue) : 0,
                    total_bottles: row.TotalBottles ? parseInt(row.TotalBottles) : 0,
                };
            }
            return {};
        } catch (error) {
            console.error(`Error getting store revenue: ${error}`);
            return {};
        }
    }
    async getRevenueByStore(s, f, t) { return this.get_revenue_by_store(s, f, t); }

    async get_revenue_by_county(county, from_date = null, to_date = null) {
        /** Tổng doanh thu của một county */
        try {
            const pool = await this.get_connection();
            let query = `
                SELECT SUM(sale_dollars) as TotalRevenue,
                       SUM(bottles_sold) as TotalBottles,
                       COUNT(DISTINCT store_id) as TotalStores
                FROM dbo.Final_Iowa_Liquor_Sales2022
                WHERE county = @county
            `;
            const request = pool.request();
            request.input('county', sql.VarChar, county);

            if (from_date) {
                query += " AND date >= @from_date";
                request.input('from_date', sql.Date, new Date(from_date));
            }
            if (to_date) {
                query += " AND date <= @to_date";
                request.input('to_date', sql.Date, new Date(to_date));
            }

            const result = await request.query(query);
            const row = result.recordset[0];
            if (row) {
                return {
                    total_revenue: row.TotalRevenue ? parseFloat(row.TotalRevenue) : 0,
                    total_bottles: row.TotalBottles ? parseInt(row.TotalBottles) : 0,
                    total_stores: row.TotalStores ? parseInt(row.TotalStores) : 0,
                };
            }
            return {};
        } catch (error) {
            console.error(`Error getting county revenue: ${error}`);
            return {};
        }
    }
    async getRevenueByCounty(c, f, t) { return this.get_revenue_by_county(c, f, t); }

    // ─── PRODUCT RANKINGS ──────────────────────────────────────────────────────

    async get_top_products(limit = 5, from_date = null, to_date = null) {
        /** Top N sản phẩm bán nhiều nhất (theo bottles_sold), nếu bằng số chai thì lọc doanh thu thấp -> cao */
        try {
            const pool = await this.get_connection();
            let query = `
                SELECT TOP ${parseInt(limit)} product_name,
                       SUM(bottles_sold) as TotalBottles,
                       SUM(sale_dollars) as TotalRevenue
                FROM dbo.Final_Iowa_Liquor_Sales2022
                WHERE 1=1
            `;
            const request = pool.request();

            if (from_date) {
                query += " AND date >= @from_date";
                request.input('from_date', sql.Date, new Date(from_date));
            }
            if (to_date) {
                query += " AND date <= @to_date";
                request.input('to_date', sql.Date, new Date(to_date));
            }
            query += " GROUP BY product_name ORDER BY TotalBottles DESC, TotalRevenue DESC";

            const result = await request.query(query);
            return result.recordset.map(row => ({
                name: row.product_name,
                bottles: row.TotalBottles ? parseInt(row.TotalBottles) : 0,
                revenue: row.TotalRevenue ? parseFloat(row.TotalRevenue) : 0,
            }));
        } catch (error) {
            console.error(`Error getting top products: ${error}`);
            return [];
        }
    }
    async getTopProducts(l, f, t) { return this.get_top_products(l, f, t); }

    async get_bottom_products(limit = 5, from_date = null, to_date = null) {
        /** Top N sản phẩm bán ít nhất (theo bottles_sold), nếu bằng số chai thì lọc doanh thu thấp -> cao */
        try {
            const pool = await this.get_connection();
            let query = `
                SELECT TOP ${parseInt(limit)} product_name,
                       SUM(bottles_sold) as TotalBottles,
                       SUM(sale_dollars) as TotalRevenue
                FROM dbo.Final_Iowa_Liquor_Sales2022
                WHERE 1=1
            `;
            const request = pool.request();

            if (from_date) {
                query += " AND date >= @from_date";
                request.input('from_date', sql.Date, new Date(from_date));
            }
            if (to_date) {
                query += " AND date <= @to_date";
                request.input('to_date', sql.Date, new Date(to_date));
            }
            query += " GROUP BY product_name ORDER BY TotalBottles ASC, TotalRevenue ASC";

            const result = await request.query(query);
            return result.recordset.map(row => ({
                name: row.product_name,
                bottles: row.TotalBottles ? parseInt(row.TotalBottles) : 0,
                revenue: row.TotalRevenue ? parseFloat(row.TotalRevenue) : 0,
            }));
        } catch (error) {
            console.error(`Error getting bottom products: ${error}`);
            return [];
        }
    }
    async getBottomProducts(l, f, t) { return this.get_bottom_products(l, f, t); }
}

module.exports = DatabaseHelper;
