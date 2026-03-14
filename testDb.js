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
        let result = await pool.request().query("SELECT COUNT(*) as count FROM dbo.Iowa_Liquor_Sales2022");
        const count = result.recordset[0].count;
        console.log(`✅ Found ${count.toLocaleString('en-US')} sales records in dbo.Iowa_Liquor_Sales2022`);
        
        // Test 2: Peek at the first 3 records
        console.log("\n🔍 First 3 records:");
        result = await pool.request().query("SELECT TOP 3 store_name, city, sale_dollars FROM dbo.Iowa_Liquor_Sales2022");
        result.recordset.forEach(row => {
            const sale = row.sale_dollars ? parseFloat(row.sale_dollars) : 0;
            console.log(` - Store: ${row.store_name}, City: ${row.city}, Sale: $${sale.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        });

        // Test 3: Test New Functions (e.g., get_summary_stats)
        console.log("\n📊 Testing get_summary_stats():");
        const stats = await db.get_summary_stats();
        console.log(`   Total Revenue: $${stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`   Total Bottles: ${stats.total_bottles.toLocaleString('en-US')}`);
        console.log(`   Total Stores: ${stats.total_stores}`);
        
        console.log("\n✅ Database is ready and structure is verified!");
        
    } catch (e) {
        console.error(`❌ Verification failed: ${e.message}`);
        console.log("\n💡 TIP: Make sure your credentials in config.js or .env are correct.");
    } finally {
        process.exit();
    }
}

runTest();
