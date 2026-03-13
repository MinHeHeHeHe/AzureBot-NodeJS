require('dotenv').config();

class DefaultConfig {
    static PORT = process.env.PORT || 3978;
    static APP_ID = process.env.MicrosoftAppId || "";
    static APP_PASSWORD = process.env.MicrosoftAppPassword || "";
    static APP_TYPE = process.env.MicrosoftAppType || "MultiTenant";
    static APP_TENANTID = process.env.MicrosoftAppTenantId || "";

    // Azure SQL Database Configuration
    static SQL_SERVER = process.env.SQL_SERVER || "your-server.database.windows.net";
    static SQL_DATABASE = process.env.SQL_DATABASE || "your-database";
    static SQL_USERNAME = process.env.SQL_USERNAME || "your-username";
    static SQL_PASSWORD = process.env.SQL_PASSWORD || "your-password";

    static getSqlConfig() {
        return {
            user: this.SQL_USERNAME,
            password: this.SQL_PASSWORD,
            server: this.SQL_SERVER,
            database: this.SQL_DATABASE,
            options: {
                encrypt: true,
                trustServerCertificate: false,
                connectionTimeout: 30000
            }
        };
    }
}

module.exports = DefaultConfig;
