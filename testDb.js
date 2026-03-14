const DatabaseHelper = require('./database/dbHelper');

async function runTest() {
    console.log("Testing database connection to Iowa Liquor Sales 2022...");
    const db = new DatabaseHelper();
    console.log(`Connecting to: ${db.config.server} (DB: ${db.config.database})`);
    console.log("-".repeat(50));

    try {
        const pool = await db.get_connection();
        console.log("✅ Connection successful!");
        
        // Test 1: Count records in the table
        let result = await pool.request().query("SELECT COUNT(*) as count FROM dbo.Final_Iowa_Liquor_Sales2022");
        const count = result.recordset[0].count;
        console.log(`✅ Found ${count.toLocaleString('en-US')} sales records in dbo.Final_Iowa_Liquor_Sales2022`);
        
        // Test 3: Check Date Range
        console.log("\n📅 Checking data date range:");
        result = await pool.request().query("SELECT MIN(date) as min_date, MAX(date) as max_date FROM dbo.Final_Iowa_Liquor_Sales2022");
        const { min_date, max_date } = result.recordset[0];
        console.log(`   Min Date: ${min_date}`);
        console.log(`   Max Date: ${max_date}`);

        // Test 4: Count records by month in 2022
        console.log("\n📅 Records count by month (2022):");
        result = await pool.request().query(`
            SELECT MONTH(date) as month, COUNT(*) as count 
            FROM dbo.Final_Iowa_Liquor_Sales2022 
            WHERE YEAR(date) = 2022
            GROUP BY MONTH(date)
            ORDER BY month
        `);
        result.recordset.forEach(row => {
            console.log(`   Month ${row.month}: ${row.count} records`);
        });

        // Test 5: Test New Functions (e.g., get_summary_stats)
        console.log("\n📊 Testing get_summary_stats():");
        const stats = await db.get_summary_stats();
        console.log(`   Total Revenue: $${(stats.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`   Total Bottles: ${(stats.total_bottles || 0).toLocaleString('en-US')}`);
        console.log(`   Total Stores: ${stats.total_stores || 0}`);
        
        console.log("\n✅ Database diagnostics completed!");
        
    } catch (e) {
        console.error(`❌ Verification failed: ${e.message}`);
        console.log("\n💡 TIP: Make sure your credentials in config.js or .env are correct.");
    } finally {
        process.exit();
    }
}

runTest();
