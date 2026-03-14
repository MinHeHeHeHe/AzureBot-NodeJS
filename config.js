require('dotenv').config();

class DefaultConfig {
    static PORT = process.env.PORT || 3978;
    static MicrosoftAppId = process.env.MicrosoftAppId || "";
    static MicrosoftAppPassword = process.env.MicrosoftAppPassword || "";
    static MicrosoftAppType = process.env.MicrosoftAppType || "SingleTenant";
    static MicrosoftAppTenantId = process.env.MicrosoftAppTenantId || "";

    // Keep original names just in case they are used elsewhere
    static APP_ID = process.env.MicrosoftAppId || "";
    static APP_PASSWORD = process.env.MicrosoftAppPassword || "";
    static APP_TYPE_OLD = process.env.MicrosoftAppType || "SingleTenant";
    static APP_TENANTID_OLD = process.env.MicrosoftAppTenantId || "";

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
