import express from 'express';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  PermissionsBitField
} from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

// -------------------------
// Basic web server (for Render)
// -------------------------
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running! ✅'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// -------------------------
// Discord bot setup
// -------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const LINK_REGEX = /(https?:\/\/[^\s]+)/gi;

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Delete links from non-admins
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (LINK_REGEX.test(message.content)) {
    const member = message.member;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    try {
      await message.delete();
      await message.author.send(
        `⚠️ Your message in **${message.guild.name}** was removed because posting links is not allowed.`
      );
      console.log(`Deleted message with link from ${message.author.tag}`);
    } catch (err) {
      console.error('Error deleting message or sending DM:', err);
    }
  }
});

// Slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, member, options } = interaction;

  // Only allow admins
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  try {
    if (commandName === 'ban') {
      const user = options.getUser('user');
      const reason = options.getString('reason') || 'No reason provided';
      const target = await interaction.guild.members.fetch(user.id);
      await target.ban({ reason });
      await interaction.reply(`🔨 Banned **${user.tag}** | Reason: ${reason}`);
    }

    else if (commandName === 'kick') {
      const user = options.getUser('user');
      const reason = options.getString('reason') || 'No reason provided';
      const target = await interaction.guild.members.fetch(user.id);
      await target.kick(reason);
      await interaction.reply(`👢 Kicked **${user.tag}** | Reason: ${reason}`);
    }

    else if (commandName === 'timeout') {
      const user = options.getUser('user');
      const minutes = options.getInteger('minutes');
      const reason = options.getString('reason') || 'No reason provided';
      const target = await interaction.guild.members.fetch(user.id);
      const ms = minutes * 60 * 1000;
      await target.timeout(ms, reason);
      await interaction.reply(`⏱️ Timed out **${user.tag}** for ${minutes} minute(s) | Reason: ${reason}`);
    }
  } catch (err) {
    console.error(err);
    interaction.reply({ content: '❌ Failed to execute command.', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
