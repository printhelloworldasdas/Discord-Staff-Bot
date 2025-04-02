const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Check a user\'s warnings')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    aliases: ['warnings', 'checkwarns'],
    category: 'moderation',

    async execute(interaction, client, config) {
        const user = interaction.options.getUser('user');

        if (!config.warns || !config.warns[interaction.guild.id] || !config.warns[interaction.guild.id][user.id]) {
            return interaction.reply({ 
                content: `ℹ ${user.tag} has no warnings`,
                ephemeral: true 
            });
        }

        const userWarns = config.warns[interaction.guild.id][user.id];
        const warnCount = userWarns.length;

        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle(`⚠ Warnings for ${user.tag}`)
            .setDescription(`Total: ${warnCount} warning(s)`);

        userWarns.forEach((warn, index) => {
            const timestamp = Math.floor(new Date(warn.date).getTime() / 1000);
            embed.addFields({
                name: `Warning #${index + 1}`,
                value: `**Reason:** ${warn.reason}\n**Moderator:** <@${warn.moderator}>\n**Date:** <t:${timestamp}:f>`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
