const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName('help')
            .setDescription('Muestra todos los comandos disponibles')
            .addStringOption(option =>
                option.setName('categoria')
                    .setDescription('Categoría específica de comandos')
                    .addChoices(
                        { name: 'Moderación', value: 'moderation' },
                        { name: 'Tickets', value: 'ticket' },
                        { name: 'Bienvenidas', value: 'welcome' },
                        { name: 'Utilidades', value: 'utility' },
                        { name: 'Diversión', value: 'fun' },
                        { name: 'Información', value: 'info' }
                    )),
        async execute(interaction, client) {
            const category = interaction.options.getString('categoria');
            const commands = client.commands;

            // Organizar comandos por categoría
            const categories = {
                moderation: [],
                ticket: [],
                welcome: [],
                utility: [],
                fun: [],
                info: []
            };

            commands.forEach(cmd => {
                const cmdCategory = cmd.data.name.split('-')[0] || 'utility';
                if (categories[cmdCategory]) {
                    categories[cmdCategory].push(cmd.data);
                } else {
                    categories.utility.push(cmd.data);
                }
            });

            // Si se solicita una categoría específica
            if (category && categories[category]) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Comandos de ${category.charAt(0).toUpperCase() + category.slice(1)}`)
                    .setDescription(`Aquí tienes todos los comandos disponibles en la categoría ${category}`)
                    .addFields(
                        categories[category].map(cmd => ({
                            name: `/${cmd.name}`,
                            value: cmd.description || 'Sin descripción',
                            inline: true
                        }))
                    )
                    .setFooter({ text: `Total: ${categories[category].length} comandos` });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Mostrar todas las categorías
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📚 Todos los comandos disponibles')
                .setDescription('Usa `/help [categoría]` para ver comandos específicos')
                .addFields(
                    Object.entries(categories).map(([cat, cmds]) => ({
                        name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${cmds.length})`,
                        value: cmds.slice(0, 3).map(c => `\`/${c.name}\``).join(', ') + (cmds.length > 3 ? `... +${cmds.length - 3} más` : ''),
                        inline: true
                    }))
                .setFooter({ text: `Total: ${commands.size} comandos disponibles` });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
];
