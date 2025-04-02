const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    aliases: ['warning', 'w'],
    category: 'moderation',
    cooldown: 5,

    async execute(interaction, client, config, saveConfig) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return interaction.reply({ 
                content: "❌ This user isn't in the server",
                ephemeral: true 
            });
        }

        // Initialize warns system if not exists
        if (!config.warns) config.warns = {};
        if (!config.warns[interaction.guild.id]) config.warns[interaction.guild.id] = {};
        if (!config.warns[interaction.guild.id][user.id]) {
            config.warns[interaction.guild.id][user.id] = [];
        }

        // Add warning
        config.warns[interaction.guild.id][user.id].push({
            reason: reason,
            moderator: interaction.user.id,
            date: new Date().toISOString()
        });
        saveConfig();

        const warnCount = config.warns[interaction.guild.id][user.id].length;

        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('⚠ Warning Issued')
            .setDescription(`${user.tag} has been warned`)
            .addFields(
                { name: 'Reason', value: reason, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true },
                { name: 'Total Warnings', value: warnCount.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Try to DM the warned user
        try {
            await user.send(`You've received a warning in **${interaction.guild.name}**\nReason: ${reason}\nTotal warnings: ${warnCount}`);
        } catch {
            console.log(`Couldn't DM ${user.tag} about their warning`);
        }
    }
};
