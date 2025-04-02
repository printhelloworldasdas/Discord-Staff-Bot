const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    aliases: ['remove', 'k'],
    category: 'moderation',
    cooldown: 10,

    async execute(interaction, client, config, saveConfig) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(user.id);

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ 
                content: "❌ I don't have permission to kick members",
                ephemeral: true 
            });
        }

        if (!member) {
            return interaction.reply({ 
                content: "❌ This user isn't in the server",
                ephemeral: true 
            });
        }

        try {
            await member.kick(`${reason} (Kicked by ${interaction.user.tag})`);

            // Log to config
            if (!config.modActions) config.modActions = {};
            if (!config.modActions[interaction.guild.id]) config.modActions[interaction.guild.id] = [];
            
            config.modActions[interaction.guild.id].push({
                type: 'kick',
                user: user.id,
                moderator: interaction.user.id,
                reason: reason,
                date: new Date().toISOString()
            });
            saveConfig();

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('✅ User Kicked')
                .setDescription(`${user.tag} has been kicked from the server`)
                .addFields(
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Try to DM the kicked user
            try {
                await user.send(`You've been kicked from **${interaction.guild.name}**\nReason: ${reason}`);
            } catch {
                console.log(`Couldn't DM ${user.tag} about their kick`);
            }

        } catch (error) {
            console.error('Kick error:', error);
            await interaction.reply({ 
                content: "❌ Failed to kick this user", 
                ephemeral: true 
            });
        }
    }
};
