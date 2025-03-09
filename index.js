const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
require('dotenv').config();

const app = express();
app.use(express.json());

// Load environment variables
const TOKEN = process.env.DISCORD_TOKEN; // Store in Replit Secrets
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyIFrY0THq4hFpW0JQTPhlm9_-FrYzb2hVpv317PHKNp42iOpOQto4d1msRCg3nX5XBZw/exec";

// Create a Discord bot instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Log when the bot starts
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Register Slash Commands
    const commands = [
        {
            name: 'subscribe',
            description: 'Subscribe to game notifications for a team.',
            options: [
                {
                    name: 'team',
                    description: 'Select your team (sport & gender included)',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                }
            ]
        }
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

// ✅ Handle Autocomplete for `/subscribe`
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isAutocomplete()) return;

    if (interaction.commandName === 'subscribe') {
        const focusedValue = interaction.options.getFocused();

        try {
            // Fetch teams from Google Sheets
            const response = await axios.get(`${GOOGLE_SCRIPT_URL}?get_teams=true`);
            const teams = response.data.split(","); // Convert CSV response to an array

            // Filter teams based on user input
            const filtered = teams
                .map(team => team.trim()) // Remove extra spaces
                .filter(team => team.toLowerCase().includes(focusedValue.toLowerCase()));

            // Send autocomplete options (max 10)
            await interaction.respond(
                filtered.slice(0, 10).map(team => ({ name: team, value: team }))
            );
        } catch (error) {
            console.error('Error fetching teams for autocomplete:', error);
        }
    }
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isAutocomplete()) return;

        console.log(`🔄 Received autocomplete request for: ${interaction.commandName}`);

        if (interaction.commandName === 'subscribe') {
            const focusedValue = interaction.options.getFocused();
            console.log(`📝 User is typing: ${focusedValue}`);

            try {
                // Fetch teams from Google Sheets
                const response = await axios.get(`${GOOGLE_SCRIPT_URL}?get_teams=true`);
                console.log("✅ Google Sheets Response:", response.data);

                const teams = response.data.split(",").map(team => team.trim()); // Convert CSV response to an array

                // Filter teams based on user input
                const filtered = teams.filter(team => team.toLowerCase().includes(focusedValue.toLowerCase()));
                console.log("🔍 Filtered Autocomplete Options:", filtered);

                // Send autocomplete options (max 10)
                await interaction.respond(
                    filtered.slice(0, 10).map(team => ({ name: team, value: team }))
                );

                console.log("✅ Autocomplete response sent.");
            } catch (error) {
                console.error('❌ Error fetching teams for autocomplete:', error.message);
            }
        }
    });
});

// ✅ Handle `/subscribe` Command (Fixed Response Issue)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'subscribe') {
        await interaction.deferReply(); // Prevents "The application did not respond" error

        const team = interaction.options.getString("team");

        try {
            const requestUrl = `${GOOGLE_SCRIPT_URL}?subscribe=true&user=${interaction.user.id}&team=${encodeURIComponent(team)}`;
            console.log(`Sending subscription request: ${requestUrl}`);

            const response = await axios.get(requestUrl);
            console.log("Response from Google Apps Script:", response.data);

            await interaction.editReply(`✅ You have subscribed to **${team}**!`);
        } catch (error) {
            console.error("❌ Error processing subscription:", error.message);
            await interaction.editReply("❌ Failed to subscribe. Try again later.");
        }
    }
});

// ✅ Express Route to Prevent "Cannot GET /"
app.get('/', (req, res) => {
    res.send('Discord Bot is running!');
});

// ✅ Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot is running on port ${PORT}`));

// ✅ Start the bot
client.login(TOKEN);
