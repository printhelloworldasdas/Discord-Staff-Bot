const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarns')
        .setDescription('Clear all warnings from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to clear warnings from')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    aliases: ['removewarns', 'cw'],
    category: 'moderation',
    cooldown: 5,

    async execute(interaction, client, config, saveConfig) {
        const user = interaction.options.getUser('user');

        if (!config.warns || !config.warns[interaction.guild.id] || !config.warns[interaction.guild.id][user.id]) {
            return interaction.reply({ 
                content: `ℹ ${user.tag} has no warnings to clear`,
                ephemeral: true 
            });
        }

        const warnCount = config.warns[interaction.guild.id][user.id].length;
        delete config.warns[interaction.guild.id][user.id];
        saveConfig();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Warnings Cleared')
            .setDescription(`Removed ${warnCount} warning(s) from ${user.tag}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
