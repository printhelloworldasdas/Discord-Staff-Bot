const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Check a user\'s warnings')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to check')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction, client, config) {
        const user = interaction.options.getUser('user');

        // Check if user has any warnings
        if (!config.warns?.[interaction.guild.id]?.[user.id]?.length) {
            return interaction.reply({ 
                content: `ℹ ${user.tag} has no warnings`,
                ephemeral: true 
            });
        }

        const warnings = config.warns[interaction.guild.id][user.id];
        const warnCount = warnings.length;

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle(`⚠ Warnings for ${user.tag}`)
            .setDescription(`Total: ${warnCount} warning(s)`);

        // Add each warning as a field
        warnings.forEach((warn, index) => {
            const date = new Date(warn.date);
            embed.addFields({
                name: `Warning #${index + 1}`,
                value: `**Reason:** ${warn.reason}\n**By:** <@${warn.moderatorId}>\n**Date:** <t:${Math.floor(date.getTime()/1000)}:f>`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
