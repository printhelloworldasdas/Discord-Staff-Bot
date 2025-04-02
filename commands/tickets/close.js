const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close-ticket')
        .setDescription('Close this support ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction, client, config) {
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: "❌ This can only be used in ticket channels",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Ticket Closed')
            .setDescription(`This ticket has been closed by ${interaction.user}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        
        // Delete after 5 seconds
        setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
    }
};
