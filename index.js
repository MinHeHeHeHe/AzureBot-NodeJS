// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const restify = require('restify');
const {
    CloudAdapter,
    ConfigurationBotFrameworkAuthentication,
    MemoryStorage,
    ConversationState,
    UserState,
    ActivityTypes
} = require('botbuilder');

const { Bot } = require('./bots/bot');
const DefaultConfig = require('./config');

const CONFIG = DefaultConfig;

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const ADAPTER = new CloudAdapter(new ConfigurationBotFrameworkAuthentication(CONFIG));

// Catch-all for errors.
async function on_error(context, error) {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [on_turn_error] unhandled error: ${error}`);
    console.error(error);

    // Send a message to the user
    await context.sendActivity("The bot encountered an error or bug.");
    await context.sendActivity(
        "To continue to run this bot, please fix the bot source code."
    );

    // Send a trace activity if we're talking to the Bot Framework Emulator
    if (context.activity.channelId === 'emulator') {
        // Create a trace activity that contains the error object
        const trace_activity = {
            type: ActivityTypes.Trace,
            timestamp: new Date(),
            name: 'on_turn_error Trace',
            label: 'TurnError',
            value: `${error}`,
            valueType: 'https://www.botframework.com/schemas/error'
        };
        // Send a trace activity, which will be displayed in Bot Framework Emulator
        await context.sendActivity(trace_activity);
    }
}

ADAPTER.onTurnError = on_error;

// Create MemoryStorage and State
const MEMORY = new MemoryStorage();
const CONVERSATION_STATE = new ConversationState(MEMORY);
const USER_STATE = new UserState(MEMORY);

// Create the Bot
const BOT = new Bot(CONVERSATION_STATE, USER_STATE);

// Create HTTP server
const app = restify.createServer();
app.use(restify.plugins.bodyParser());

// Listen for incoming requests on /api/messages
async function messages(req, res) {
    await ADAPTER.process(req, res, (context) => BOT.run(context));
}

app.post('/api/messages', messages);

if (require.main === module) {
    try {
        app.listen(CONFIG.PORT, () => {
             console.log(`\n${app.name} listening to ${app.url}`);
        });
    } catch (error) {
        throw error;
    }
}
