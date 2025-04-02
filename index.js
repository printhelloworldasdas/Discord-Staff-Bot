require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ActivityType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// Configuración de almacenamiento local
const configPath = path.join(__dirname, 'config.json');
let config = {};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath));
  } catch (error) {
    console.error('Error al leer config.json, creando uno nuevo:', error);
    config = initializeDefaultConfig();
  }
} else {
  config = initializeDefaultConfig();
}

function initializeDefaultConfig() {
  const defaultConfig = {
    welcomeConfigs: {},
    ticketCounters: {},
    modActions: {},
    warns: {},
    tickets: {},
    prefixes: {}
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  return defaultConfig;
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Crear cliente de Discord
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

// Colecciones para comandos y cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Función mejorada para cargar comandos
async function loadCommands() {
  const commandCategories = ['moderation', 'ticket', 'welcome', 'utility', 'fun', 'info', 'help'];
  const commands = [];

  for (const category of commandCategories) {
    try {
      const commandModule = require(`./commands/${category}`);
      
      if (Array.isArray(commandModule)) {
        // Asignar categoría a cada comando
        const categorizedCommands = commandModule.map(cmd => {
          cmd.category = category;
          return cmd;
        });
        commands.push(...categorizedCommands);
        console.log(`✅ ${category}.js cargado (${commandModule.length} comandos)`);
      } else {
        console.warn(`⚠ ${category}.js no exporta un array válido`);
      }
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn(`⚠ ${category}.js no encontrado, creando archivo vacío`);
        fs.writeFileSync(`./commands/${category}.js`, 'module.exports = [];');
      } else {
        console.error(`❌ Error al cargar ${category}.js:`, error);
      }
    }
  }

  return commands;
}

// Evento Ready
client.once('ready', async () => {
  console.log(`🚀 Bot conectado como ${client.user.tag}`);
  console.log(`🔄 Sincronizando comandos con ${client.guilds.cache.size} servidores...`);

  try {
    const commands = await loadCommands();
    client.commands = new Collection();
    commands.forEach(cmd => client.commands.set(cmd.data.name, cmd));

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    console.log('🔄 Actualizando comandos slash...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(c => c.data.toJSON()) }
    );
    console.log('✅ Comandos actualizados globalmente');
    
    // Sincronizar por servidor para desarrollo
    if (process.env.DEV_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
        { body: commands.map(c => c.data.toJSON()) }
      );
      console.log(`✅ Comandos actualizados en servidor de desarrollo (ID: ${process.env.DEV_GUILD_ID})`);
    }

    // Establecer estado del bot
    client.user.setPresence({
      activities: [{ name: '/help', type: ActivityType.Listening }],
      status: 'online'
    });
  } catch (error) {
    console.error('❌ Error al actualizar comandos:', error);
  }
});

// Manejador de comandos slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Manejo de cooldowns
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
        content: `⏳ Espera ${timeLeft.toFixed(1)} segundos antes de usar \`/${command.data.name}\` de nuevo.`,
        ephemeral: true
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  // Ejecutar comando
  try {
    await command.execute(interaction, client, config, saveConfig);
  } catch (error) {
    console.error(`Error ejecutando comando ${command.data.name}:`, error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error en el comando')
      .setDescription('Ocurrió un error al ejecutar este comando.')
      .setFooter({ text: `Comando: /${command.data.name}` });
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
});

// Sistema de bienvenida mejorado
client.on('guildMemberAdd', async member => {
  try {
    const guildConfig = config.welcomeConfigs[member.guild.id];
    if (!guildConfig || !guildConfig.enabled) return;

    const channel = member.guild.channels.cache.get(guildConfig.channelId);
    if (!channel) return;

    // Reemplazar placeholders
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

    // Crear embed si está habilitado
    if (guildConfig.embedEnabled) {
      const embed = new EmbedBuilder()
        .setColor(guildConfig.embedColor || '#00FF00')
        .setTitle(guildConfig.embedTitle || `Bienvenido a ${member.guild.name}!`)
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

    // Asignar roles si existen
    if (guildConfig.roles && guildConfig.roles.length > 0) {
      const rolesToAdd = guildConfig.roles
        .map(id => member.guild.roles.cache.get(id))
        .filter(role => role);

      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd).catch(console.error);
      }
    }
  } catch (error) {
    console.error('Error en sistema de bienvenida:', error);
  }
});

// Sistema de tickets mejorado
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  try {
    // Creación de ticket
    if (interaction.customId === 'create_ticket') {
      const guildConfig = config.tickets?.[interaction.guild.id];
      if (!guildConfig?.enabled) return;

      // Verificar si el usuario ya tiene un ticket abierto
      const existingTicket = interaction.guild.channels.cache.find(
        c => c.name.startsWith('ticket-') && 
             c.topic?.includes(`UserID:${interaction.user.id}`)
      );

      if (existingTicket) {
        return interaction.reply({
          content: `❌ Ya tienes un ticket abierto: ${existingTicket}`,
          ephemeral: true
        });
      }

      // Crear categoría si no existe
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

      // Crear canal de ticket
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

      // Mensaje de ticket
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`Ticket #${ticketNumber}`)
        .setDescription(`Hola ${interaction.user.username}, el equipo de soporte te ayudará pronto.\n\n**Por favor describe tu problema:**`)
        .addFields(
          { name: 'Usuario', value: interaction.user.toString(), inline: true },
          { name: 'Creado el', value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:D>`, inline: true },
          { name: 'Se unió', value: `<t:${Math.floor((interaction.member.joinedTimestamp || Date.now()) / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Escribe tu pregunta aquí' });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Cerrar Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('Tomar Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🙋‍♂️')
      );

      await ticketChannel.send({
        content: `${interaction.user} ${process.env.STAFF_ROLE_ID ? `<@&${process.env.STAFF_ROLE_ID}>` : ''}`,
        embeds: [embed],
        components: [buttons]
      });

      await interaction.reply({
        content: `✅ Ticket creado: ${ticketChannel}`,
        ephemeral: true
      });
    }

    // Cerrar ticket
    if (interaction.customId === 'close_ticket' && interaction.channel.name.startsWith('ticket-')) {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Ticket Cerrado')
        .setDescription(`Cerrado por ${interaction.user}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      setTimeout(() => interaction.channel.delete(), 5000);
    }

    // Tomar ticket
    if (interaction.customId === 'claim_ticket' && interaction.channel.name.startsWith('ticket-')) {
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true
      });

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Ticket Reclamado')
        .setDescription(`${interaction.user} ha tomado este ticket`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error en sistema de tickets:', error);
    if (interaction.isButton()) {
      await interaction.reply({
        content: '❌ Ocurrió un error al procesar tu solicitud',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// Manejo de errores no capturados
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});

// Iniciar el bot
client.login(process.env.TOKEN).catch(error => {
  console.error('Error al iniciar sesión:', error);
  process.exit(1);
});
