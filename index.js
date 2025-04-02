require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// Configuración de almacenamiento local
const configPath = path.join(__dirname, 'config.json');
let config = {};

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath));
} else {
  fs.writeFileSync(configPath, JSON.stringify({ welcomeConfigs: {}, ticketCounters: {} }, null, 2));
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

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

// Importar comandos
const moderationCommands = require('./commands/moderation');
const ticketCommands = require('./commands/ticket');
const welcomeCommands = require('./commands/welcome');
const utilityCommands = require('./commands/utility');
const funCommands = require('./commands/fun');
const infoCommands = require('./commands/info');

// Registrar comandos
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

// Evento ready
client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  
  // Registrar comandos slash
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  
  try {
    console.log('Actualizando comandos (/)...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(command => command.data.toJSON()) },
    );
    console.log('Comandos actualizados correctamente.');
  } catch (error) {
    console.error(error);
  }
});

// Manejador de comandos
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client, config, saveConfig);
  } catch (error) {
    console.error(error);
    await interaction.reply({ 
      content: '¡Hubo un error al ejecutar este comando!', 
      ephemeral: true 
    });
  }
});

// Sistema de bienvenida avanzado
client.on('guildMemberAdd', async member => {
  try {
    const guildConfig = config.welcomeConfigs[member.guild.id];
    if (!guildConfig) return;

    const channel = member.guild.channels.cache.get(guildConfig.channelId);
    if (!channel) return;

    // Reemplazar placeholders
    let welcomeMessage = guildConfig.message
      .replace(/{user}/g, member.user.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{server}/g, member.guild.name)
      .replace(/{membercount}/g, member.guild.memberCount);

    // Crear embed si está activado
    if (guildConfig.embedEnabled) {
      const embed = new EmbedBuilder()
        .setColor(guildConfig.embedColor || '#00ff00')
        .setTitle(guildConfig.embedTitle || `¡Bienvenido a ${member.guild.name}!`)
        .setDescription(welcomeMessage)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      if (guildConfig.embedImage) embed.setImage(guildConfig.embedImage);

      await channel.send({ 
        content: guildConfig.pingUser ? member.user.toString() : null,
        embeds: [embed] 
      });
    } else {
      await channel.send({
        content: `${guildConfig.pingUser ? member.user.toString() + ' ' : ''}${welcomeMessage}`
      });
    }

    // Asignar roles si están configurados
    if (guildConfig.roles && guildConfig.roles.length > 0) {
      for (const roleId of guildConfig.roles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          await member.roles.add(role).catch(console.error);
        }
      }
    }
  } catch (error) {
    console.error('Error en el sistema de bienvenida:', error);
  }
});

// Sistema de tickets mejorado
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  
  // Creación de ticket
  if (interaction.customId === 'create_ticket') {
    try {
      // Contador de tickets
      if (!config.ticketCounters) config.ticketCounters = {};
      if (!config.ticketCounters[interaction.guild.id]) config.ticketCounters[interaction.guild.id] = 0;
      config.ticketCounters[interaction.guild.id]++;
      saveConfig();

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

      const ticketNumber = config.ticketCounters[interaction.guild.id];
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${ticketNumber}`,
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
        .setTitle(`Ticket #${ticketNumber}`)
        .setDescription(`Hola ${interaction.user.username}, el equipo de soporte te atenderá pronto.\nPor favor describe tu problema con detalle.`)
        .addFields(
          { name: 'Usuario', value: interaction.user.toString(), inline: true },
          { name: 'Cuenta creada', value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Se unió al servidor', value: `<t:${Math.floor((interaction.member.joinedTimestamp || Date.now()) / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Cerrar Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('Tomar Ticket')
          .setStyle(ButtonStyle.Primary)
      );

      await ticketChannel.send({ 
        content: `${interaction.user}, <@&${process.env.STAFF_ROLE_ID}>`,
        embeds: [ticketEmbed],
        components: [buttons]
      });

      await interaction.reply({ 
        content: `Tu ticket ha sido creado: ${ticketChannel}`, 
        ephemeral: true 
      });
    } catch (error) {
      console.error('Error al crear ticket:', error);
      await interaction.reply({
        content: 'Ocurrió un error al crear tu ticket.',
        ephemeral: true
      });
    }
  }

  // Cerrar ticket
  if (interaction.customId === 'close_ticket') {
    if (!interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({ 
        content: '¡Este no es un canal de ticket!', 
        ephemeral: true 
      });
    }

    try {
      const transcriptEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Ticket Cerrado')
        .setDescription(`Este ticket fue cerrado por ${interaction.user.username}`)
        .setTimestamp();

      await interaction.channel.send({ embeds: [transcriptEmbed] });
      
      // Esperar antes de eliminar
      await new Promise(resolve => setTimeout(resolve, 5000));
      await interaction.channel.delete();
    } catch (error) {
      console.error('Error al cerrar ticket:', error);
      await interaction.reply({
        content: 'Ocurrió un error al cerrar el ticket.',
        ephemeral: true
      });
    }
  }

  // Tomar ticket
  if (interaction.customId === 'claim_ticket') {
    if (!interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({ 
        content: '¡Este no es un canal de ticket!', 
        ephemeral: true 
      });
    }

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      const claimEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Ticket Reclamado')
        .setDescription(`Este ticket ha sido tomado por ${interaction.user}`)
        .setTimestamp();

      await interaction.reply({ embeds: [claimEmbed] });
    } catch (error) {
      console.error('Error al tomar ticket:', error);
      await interaction.reply({
        content: 'Ocurrió un error al tomar este ticket.',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
