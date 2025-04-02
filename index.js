require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const mongoose = require('mongoose');
const WelcomeConfig = require('./models/WelcomeConfig');

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

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

client.commands = new Collection();
client.cooldowns = new Collection();

// Import command handlers
const moderationCommands = require('./commands/moderation');
const ticketCommands = require('./commands/ticket');
const welcomeCommands = require('./commands/welcome');
const utilityCommands = require('./commands/utility');
const funCommands = require('./commands/fun');
const infoCommands = require('./commands/info');

// Register commands
const commands = [
  ...moderationCommands,
  ...ticketCommands,
  ...welcomeCommands,
  ...utilityCommands,
  ...funCommands,
  ...infoCommands
];

commands.forEach(command => {
  client.commands.set(command.data.name, command);
});

// Bot ready event
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(command => command.data.toJSON()) },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ 
      content: 'There was an error while executing this command!', 
      ephemeral: true 
    });
  }
});

// Advanced Welcome System
client.on('guildMemberAdd', async member => {
  try {
    const config = await WelcomeConfig.findOne({ guildId: member.guild.id });
    if (!config) return;

    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel) return;

    // Replace placeholders in the message
    let welcomeMessage = config.message
      .replace(/{user}/g, member.user.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{server}/g, member.guild.name)
      .replace(/{membercount}/g, member.guild.memberCount);

    // Create embed if enabled
    if (config.embedEnabled) {
      const embed = new EmbedBuilder()
        .setColor(config.embedColor || '#00ff00')
        .setTitle(config.embedTitle || `Welcome to ${member.guild.name}!`)
        .setDescription(welcomeMessage)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      if (config.embedImage) embed.setImage(config.embedImage);

      await channel.send({ 
        content: config.pingUser ? member.user.toString() : null,
        embeds: [embed] 
      });
    } else {
      await channel.send({
        content: `${config.pingUser ? member.user.toString() + ' ' : ''}${welcomeMessage}`
      });
    }

    // Assign roles if specified
    if (config.roles.length > 0) {
      for (const roleId of config.roles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          await member.roles.add(role).catch(console.error);
        }
      }
    }
  } catch (error) {
    console.error('Error in welcome system:', error);
  }
});

// Enhanced Ticket System
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  
  // Ticket creation
  if (interaction.customId === 'create_ticket') {
    try {
      const ticketCategory = interaction.guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === 'Tickets'
      ) || await interaction.guild.channels.create({
        name: 'Tickets',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ['ViewChannel'],
          },
        ],
      });

      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: ticketCategory,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ['ViewChannel'],
          },
          {
            id: interaction.user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
          },
          {
            id: process.env.STAFF_ROLE_ID,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
          },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Ticket Created')
        .setDescription(`Hello ${interaction.user.username}, support will be with you shortly.\nPlease describe your issue in detail.`)
        .addFields(
          { name: 'User', value: interaction.user.toString(), inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor((interaction.member.joinedTimestamp || Date.now()) / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ 
        content: `${interaction.user}, <@&${process.env.STAFF_ROLE_ID}>`,
        embeds: [ticketEmbed],
        components: [closeButton]
      });

      await interaction.reply({ 
        content: `Your ticket has been created: ${ticketChannel}`, 
        ephemeral: true 
      });
    } catch (error) {
      console.error('Ticket creation error:', error);
      await interaction.reply({
        content: 'An error occurred while creating your ticket.',
        ephemeral: true
      });
    }
  }

  // Ticket closing
  if (interaction.customId === 'close_ticket') {
    if (!interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({ 
        content: 'This is not a ticket channel!', 
        ephemeral: true 
      });
    }

    try {
      const transcriptEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Ticket Closed')
        .setDescription(`This ticket was closed by ${interaction.user.username}`)
        .setTimestamp();

      await interaction.channel.send({ embeds: [transcriptEmbed] });
      
      // Add a delay before deleting
      await new Promise(resolve => setTimeout(resolve, 5000));
      await interaction.channel.delete();
    } catch (error) {
      console.error('Ticket closing error:', error);
      await interaction.reply({
        content: 'An error occurred while closing the ticket.',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
