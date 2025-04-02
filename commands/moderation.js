const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = [
    // Comando /ban
    {
        data: new SlashCommandBuilder()
            .setName('ban')
            .setDescription('Banea a un usuario del servidor')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuario a banear')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('razon')
                    .setDescription('Razón del baneo')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('dias')
                    .setDescription('Días de mensajes a borrar (0-7)')
                    .setMinValue(0)
                    .setMaxValue(7)
                    .setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        async execute(interaction, client, config, saveConfig) {
            const user = interaction.options.getUser('usuario');
            const reason = interaction.options.getString('razon') || 'No se especificó razón';
            const days = interaction.options.getInteger('dias') || 0;

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ 
                    content: '❌ No tengo permisos para banear usuarios.', 
                    ephemeral: true 
                });
            }

            try {
                await interaction.guild.members.ban(user, { 
                    reason: reason,
                    deleteMessageDays: days 
                });

                // Registrar en la configuración
                if (!config.modActions) config.modActions = {};
                if (!config.modActions[interaction.guild.id]) config.modActions[interaction.guild.id] = [];
                
                config.modActions[interaction.guild.id].push({
                    type: 'ban',
                    user: user.id,
                    moderator: interaction.user.id,
                    reason: reason,
                    date: new Date().toISOString()
                });
                saveConfig();

                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('✅ Usuario Baneado')
                    .setDescription(`${user.tag} ha sido baneado del servidor.`)
                    .addFields(
                        { name: 'Razón', value: reason, inline: true },
                        { name: 'Moderador', value: interaction.user.tag, inline: true },
                        { name: 'Mensajes borrados', value: `${days} días`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

                // Enviar DM al usuario baneado
                try {
                    await user.send({
                        content: `Has sido baneado de **${interaction.guild.name}**\nRazón: ${reason}`
                    });
                } catch (err) {
                    console.log(`No se pudo enviar DM a ${user.tag}`);
                }

            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: '❌ Ocurrió un error al banear al usuario.', 
                    ephemeral: true 
                });
            }
        }
    },
    // Comando /kick
    {
        data: new SlashCommandBuilder()
            .setName('kick')
            .setDescription('Expulsa a un usuario del servidor')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuario a expulsar')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('razon')
                    .setDescription('Razón de la expulsión')
                    .setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        async execute(interaction, client, config, saveConfig) {
            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            const reason = interaction.options.getString('razon') || 'No se especificó razón';

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interaction.reply({ 
                    content: '❌ No tengo permisos para expulsar usuarios.', 
                    ephemeral: true 
                });
            }

            if (!member) {
                return interaction.reply({ 
                    content: '❌ El usuario no está en el servidor.', 
                    ephemeral: true 
                });
            }

            try {
                await member.kick(reason);

                // Registrar en la configuración
                if (!config.modActions) config.modActions = {};
                if (!config.modActions[interaction.guild.id]) config.modActions[interaction.guild.id] = [];
                
                config.modActions[interaction.guild.id].push({
                    type: 'kick',
                    user: user.id,
                    moderator: interaction.user.id,
                    reason: reason,
                    date: new Date().toISOString()
                });
                saveConfig();

                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('✅ Usuario Expulsado')
                    .setDescription(`${user.tag} ha sido expulsado del servidor.`)
                    .addFields(
                        { name: 'Razón', value: reason, inline: true },
                        { name: 'Moderador', value: interaction.user.tag, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

                // Enviar DM al usuario expulsado
                try {
                    await user.send({
                        content: `Has sido expulsado de **${interaction.guild.name}**\nRazón: ${reason}`
                    });
                } catch (err) {
                    console.log(`No se pudo enviar DM a ${user.tag}`);
                }

            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: '❌ Ocurrió un error al expulsar al usuario.', 
                    ephemeral: true 
                });
            }
        }
    },
    // Comando /warn
    {
        data: new SlashCommandBuilder()
            .setName('warn')
            .setDescription('Advierte a un usuario')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuario a advertir')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('razon')
                    .setDescription('Razón de la advertencia')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        async execute(interaction, client, config, saveConfig) {
            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            const reason = interaction.options.getString('razon');

            if (!member) {
                return interaction.reply({ 
                    content: '❌ El usuario no está en el servidor.', 
                    ephemeral: true 
                });
            }

            // Registrar advertencia
            if (!config.warns) config.warns = {};
            if (!config.warns[interaction.guild.id]) config.warns[interaction.guild.id] = {};
            if (!config.warns[interaction.guild.id][user.id]) {
                config.warns[interaction.guild.id][user.id] = [];
            }

            config.warns[interaction.guild.id][user.id].push({
                reason: reason,
                moderator: interaction.user.id,
                date: new Date().toISOString()
            });
            saveConfig();

            const warnCount = config.warns[interaction.guild.id][user.id].length;

            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('⚠ Advertencia')
                .setDescription(`${user.tag} ha recibido una advertencia.`)
                .addFields(
                    { name: 'Razón', value: reason, inline: true },
                    { name: 'Moderador', value: interaction.user.tag, inline: true },
                    { name: 'Total de advertencias', value: warnCount.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Enviar DM al usuario advertido
            try {
                await user.send({
                    content: `Has recibido una advertencia en **${interaction.guild.name}**\nRazón: ${reason}\nTotal de advertencias: ${warnCount}`
                });
            } catch (err) {
                console.log(`No se pudo enviar DM a ${user.tag}`);
            }
        }
    },
    // Comando /warns (ver advertencias)
    {
        data: new SlashCommandBuilder()
            .setName('warns')
            .setDescription('Muestra las advertencias de un usuario')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuario a consultar')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        async execute(interaction, client, config, saveConfig) {
            const user = interaction.options.getUser('usuario');

            if (!config.warns || !config.warns[interaction.guild.id] || !config.warns[interaction.guild.id][user.id]) {
                return interaction.reply({ 
                    content: `ℹ ${user.tag} no tiene advertencias registradas.`, 
                    ephemeral: true 
                });
            }

            const userWarns = config.warns[interaction.guild.id][user.id];
            const warnCount = userWarns.length;

            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle(`⚠ Advertencias de ${user.tag}`)
                .setDescription(`Total: ${warnCount} advertencia(s)`);

            userWarns.forEach((warn, index) => {
                embed.addFields({
                    name: `Advertencia #${index + 1}`,
                    value: `**Razón:** ${warn.reason}\n**Moderador:** <@${warn.moderator}>\n**Fecha:** <t:${Math.floor(new Date(warn.date).getTime() / 1000}:f>`,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
    // Comando /clearwarns (limpiar advertencias)
    {
        data: new SlashCommandBuilder()
            .setName('clearwarns')
            .setDescription('Elimina todas las advertencias de un usuario')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuario a limpiar')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        async execute(interaction, client, config, saveConfig) {
            const user = interaction.options.getUser('usuario');

            if (!config.warns || !config.warns[interaction.guild.id] || !config.warns[interaction.guild.id][user.id]) {
                return interaction.reply({ 
                    content: `ℹ ${user.tag} no tiene advertencias para limpiar.`, 
                    ephemeral: true 
                });
            }

            const warnCount = config.warns[interaction.guild.id][user.id].length;
            delete config.warns[interaction.guild.id][user.id];
            saveConfig();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Advertencias Limpiadas')
                .setDescription(`Se eliminaron ${warnCount} advertencia(s) de ${user.tag}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
];
