const { ActivityHandler, MessageFactory, TurnContext } = require('botbuilder');
const DatabaseHelper = require('../database/dbHelper');

// Helper formatting functions
function formatCurrency(amount) {
    if (typeof amount !== 'number') amount = parseFloat(amount);
    if (isNaN(amount)) return "0.00";
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(amount) {
    if (typeof amount !== 'number') amount = parseFloat(amount);
    if (isNaN(amount)) return "0";
    return amount.toLocaleString('en-US');
}

class Bot extends ActivityHandler {
    constructor(conversationState, userState) {
        super();
        if (!conversationState) throw new Error('[Bot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[Bot]: Missing parameter. userState is required');

        this.conversationState = conversationState;
        this.userState = userState;
        this.dbHelper = new DatabaseHelper();

        // Tạo state property accessors
        this.conversationDataAccessor = this.conversationState.createProperty('ConversationData');
        this.userDataAccessor = this.userState.createProperty('UserData');

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(
                        "🤖 Xin chào! Tôi là Automation Bot.\n\n" +
                        "Vui lòng cho biết role của bạn:\n" +
                        "- Gõ **Admin** nếu bạn là quản trị viên\n" +
                        "- Gõ **User** nếu bạn là nhân viên"
                    );
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMessage(async (context, next) => {
            // Lấy conversation data
            const conversationData = await this.conversationDataAccessor.get(context, {});
            
            const userInput = context.activity.text ? context.activity.text.trim() : "";
            
            // ============ CHỌN ROLE ============
            if (!conversationData.role) {
                if (userInput.toLowerCase() === "admin") {
                    conversationData.role = "admin";
                    conversationData.step = "admin_menu";
                    
                    // Hiển thị thống kê nhanh cho Admin
                    const stats = await this.dbHelper.getSummaryStats();
                    let message = "📊 **BÁO CÁO TỔNG QUAN (ADMIN)**\n\n";
                    message += `💰 Tổng doanh thu: **$${formatCurrency(stats.total_revenue)}**\n`;
                    message += `🍾 Tổng số chai bán: **${formatNumber(stats.total_bottles)}**\n`;
                    message += `🏠 Số cửa hàng ghi nhận: **${formatNumber(stats.total_stores)}**\n\n`;
                    message += "Chọn chức năng:\n";
                    message += "- Gõ **Top** để xem Top 5 sản phẩm bán chạy\n";
                    message += "- Gõ **Exit** để thoát";
                    
                    await context.sendActivity(message);
                    
                } else if (userInput.toLowerCase() === "user") {
                    conversationData.role = "user";
                    conversationData.step = "user_menu";
                    await context.sendActivity(
                        "🔍 **HỆ THỐNG TRA CỨU DOANH SỐ RƯỢU IOWA**\n\n" +
                        "Dữ liệu sẵn sàng! Bạn có thể:\n" +
                        "1️⃣ Gõ **Store [ID]** để tra cứu theo cửa hàng (VD: Store 2501)\n" +
                        "2️⃣ Gõ **City [Tên]** để tra cứu theo thành phố (VD: City Ames)\n" +
                        "3️⃣ Gõ **Exit** để kết thúc"
                    );
                } else {
                    await context.sendActivity(
                        "❌ Vui lòng chọn Role để tiếp tục:\n" +
                        "- **Admin** (Xem báo cáo tổng)\n" +
                        "- **User** (Tra cứu chi tiết)"
                    );
                }
            }
            
            // ============ ADMIN FLOW ============
            else if (conversationData.role === "admin") {
                const userInputLower = userInput.toLowerCase();
                
                if (userInputLower === "top") {
                    const products = await this.dbHelper.getTopProducts();
                    let message = "🏆 **TOP 5 SẢN PHẨM DOANH THU CAO NHẤT:**\n\n";
                    products.forEach((p, i) => {
                        message += `${i + 1}. ${p.name}: **$${formatCurrency(p.revenue)}**\n`;
                    });
                    await context.sendActivity(message);
                }
                else if (userInputLower === "exit") {
                    await context.sendActivity("👋 Đã thoát phiên Admin.");
                    Reflect.deleteProperty(conversationData, 'role');
                    Reflect.deleteProperty(conversationData, 'step');
                } else {
                    await context.sendActivity("Lệnh không hợp lệ. Gõ **Top** hoặc **Exit**.");
                }
            }
            
            // ============ USER FLOW ============
            else if (conversationData.role === "user") {
                const userInputLower = userInput.toLowerCase();
                
                // Tra cứu theo Store
                if (userInputLower.startsWith("store ")) {
                    const storeId = userInput.split(" ")[1];
                    const sales = await this.dbHelper.getSalesByStore(storeId);
                    const message = this._formatSalesResults(sales, `Cửa hàng #${storeId}`);
                    await context.sendActivity(message);
                }
                
                // Tra cứu theo City
                else if (userInputLower.startsWith("city ")) {
                    const cityName = userInput.split(" ").slice(1).join(" ");
                    const sales = await this.dbHelper.getSalesByCity(cityName);
                    const message = this._formatSalesResults(sales, `Thành phố ${cityName}`);
                    await context.sendActivity(message);
                }
                
                else if (userInputLower === "exit") {
                    await context.sendActivity("👋 Cảm ơn bạn đã sử dụng hệ thống tra cứu!");
                    Reflect.deleteProperty(conversationData, 'role');
                    Reflect.deleteProperty(conversationData, 'step');
                } else {
                    await context.sendActivity(
                        "❌ Vui lòng gõ đúng định dạng:\n" +
                        "- **Store [ID]** (VD: Store 2501)\n" +
                        "- **City [Tên]** (VD: City Ames)\n" +
                        "- **Exit**"
                    );
                }
            }
            
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    _formatSalesResults(sales, criteria) {
        if (!sales || sales.length === 0) {
            return `❓ Không tìm thấy dữ liệu cho **${criteria}**.`;
        }
        
        let message = `📋 **KẾT QUẢ GẦN ĐÂY - ${criteria.toUpperCase()}:**\n\n`;
        sales.forEach(s => {
            message += `📅 Ngày: ${s.date}\n`;
            message += `🏪 CH: ${s.store_name}\n`;
            message += `🍾 SP: ${s.product_name}\n`;
            message += `💰 Doanh thu: **$${formatCurrency(s.revenue)}**\n`;
            if ('bottles' in s) {
                message += `📦 Số chai: ${s.bottles}\n`;
            }
            message += "---\n";
        });
        return message;
    }

    async run(context) {
        await super.run(context);
        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}

module.exports.Bot = Bot;
