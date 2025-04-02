const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all warnings from a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to clear warnings from')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction, client, config, saveConfig) {
        const user = interaction.options.getUser('user');

        // Check if user has warnings
        if (!config.warns?.[interaction.guild.id]?.[user.id]?.length) {
            return interaction.reply({ 
                content: `ℹ ${user.tag} has no warnings to clear`,
                ephemeral: true 
            });
        }

        const warnCount = config.warns[interaction.guild.id][user.id].length;
        
        // Clear warnings
        delete config.warns[interaction.guild.id][user.id];
        saveConfig();

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Warnings Cleared')
            .setDescription(`Removed ${warnCount} warning(s) from ${user.tag}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
