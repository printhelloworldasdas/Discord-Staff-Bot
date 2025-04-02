const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('welcome-setup')
      .setDescription('Configurar mensajes de bienvenida en el servidor')
      .addChannelOption(option =>
        option.setName('canal')
          .setDescription('El canal para enviar mensajes de bienvenida')
          .setRequired(true)
      ),
    async execute(interaction, client, config, saveConfig) {
      if (!interaction.member.permissions.has('MANAGE_GUILD')) {
        return interaction.reply({ 
          content: '¡Necesitas el permiso "Gestionar Servidor" para usar este comando!',
          ephemeral: true 
        });
      }

      const channel = interaction.options.getChannel('canal');
      
      try {
        if (!config.welcomeConfigs) config.welcomeConfigs = {};
        
        config.welcomeConfigs[interaction.guild.id] = {
          channelId: channel.id,
          message: '¡Bienvenido {user} a {server}!',
          embedEnabled: true,
          embedTitle: '¡Bienvenido!',
          embedColor: '#00ff00',
          pingUser: true,
          roles: []
        };
        
        saveConfig();

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Sistema de Bienvenida Configurado')
          .setDescription(`Los mensajes de bienvenida se enviarán a ${channel}`)
          .addFields(
            { name: 'Personalización', value: 'Usa `/welcome-message` para personalizar el mensaje' },
            { name: 'Configuración de Embed', value: 'Usa `/welcome-embed` para configurar el aspecto del embed' },
            { name: 'Roles', value: 'Usa `/welcome-roles` para asignar roles a nuevos miembros' }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        await interaction.reply({ 
          content: '¡Ocurrió un error al configurar el sistema de bienvenida!',
          ephemeral: true 
        });
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('welcome-message')
      .setDescription('Establecer el mensaje de bienvenida personalizado')
      .addStringOption(option =>
        option.setName('mensaje')
          .setDescription('El mensaje de bienvenida (usa {user}, {username}, {server}, {membercount} como placeholders)')
          .setRequired(true)
      ),
    async execute(interaction, client, config, saveConfig) {
      if (!interaction.member.permissions.has('MANAGE_GUILD')) {
        return interaction.reply({ 
          content: '¡Necesitas el permiso "Gestionar Servidor" para usar este comando!',
          ephemeral: true 
        });
      }

      const message = interaction.options.getString('mensaje');
      
      try {
        if (!config.welcomeConfigs[interaction.guild.id]) {
          return interaction.reply({
            content: 'Primero debes configurar el sistema de bienvenida con `/welcome-setup`',
            ephemeral: true
          });
        }
        
        config.welcomeConfigs[interaction.guild.id].message = message;
        saveConfig();

        const preview = message
          .replace(/{user}/g, interaction.user.toString())
          .replace(/{username}/g, interaction.user.username)
          .replace(/{server}/g, interaction.guild.name)
          .replace(/{membercount}/g, interaction.guild.memberCount);

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Mensaje de Bienvenida Actualizado')
          .setDescription('¡El mensaje de bienvenida ha sido actualizado correctamente!')
          .addFields(
            { name: 'Vista previa', value: preview }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        await interaction.reply({ 
          content: '¡Ocurrió un error al actualizar el mensaje de bienvenida!',
          ephemeral: true 
        });
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('welcome-embed')
      .setDescription('Configurar el aspecto del embed de bienvenida')
      .addStringOption(option =>
        option.setName('color')
          .setDescription('Color del embed (código hex)')
      )
      .addStringOption(option =>
        option.setName('titulo')
          .setDescription('Título del embed')
      )
      .addStringOption(option =>
        option.setName('imagen')
          .setDescription('URL de una imagen para incluir en el embed')
      )
      .addBooleanOption(option =>
        option.setName('activado')
          .setDescription('¿Usar embeds para los mensajes de bienvenida?')
      )
      .addBooleanOption(option =>
        option.setName('ping')
          .setDescription('¿Mencionar al nuevo miembro?')
      ),
    async execute(interaction, client, config, saveConfig) {
      if (!interaction.member.permissions.has('MANAGE_GUILD')) {
        return interaction.reply({ 
          content: '¡Necesitas el permiso "Gestionar Servidor" para usar este comando!',
          ephemeral: true 
        });
      }

      const color = interaction.options.getString('color');
      const title = interaction.options.getString('titulo');
      const image = interaction.options.getString('imagen');
      const enabled = interaction.options.getBoolean('activado');
      const ping = interaction.options.getBoolean('ping');

      try {
        if (!config.welcomeConfigs[interaction.guild.id]) {
          return interaction.reply({
            content: 'Primero debes configurar el sistema de bienvenida con `/welcome-setup`',
            ephemeral: true
          });
        }

        const welcomeConfig = config.welcomeConfigs[interaction.guild.id];
        if (color) welcomeConfig.embedColor = color;
        if (title) welcomeConfig.embedTitle = title;
        if (image) welcomeConfig.embedImage = image;
        if (enabled !== null) welcomeConfig.embedEnabled = enabled;
        if (ping !== null) welcomeConfig.pingUser = ping;
        
        saveConfig();

        const embed = new EmbedBuilder()
          .setColor(color || '#00ff00')
          .setTitle(title || 'Embed de Bienvenida Actualizado')
          .setDescription('¡La configuración del embed de bienvenida ha sido actualizada correctamente!')
          .setTimestamp();

        if (image) embed.setImage(image);

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        await interaction.reply({ 
          content: '¡Ocurrió un error al actualizar la configuración del embed de bienvenida!',
          ephemeral: true 
        });
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('welcome-roles')
      .setDescription('Establecer roles para asignar a nuevos miembros')
      .addRoleOption(option =>
        option.setName('rol1')
          .setDescription('Primer rol para asignar')
      )
      .addRoleOption(option =>
        option.setName('rol2')
          .setDescription('Segundo rol para asignar')
      )
      .addRoleOption(option =>
        option.setName('rol3')
          .setDescription('Tercer rol para asignar')
      ),
    async execute(interaction, client, config, saveConfig) {
      if (!interaction.member.permissions.has('MANAGE_GUILD')) {
        return interaction.reply({ 
          content: '¡Necesitas el permiso "Gestionar Servidor" para usar este comando!',
          ephemeral: true 
        });
      }

      const roles = [
        interaction.options.getRole('rol1'),
        interaction.options.getRole('rol2'),
        interaction.options.getRole('rol3')
      ].filter(role => role !== null).map(role => role.id);

      try {
        if (!config.welcomeConfigs[interaction.guild.id]) {
          return interaction.reply({
            content: 'Primero debes configurar el sistema de bienvenida con `/welcome-setup`',
            ephemeral: true
          });
        }

        config.welcomeConfigs[interaction.guild.id].roles = roles;
        saveConfig();

        const roleMentions = roles.length > 0 
          ? roles.map(id => `<@&${id}>`).join(', ')
          : 'No se asignarán roles';

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Roles de Bienvenida Actualizados')
          .setDescription('¡Los roles de bienvenida han sido actualizados correctamente!')
          .addFields(
            { name: 'Roles asignados', value: roleMentions }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        await interaction.reply({ 
          content: '¡Ocurrió un error al actualizar los roles de bienvenida!',
          ephemeral: true 
        });
      }
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('welcome-test')
      .setDescription('Probar la configuración del mensaje de bienvenida'),
    async execute(interaction, client, config, saveConfig) {
      if (!interaction.member.permissions.has('MANAGE_GUILD')) {
        return interaction.reply({ 
          content: '¡Necesitas el permiso "Gestionar Servidor" para usar este comando!',
          ephemeral: true 
        });
      }

      try {
        if (!config.welcomeConfigs || !config.welcomeConfigs[interaction.guild.id]) {
          return interaction.reply({ 
            content: '¡El sistema de bienvenida no está configurado! Usa `/welcome-setup` primero.',
            ephemeral: true 
          });
        }

        // Simular evento guildMemberAdd
        client.emit('guildMemberAdd', interaction.member);
        
        await interaction.reply({ 
          content: '¡Se ha enviado un mensaje de bienvenida de prueba!',
          ephemeral: true 
        });
      } catch (error) {
        console.error(error);
        await interaction.reply({ 
          content: '¡Ocurrió un error al probar el mensaje de bienvenida!',
          ephemeral: true 
        });
      }
    }
  }
];
