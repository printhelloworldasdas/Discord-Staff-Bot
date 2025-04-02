const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim-ticket')
        .setDescription('Take ownership of this ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client, config) {
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: "❌ This can only be used in ticket channels",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true
        });

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Ticket Claimed')
            .setDescription(`${interaction.user} has claimed this ticket`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
