const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = [
    // Comando para configurar el sistema de tickets
    {
        data: new SlashCommandBuilder()
            .setName('setup-tickets')
            .setDescription('Configura el sistema de tickets en este servidor')
            .addChannelOption(option =>
                option.setName('canal')
                    .setDescription('Canal donde aparecerá el mensaje de tickets')
                    .setRequired(true))
            .addChannelOption(option =>
                option.setName('categoria')
                    .setDescription('Categoría donde se crearán los tickets')
                    .setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        async execute(interaction, client, config, saveConfig) {
            const channel = interaction.options.getChannel('canal');
            const category = interaction.options.getChannel('categoria');

            if (!channel.isTextBased()) {
                return interaction.reply({
                    content: '❌ El canal debe ser un canal de texto.',
                    ephemeral: true
                });
            }

            try {
                // Crear el mensaje con botón para tickets
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Soporte de Tickets')
                    .setDescription('¿Necesitas ayuda? Haz clic en el botón para crear un ticket privado con nuestro equipo de soporte.')
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

                const button = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('Crear Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫')
                );

                await channel.send({ embeds: [embed], components: [button] });

                // Guardar configuración
                if (!config.tickets) config.tickets = {};
                config.tickets[interaction.guild.id] = {
                    channelId: channel.id,
                    categoryId: category?.id || null
                };
                saveConfig();

                await interaction.reply({
                    content: `✅ Sistema de tickets configurado correctamente en ${channel}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: '❌ Ocurrió un error al configurar el sistema de tickets.',
                    ephemeral: true
                });
            }
        }
    },
    // Comando para cerrar tickets (usado dentro de los canales de ticket)
    {
        data: new SlashCommandBuilder()
            .setName('cerrar-ticket')
            .setDescription('Cierra este ticket')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        async execute(interaction, client, config, saveConfig) {
            if (!interaction.channel.name.startsWith('ticket-')) {
                return interaction.reply({
                    content: '❌ Este comando solo puede usarse en canales de ticket.',
                    ephemeral: true
                });
            }

            try {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Ticket Cerrado')
                    .setDescription(`Este ticket ha sido cerrado por ${interaction.user}`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                
                // Esperar 5 segundos antes de eliminar
                await new Promise(resolve => setTimeout(resolve, 5000));
                await interaction.channel.delete();
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: '❌ Ocurrió un error al cerrar el ticket.',
                    ephemeral: true
                });
            }
        }
    }
];
