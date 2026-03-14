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

    // Azure SQL Database Configuration (Sử dụng getter để đảm bảo đọc đúng biến môi trường mới nhất)
    static get SQL_SERVER() { return process.env.SQL_SERVER || "your-server.database.windows.net"; }
    static get SQL_DATABASE() { return process.env.SQL_DATABASE || "your-database"; }
    static get SQL_USERNAME() { return process.env.SQL_USERNAME || "your-username"; }
    static get SQL_PASSWORD() { return process.env.SQL_PASSWORD || "your-password"; }

    static getSqlConfig() {
        return {
            user: this.SQL_USERNAME,
            password: this.SQL_PASSWORD,
            server: this.SQL_SERVER,
            database: this.SQL_DATABASE,
            options: {
                encrypt: true,
                trustServerCertificate: false,
                connectionTimeout: 30000,
                requestTimeout: 60000 // Tăng thời gian chờ lên 60s
            }
        };
    }
}

module.exports = DefaultConfig;
