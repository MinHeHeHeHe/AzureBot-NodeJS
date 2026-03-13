const restify = require('restify');
const {
    CloudAdapter,
    ConfigurationBotFrameworkAuthentication,
    MemoryStorage,
    ConversationState,
    UserState
} = require('botbuilder');
const { Bot } = require('./bots/bot');
const DefaultConfig = require('./config');

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(DefaultConfig.PORT, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Configure Bot Framework Authentication 
const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
    DefaultConfig.APP_ID, 
    DefaultConfig.APP_PASSWORD,
    DefaultConfig.APP_TYPE,
    DefaultConfig.APP_TENANTID
);

// Create adapter.
const adapter = new CloudAdapter(botFrameworkAuthentication);
adapter.onTurnError = onTurnErrorHandler;

// Define Memory Storage and State
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
const myBot = new Bot(conversationState, userState);

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => myBot.run(context));
});
