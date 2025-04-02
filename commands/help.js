const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName('help')
            .setDescription('Muestra todos los comandos disponibles')
            .addStringOption(option =>
                option.setName('categoria')
                    .setDescription('Filtrar por categoría')
                    .addChoices(
                        { name: 'Moderación', value: 'moderation' },
                        { name: 'Tickets', value: 'ticket' },
                        { name: 'Bienvenidas', value: 'welcome' },
                        { name: 'Utilidades', value: 'utility' },
                        { name: 'Diversión', value: 'fun' },
                        { name: 'Información', value: 'info' }
                    )),
        async execute(interaction, client) {
            const categoryFilter = interaction.options.getString('categoria');
            const commands = client.commands;

            // Organizar comandos por categoría
            const categories = {};
            commands.forEach(cmd => {
                const category = cmd.category || 'otros';
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(cmd.data);
            });

            // Si se filtró por categoría
            if (categoryFilter && categories[categoryFilter]) {
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`📚 Comandos de ${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}`)
                    .setDescription(`Total: ${categories[categoryFilter].length} comandos`)
                    .addFields(
                        categories[categoryFilter].map(cmd => ({
                            name: `/${cmd.name}`,
                            value: cmd.description || 'Sin descripción',
                            inline: true
                        }))
                    .setFooter({ text: `Usa /help para ver todas las categorías` });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Mostrar todas las categorías
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📚 Centro de Ayuda')
                .setDescription(`Total: ${commands.size} comandos disponibles\nUsa \`/help [categoría]\` para filtrar`)
                .addFields(
                    Object.entries(categories).map(([category, cmds]) => ({
                        name: `${category.charAt(0).toUpperCase() + category.slice(1)} (${cmds.length})`,
                        value: cmds.map(c => `\`/${c.name}\``).join(', '),
                        inline: false
                    }))
                .setFooter({ text: `Solicitado por ${interaction.user.username}` })
                .setTimestamp();

            // Botones para categorías
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('help_moderation')
                    .setLabel('Moderación')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_ticket')
                    .setLabel('Tickets')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_welcome')
                    .setLabel('Bienvenidas')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ 
                embeds: [embed], 
                components: [buttons],
                ephemeral: true 
            });
        }
    }
];
