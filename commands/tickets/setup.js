const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Set up the ticket system in this server')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Where the ticket message will appear')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Category where tickets will be created')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client, config, saveConfig) {
        const channel = interaction.options.getChannel('channel');
        const category = interaction.options.getChannel('category');

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: "❌ Please select a text channel",
                ephemeral: true
            });
        }

        try {
            // Create ticket panel embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Support Tickets')
                .setDescription('Click the button below to create a support ticket')
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Create Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

            await channel.send({ embeds: [embed], components: [button] });

            // Save configuration
            if (!config.tickets) config.tickets = {};
            config.tickets[interaction.guild.id] = {
                channelId: channel.id,
                categoryId: category?.id || null,
                enabled: true
            };
            saveConfig();

            await interaction.reply({
                content: `✅ Ticket system setup complete in ${channel}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Ticket setup error:', error);
            await interaction.reply({
                content: "❌ Failed to setup ticket system",
                ephemeral: true
            });
        }
    }
};
