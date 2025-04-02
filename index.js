require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ActivityType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// Night ASCII Art
const nightAscii = `
\x1b[35m
███╗   ██╗██╗ ██████╗ ██╗  ██╗████████╗
████╗  ██║██║██╔════╝ ██║  ██║╚══██╔══╝
██╔██╗ ██║██║██║  ███╗███████║   ██║   
██║╚██╗██║██║██║   ██║██╔══██║   ██║   
██║ ╚████║██║╚██████╔╝██║  ██║   ██║   
╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
\x1b[0m
`;

// Language system
const languages = {
  es: require('./lang/es.json'),
  en: require('./lang/en.json')
};

function t(key, interaction, variables = {}) {
  const lang = config.userLanguages?.[interaction.user.id] || config.language || 'es';
  let value = languages[lang];
  
  const keys = key.split('.');
  for (const k of keys) {
    value = value?.[k];
    if (!value) break;
  }
  
  if (value) {
    for (const [varKey, varValue] of Object.entries(variables)) {
      value = value.replace(new RegExp(`{${varKey}}`, 'g'), varValue);
    }
    return value;
  }
  
  console.warn(`Translation missing for key '${key}' in language '${lang}'`);
  return key;
}

// Config system
const configPath = path.join(__dirname, 'config.json');
let config = {};

function initializeDefaultConfig() {
  const defaultConfig = {
    welcomeConfigs: {},
    ticketCounters: {},
    modActions: {},
    warns: {},
    tickets: {},
    prefixes: {},
    language: 'es',
    userLanguages: {}
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  return defaultConfig;
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath));
  } catch (error) {
    console.error('Error reading config.json:', error);
    config = initializeDefaultConfig();
  }
} else {
  config = initializeDefaultConfig();
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Command loader
async function loadCommands() {
  const commandCategories = ['moderation', 'ticket', 'welcome', 'utility', 'fun', 'info', 'help', 'language'];
  const commands = [];

  for (const category of commandCategories) {
    try {
      const commandModule = require(`./commands/${category}`);
      
      if (Array.isArray(commandModule)) {
        const categorizedCommands = commandModule.map(cmd => {
          cmd.category = category;
          return cmd;
        });
        commands.push(...categorizedCommands);
        console.log(`✅ ${category}.js loaded (${commandModule.length} commands)`);
      } else {
        console.warn(`⚠ ${category}.js does not export a valid array`);
      }
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn(`⚠ ${category}.js not found, creating empty file`);
        fs.writeFileSync(`./commands/${category}.js`, 'module.exports = [];');
      } else {
        console.error(`❌ Error loading ${category}.js:`, error);
      }
    }
  }

  return commands;
}

// Ready event
client.once('ready', async () => {
  console.clear();
  console.log(nightAscii);
  console.log(`\x1b[36m========================================\x1b[0m`);
  console.log(`\x1b[33m🌙 Night Bot v2.0 - Multilingual Discord Bot\x1b[0m`);
  console.log(`\x1b[32m✅ Logged in as ${client.user.tag}\x1b[0m`);
  console.log(`\x1b[36m========================================\x1b[0m`);

  try {
    const commands = await loadCommands();
    client.commands = new Collection();
    commands.forEach(cmd => client.commands.set(cmd.data.name, cmd));

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    console.log('🔄 Updating slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(c => c.data.toJSON()) }
    );
    console.log('✅ Commands updated globally');
    
    if (process.env.DEV_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
        { body: commands.map(c => c.data.toJSON()) }
      );
      console.log(`✅ Commands updated in dev server (ID: ${process.env.DEV_GUILD_ID})`);
    }

    client.user.setPresence({
      activities: [{ name: '/help', type: ActivityType.Listening }],
      status: 'online'
    });
  } catch (error) {
    console.error('❌ Error updating commands:', error);
  }
});

// Command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Cooldown system
  if (!client.cooldowns.has(command.data.name)) {
    client.cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = client.cooldowns.get(command.data.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return interaction.reply({
        content: t('cooldown.message', interaction, { time: timeLeft.toFixed(1), command: command.data.name }),
        ephemeral: true
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  // Execute command
  try {
    await command.execute(interaction, client, config, saveConfig, t);
  } catch (error) {
    console.error(`Error executing command ${command.data.name}:`, error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(t('error.title', interaction))
      .setDescription(t('error.description', interaction))
      .setFooter({ text: t('error.footer', interaction, { command: command.data.name }) });
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
});

// Welcome system
client.on('guildMemberAdd', async member => {
  try {
    const guildConfig = config.welcomeConfigs[member.guild.id];
    if (!guildConfig || !guildConfig.enabled) return;

    const channel = member.guild.channels.cache.get(guildConfig.channelId);
    if (!channel) return;

    const replacements = {
      '{user}': member.user.toString(),
      '{username}': member.user.username,
      '{server}': member.guild.name,
      '{membercount}': member.guild.memberCount,
      '{mention}': member.user.toString()
    };

    let welcomeMessage = guildConfig.message;
    for (const [key, value] of Object.entries(replacements)) {
      welcomeMessage = welcomeMessage.replace(new RegExp(key, 'g'), value);
    }

    if (guildConfig.embedEnabled) {
      const embed = new EmbedBuilder()
        .setColor(guildConfig.embedColor || '#00FF00')
        .setTitle(guildConfig.embedTitle || t('welcome.title', null, { server: member.guild.name }))
        .setDescription(welcomeMessage)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      if (guildConfig.embedImage) embed.setImage(guildConfig.embedImage);
      if (guildConfig.embedFooter) embed.setFooter({ text: guildConfig.embedFooter });

      await channel.send({
        content: guildConfig.pingUser ? member.user.toString() : undefined,
        embeds: [embed]
      });
    } else {
      await channel.send({
        content: guildConfig.pingUser ? `${member.user.toString()} ${welcomeMessage}` : welcomeMessage
      });
    }

    if (guildConfig.roles && guildConfig.roles.length > 0) {
      const rolesToAdd = guildConfig.roles
        .map(id => member.guild.roles.cache.get(id))
        .filter(role => role);

      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd).catch(console.error);
      }
    }
  } catch (error) {
    console.error('Welcome system error:', error);
  }
});

// Ticket system
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  try {
    if (interaction.customId === 'create_ticket') {
      const guildConfig = config.tickets?.[interaction.guild.id];
      if (!guildConfig?.enabled) return;

      const existingTicket = interaction.guild.channels.cache.find(
        c => c.name.startsWith('ticket-') && 
             c.topic?.includes(`UserID:${interaction.user.id}`)
      );

      if (existingTicket) {
        return interaction.reply({
          content: t('ticket.exists', interaction, { channel: existingTicket.toString() }),
          ephemeral: true
        });
      }

      let ticketCategory = guildConfig.categoryId 
        ? interaction.guild.channels.cache.get(guildConfig.categoryId)
        : interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === 'Tickets');

      if (!ticketCategory) {
        ticketCategory = await interaction.guild.channels.create({
          name: 'Tickets',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: ['ViewChannel'],
            },
            {
              id: process.env.STAFF_ROLE_ID,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
            }
          ],
        });
        config.tickets[interaction.guild.id].categoryId = ticketCategory.id;
        saveConfig();
      }

      if (!config.ticketCounters[interaction.guild.id]) {
        config.ticketCounters[interaction.guild.id] = 0;
      }
      config.ticketCounters[interaction.guild.id]++;
      saveConfig();

      const ticketNumber = config.ticketCounters[interaction.guild.id];
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: ticketCategory,
        topic: `UserID:${interaction.user.id}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ['ViewChannel'],
          },
          {
            id: interaction.user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'],
          },
          {
            id: process.env.STAFF_ROLE_ID,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'ManageChannels'],
          }
        ],
      });

      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(t('ticket.title', interaction, { number: ticketNumber }))
        .setDescription(t('ticket.description', interaction, { user: interaction.user.username }))
        .addFields(
          { 
            name: t('ticket.user', interaction), 
            value: interaction.user.toString(), 
            inline: true 
          },
          { 
            name: t('ticket.created', interaction), 
            value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:D>`, 
            inline: true 
          },
          { 
            name: t('ticket.joined', interaction), 
            value: `<t:${Math.floor((interaction.member.joinedTimestamp || Date.now()) / 1000)}:R>`, 
            inline: true 
          }
        )
        .setFooter({ text: t('ticket.footer', interaction) });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel(t('ticket.close_button', interaction))
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel(t('ticket.claim_button', interaction))
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🙋‍♂️')
      );

      await ticketChannel.send({
        content: `${interaction.user} ${process.env.STAFF_ROLE_ID ? `<@&${process.env.STAFF_ROLE_ID}>` : ''}`,
        embeds: [embed],
        components: [buttons]
      });

      await interaction.reply({
        content: t('ticket.created_response', interaction, { channel: ticketChannel.toString() }),
        ephemeral: true
      });
    }

    if (interaction.customId === 'close_ticket' && interaction.channel.name.startsWith('ticket-')) {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(t('ticket.closed_title', interaction))
        .setDescription(t('ticket.closed_by', interaction, { user: interaction.user.toString() }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      setTimeout(() => interaction.channel.delete(), 5000);
    }

    if (interaction.customId === 'claim_ticket' && interaction.channel.name.startsWith('ticket-')) {
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true
      });

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(t('ticket.claimed_title', interaction))
        .setDescription(t('ticket.claimed_by', interaction, { user: interaction.user.toString() }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Ticket system error:', error);
    if (interaction.isButton()) {
      await interaction.reply({
        content: t('error.generic', interaction),
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// Error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});

// Start bot
client.login(process.env.TOKEN).catch(error => {
  console.error('Login error:', error);
  process.exit(1);
});
