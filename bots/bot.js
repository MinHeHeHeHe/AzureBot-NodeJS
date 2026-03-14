// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, TurnContext } = require('botbuilder');
const DatabaseHelper = require('../database/dbHelper');

// ─── CONVERSATION STATES ────────────────────────────────────────────────────
const STATE_MAIN_MENU         = "MAIN_MENU";
const STATE_DATE_FROM         = "DATE_FROM";          // chờ nhập ngày bắt đầu
const STATE_DATE_TO           = "DATE_TO";            // chờ nhập ngày kết thúc
const STATE_COUNTY_LIST       = "COUNTY_LIST";        // hiện list county
const STATE_CITY_LIST         = "CITY_LIST";          // hiện list city của county đã chọn
const STATE_STORE_LIST        = "STORE_LIST";         // hiện list store của city đã chọn
const STATE_END_RESULT        = "END_RESULT";         // hiện kết quả cuối cùng, chờ gõ Menu

const MONTH_NAMES = {
    1: "Tháng 1", 2: "Tháng 2", 3: "Tháng 3",
    4: "Tháng 4", 5: "Tháng 5", 6: "Tháng 6",
    7: "Tháng 7", 8: "Tháng 8", 9: "Tháng 9",
    10: "Tháng 10", 11: "Tháng 11", 12: "Tháng 12",
};

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function _fmt_date_range(from_date, to_date) {
    // Chuỗi mô tả khoảng thời gian (dạng YYYY-MM-DD)
    if (from_date || to_date) {
        const f = from_date ? from_date.substring(0, 7) : "bắt đầu";
        const t = to_date ? to_date.substring(0, 7) : "kết thúc";
        return ` (từ ${f} đến ${t})`;
    }
    return "";
}

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
        this.conversationState = conversationState;
        this.userState = userState;
        this.dbHelper = new DatabaseHelper();
        this.convAccessor = this.conversationState.createProperty("ConvData");

        // ─── WELCOME ─────────────────────────────────────────────────────────────
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    const conv = await this.convAccessor.get(context, {});
                    for (let key in conv) delete conv[key];
                    conv.state = STATE_MAIN_MENU;
                    await this.convAccessor.set(context, conv);
                    await context.sendActivity(this._main_menu_message());
                }
            }
            await next();
        });

        // ─── MESSAGE HANDLER ─────────────────────────────────────────────────────
        this.onMessage(async (context, next) => {
            const text = context.activity.text ? context.activity.text.trim() : "";
            const text_lower = text.toLowerCase();

            // Lệnh reset về menu — chấp nhận "menu" hoặc "Menu"
            if (text_lower === "menu") {
                const conv = await this.convAccessor.get(context, {});
                for (let key in conv) delete conv[key];
                conv.state = STATE_MAIN_MENU;
                await this.convAccessor.set(context, conv);
                await context.sendActivity(this._main_menu_message());
            } else {
                const conv = await this.convAccessor.get(context, {});
                if (!conv.state) {
                    conv.state = STATE_MAIN_MENU;
                }
                await this._dispatch(context, conv, text, text_lower);
            }

            await this.conversationState.saveChanges(context);
            await this.userState.saveChanges(context);
            
            await next();
        });
    }

    // ─── STATE MACHINE DISPATCH ───────────────────────────────────────────────

    async _dispatch(ctx, conv, text, text_lower) {
        const state = conv.state || STATE_MAIN_MENU;

        // ── MAIN MENU ──
        if (state === STATE_MAIN_MENU) {
            if (["1", "2", "3"].includes(text)) {
                conv.menu_choice = text;
                conv.state = STATE_DATE_FROM;
                await this.convAccessor.set(ctx, conv);
                await ctx.sendActivity(
                    "📅 **Nhập tháng bắt đầu** (1–12)\n" +
                    "hoặc gõ **skip** để bỏ qua bộ lọc tháng:"
                );
            } else {
                await ctx.sendActivity(this._main_menu_message());
            }
        }

        // ── NHẬP THÁNG BẮT ĐẦU ──
        else if (state === STATE_DATE_FROM) {
            if (text_lower === "skip") {
                conv.from_month = null;
                conv.state = STATE_DATE_TO;
                await this.convAccessor.set(ctx, conv);
                await ctx.sendActivity(
                    "📅 **Tháng kết thúc?** Nhập số tháng (1–12)\n" +
                    "hoặc gõ **skip** để lấy toàn bộ năm 2022:"
                );
            } else {
                const m = parseInt(text, 10);
                if (!isNaN(m)) {
                    if (m >= 1 && m <= 12) {
                        conv.from_month = m;
                        conv.state = STATE_DATE_TO;
                        await this.convAccessor.set(ctx, conv);
                        await ctx.sendActivity(
                            `📅 Từ **${MONTH_NAMES[m]}**. Bây giờ nhập **tháng kết thúc** (1–12)\n` +
                            "hoặc gõ **skip** để đến cuối năm:"
                        );
                    } else {
                        await ctx.sendActivity("❌ Vui lòng nhập số tháng từ **1 đến 12**.");
                    }
                } else {
                    await ctx.sendActivity("❌ Vui lòng nhập **số** tháng (ví dụ: 3 cho Tháng 3).");
                }
            }
        }

        // ── NHẬP THÁNG KẾT THÚC ──
        else if (state === STATE_DATE_TO) {
            if (text_lower === "skip") {
                conv.to_month = null;
            } else {
                const m = parseInt(text, 10);
                if (!isNaN(m)) {
                    if (m >= 1 && m <= 12) {
                        conv.to_month = m;
                    } else {
                        await ctx.sendActivity("❌ Vui lòng nhập số tháng từ **1 đến 12**.");
                        return;
                    }
                } else {
                    await ctx.sendActivity("❌ Vui lòng nhập **số** tháng (ví dụ: 6 cho Tháng 6).");
                    return;
                }
            }

            // Chuyển tháng → date string (Tự động nhận diện năm từ dữ liệu)
            const from_m = conv.from_month;
            const to_m = conv.to_month;
            const target_year = 2022; // Mặc định 2022 theo bảng của bạn
            
            const formatPadded = (num) => num.toString().padStart(2, '0');
            
            conv.from_date = from_m ? `${target_year}-${formatPadded(from_m)}-01` : null;
            if (to_m) {
                const last_day = getDaysInMonth(target_year, to_m);
                conv.to_date = `${target_year}-${formatPadded(to_m)}-${formatPadded(last_day)}`;
            } else {
                conv.to_date = null;
            }
            await this.convAccessor.set(ctx, conv);

            const choice = conv.menu_choice;
            if (choice === "1") {
                // Doanh thu → hiện list county
                await this._show_county_list(ctx, conv);
            } else if (choice === "2") {
                // Top 5 bán nhiều nhất
                await this._show_top5(ctx, conv);
            } else if (choice === "3") {
                // Top 5 bán ít nhất
                await this._show_bottom5(ctx, conv);
            }
        }

        // ── CHỌN COUNTY ──
        else if (state === STATE_COUNTY_LIST) {
            const counties = conv.counties || [];
            const idx = parseInt(text, 10) - 1;
            if (!isNaN(idx)) {
                if (idx >= 0 && idx < counties.length) {
                    conv.selected_county = counties[idx];
                    await this.convAccessor.set(ctx, conv);
                    await this._show_city_list(ctx, conv);
                } else {
                    await ctx.sendActivity("❌ Số không hợp lệ. " + this._retype_hint(counties));
                }
            } else {
                await ctx.sendActivity("❌ Vui lòng nhập **số thứ tự** của county.");
            }
        }

        // ── CHỌN CITY ──
        else if (state === STATE_CITY_LIST) {
            const cities = conv.cities || [];
            // Option 0 = Exit (doanh thu toàn county)
            if (text === "0") {
                const county = conv.selected_county || "";
                await this._show_county_revenue(ctx, conv, county);
            } else {
                const idx = parseInt(text, 10) - 1;
                if (!isNaN(idx)) {
                    if (idx >= 0 && idx < cities.length) {
                        conv.selected_city = cities[idx];
                        await this.convAccessor.set(ctx, conv);
                        await this._show_store_list(ctx, conv);
                    } else {
                        await ctx.sendActivity("❌ Số không hợp lệ. " + this._retype_hint(cities, true));
                    }
                } else {
                    await ctx.sendActivity("❌ Vui lòng nhập **số thứ tự** của thành phố hoặc **0** để xem doanh thu toàn county.");
                }
            }
        }

        // ── CHỌN STORE ──
        else if (state === STATE_STORE_LIST) {
            const stores = conv.stores || [];
            const idx = parseInt(text, 10) - 1;
            if (!isNaN(idx)) {
                if (idx >= 0 && idx < stores.length) {
                    const store = stores[idx];
                    await this._show_store_revenue(ctx, conv, store);
                } else {
                    await ctx.sendActivity("❌ Số không hợp lệ. Vui lòng chọn lại.");
                }
            } else {
                await ctx.sendActivity("❌ Vui lòng nhập **số thứ tự** của cửa hàng.");
            }
        }

        // ── KẾT QUẢ CUỐI CÙNG ──
        else if (state === STATE_END_RESULT) {
            await ctx.sendActivity("👉 Gõ **menu** (hoặc **Menu**) để quay lại menu chính.");
        }

        else {
            await ctx.sendActivity("👉 Gõ **Menu** để quay lại menu chính.");
        }
    }

    // ─── HELPER: SHOW SCREENS ─────────────────────────────────────────────────

    async _show_county_list(ctx, conv) {
        const from_date = conv.from_date;
        const to_date = conv.to_date;
        const counties = await this.dbHelper.getCounties(from_date, to_date);
        conv.counties = counties;
        conv.state = STATE_COUNTY_LIST;
        await this.convAccessor.set(ctx, conv);

        if (!counties || counties.length === 0) {
            await ctx.sendActivity("❌ Không có dữ liệu county trong khoảng thời gian này.");
            for (let key in conv) delete conv[key];
            conv.state = STATE_MAIN_MENU;
            await this.convAccessor.set(ctx, conv);
            return;
        }

        const date_info = _fmt_date_range(from_date, to_date);
        let msg = `🗺️ **DANH SÁCH COUNTY**${date_info}\n\n`;
        msg += "Nhập **số thứ tự** để chọn county:\n\n";
        counties.forEach((c, i) => {
            msg += `  ${i + 1}. ${c}\n`;
        });
        await ctx.sendActivity(msg);
    }

    async _show_city_list(ctx, conv) {
        const county = conv.selected_county || "";
        const from_date = conv.from_date;
        const to_date = conv.to_date;
        const cities = await this.dbHelper.getCitiesByCounty(county, from_date, to_date);
        conv.cities = cities;
        conv.state = STATE_CITY_LIST;
        await this.convAccessor.set(ctx, conv);

        if (!cities || cities.length === 0) {
            await ctx.sendActivity(`❌ Không có dữ liệu thành phố cho county **${county}**.`);
            return;
        }

        const date_info = _fmt_date_range(from_date, to_date);
        let msg = `🏙️ **THÀNH PHỐ TRONG QUẬN (HẠT) ${county.toUpperCase()}**${date_info}\n\n`;
        msg += "Nhập **số thứ tự** để chọn thành phố:\n\n";
        cities.forEach((c, i) => {
            msg += `  ${i + 1}. ${c}\n`;
        });
        msg += "\n**0.** ⬅️ Xem doanh thu toàn bộ Quận (hạt) (bỏ qua chọn thành phố)";
        await ctx.sendActivity(msg);
    }

    async _show_store_list(ctx, conv) {
        const city = conv.selected_city || "";
        const county = conv.selected_county || "";
        const from_date = conv.from_date;
        const to_date = conv.to_date;
        const stores = await this.dbHelper.getStoresByCity(city, county, from_date, to_date);
        conv.stores = stores;
        conv.state = STATE_STORE_LIST;
        await this.convAccessor.set(ctx, conv);

        if (!stores || stores.length === 0) {
            await ctx.sendActivity(`❌ Không có cửa hàng nào tại **${city}**.`);
            return;
        }

        const date_info = _fmt_date_range(from_date, to_date);
        let msg = `🏪 **CỬA HÀNG TẠI ${city.toUpperCase()}**${date_info}\n\n`;
        msg += "Nhập **số thứ tự** để xem doanh thu:\n\n";
        stores.forEach((s, i) => {
            msg += `  ${i + 1}. ${s.store_name} (ID: ${s.store_id})\n`;
        });
        await ctx.sendActivity(msg);
    }

    async _show_county_revenue(ctx, conv, county) {
        const from_date = conv.from_date;
        const to_date = conv.to_date;
        const data = await this.dbHelper.getRevenueByCounty(county, from_date, to_date);
        const date_info = _fmt_date_range(from_date, to_date);

        if (!data) {
            await ctx.sendActivity(`❌ Không tìm thấy dữ liệu cho county **${county}**.`);
        } else {
            let msg = `📊 **DOANH THU QUẬN (HẠT) ${county.toUpperCase()}**${date_info}\n\n`;
            msg += `💰 Tổng doanh thu: **$${formatCurrency(data.total_revenue)}**\n`;
            msg += `📦 Số chai bán: **${formatNumber(data.total_bottles)}**\n`;
            msg += `🏪 Số cửa hàng: **${formatNumber(data.total_stores)}**\n\n`;
            msg += "Gõ **Menu** để quay lại menu chính.";
            await ctx.sendActivity(msg);
        }

        conv.state = STATE_END_RESULT;
        await this.convAccessor.set(ctx, conv);
    }

    async _show_store_revenue(ctx, conv, store) {
        const from_date = conv.from_date;
        const to_date = conv.to_date;
        const data = await this.dbHelper.getRevenueByStore(store.store_id, from_date, to_date);
        const date_info = _fmt_date_range(from_date, to_date);

        if (!data) {
            await ctx.sendActivity(`❌ Không tìm thấy dữ liệu cho cửa hàng **${store.store_name}**.`);
        } else {
            let msg = `🏪 **DOANH THU CỬA HÀNG**${date_info}\n\n`;
            msg += `🏷️ Tên: **${data.store_name}** (ID: ${store.store_id})\n`;
            msg += `💰 Tổng doanh thu: **$${formatCurrency(data.total_revenue)}**\n`;
            msg += `📦 Số chai bán: **${formatNumber(data.total_bottles)}**\n\n`;
            msg += "Gõ **Menu** để quay lại menu chính.";
            await ctx.sendActivity(msg);
        }

        conv.state = STATE_END_RESULT;
        await this.convAccessor.set(ctx, conv);
    }

    async _show_top5(ctx, conv) {
        const from_date = conv.from_date;
        const to_date = conv.to_date;
        const products = await this.dbHelper.getTopProducts(5, from_date, to_date);
        const date_info = _fmt_date_range(from_date, to_date);

        if (!products || products.length === 0) {
            await ctx.sendActivity("❌ Không có dữ liệu sản phẩm.");
        } else {
            let msg = `🏆 **TOP 5 RƯỢU BÁN NHIỀU NHẤT**${date_info}\n\n`;
            products.forEach((p, i) => {
                msg += `${i + 1}️⃣ **${p.name}**\n`;
                msg += `   📦 Số chai: ${formatNumber(p.bottles)}\n`;
                msg += `   💰 Doanh thu: $${formatCurrency(p.revenue)}\n\n`;
            });
            msg += "Gõ **Menu** để quay lại menu chính.";
            await ctx.sendActivity(msg);
        }

        conv.state = STATE_END_RESULT;
        await this.convAccessor.set(ctx, conv);
    }

    async _show_bottom5(ctx, conv) {
        const from_date = conv.from_date;
        const to_date = conv.to_date;
        const products = await this.dbHelper.getBottomProducts(5, from_date, to_date);
        const date_info = _fmt_date_range(from_date, to_date);

        if (!products || products.length === 0) {
            await ctx.sendActivity("❌ Không có dữ liệu sản phẩm.");
        } else {
            let msg = `📉 **TOP 5 RƯỢU BÁN ÍT NHẤT**${date_info}\n\n`;
            products.forEach((p, i) => {
                msg += `${i + 1}️⃣ **${p.name}**\n`;
                msg += `   📦 Số chai: ${formatNumber(p.bottles)}\n`;
                msg += `   💰 Doanh thu: $${formatCurrency(p.revenue)}\n\n`;
            });
            msg += "Gõ **Menu** để quay lại menu chính.";
            await ctx.sendActivity(msg);
        }

        conv.state = STATE_END_RESULT;
        await this.convAccessor.set(ctx, conv);
    }

    // ─── UI HELPERS ───────────────────────────────────────────────────────────

    _main_menu_message() {
        let msg  = "🤖 **XIN CHÀO! TÔI LÀ MENINBLACK BOT**\n\n";
        msg += " _Báo cáo doanh thu bán rượu khu vực Iowa, Mỹ năm 2022_\n\n";
        msg += "---\n\n";
        msg += "**CHỌN CHỨC NĂNG:**\n\n";
        msg += "1️⃣  **Doanh thu** — Xem doanh thu theo Quận (hạt) / Thành phố / Cửa hàng\n\n";
        msg += "2️⃣  **Top 5 rượu bán nhiều nhất**\n\n";
        msg += "3️⃣  **Top 5 rượu bán ít nhất**\n\n";
        msg += "👉 Nhập **1**, **2** hoặc **3** để bắt đầu.\n\n";
        msg += "_(Mỗi lựa chọn đều có thể lọc theo tháng)_";
        return msg;
    }

    _retype_hint(items, with_exit = false) {
        let hint = `Vui lòng nhập số từ 1 đến ${items.length}.`;
        if (with_exit) {
            hint += " Hoặc **0** để xem doanh thu toàn county.";
        }
        return hint;
    }

    async run(context) {
        await super.run(context);
        // Save any state changes.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}

module.exports.Bot = Bot;
