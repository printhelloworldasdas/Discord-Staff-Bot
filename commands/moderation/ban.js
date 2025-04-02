const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban'))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    aliases: ['banish', 'b'],
    category: 'moderation',
    cooldown: 10,

    async execute(interaction, client, config, saveConfig) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getInteger('days') || 0;

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ 
                content: "❌ I don't have permission to ban members",
                ephemeral: true 
            });
        }

        try {
            await interaction.guild.members.ban(user, { 
                reason: `${reason} (Banned by ${interaction.user.tag})`,
                deleteMessageDays: days 
            });

            // Log to config
            if (!config.modActions) config.modActions = {};
            if (!config.modActions[interaction.guild.id]) config.modActions[interaction.guild.id] = [];
            
            config.modActions[interaction.guild.id].push({
                type: 'ban',
                user: user.id,
                moderator: interaction.user.id,
                reason: reason,
                date: new Date().toISOString()
            });
            saveConfig();

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('✅ User Banned')
                .setDescription(`${user.tag} has been banned from the server`)
                .addFields(
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Messages Deleted', value: `${days} days`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Try to DM the banned user
            try {
                await user.send(`You've been banned from **${interaction.guild.name}**\nReason: ${reason}`);
            } catch {
                console.log(`Couldn't DM ${user.tag} about their ban`);
            }

        } catch (error) {
            console.error('Ban error:', error);
            await interaction.reply({ 
                content: "❌ Failed to ban this user", 
                ephemeral: true 
            });
        }
    }
};
