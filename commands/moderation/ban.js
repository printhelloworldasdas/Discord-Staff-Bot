const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to ban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for ban'))
        .addIntegerOption(option => 
            option.setName('delete_days')
                .setDescription('Days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction, client, config, saveConfig) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getInteger('delete_days') || 0;

        // Permission checks
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ 
                content: "❌ I don't have permission to ban members",
                ephemeral: true 
            });
        }

        try {
            // Execute ban
            await interaction.guild.members.ban(user, { 
                reason: `Banned by ${interaction.user.tag}: ${reason}`,
                deleteMessageDays: days 
            });

            // Store in config
            if (!config.modActions) config.modActions = {};
            if (!config.modActions[interaction.guild.id]) {
                config.modActions[interaction.guild.id] = [];
            }
            
            config.modActions[interaction.guild.id].push({
                type: 'ban',
                userId: user.id,
                moderatorId: interaction.user.id,
                reason: reason,
                date: new Date().toISOString(),
                deletedMessages: days
            });
            saveConfig();

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('✅ Ban Successful')
                .setDescription(`${user.tag} has been banned`)
                .addFields(
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Messages Deleted', value: `${days} day(s)`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Try to DM user
            try {
                await user.send(`You've been banned from **${interaction.guild.name}**\nReason: ${reason}`);
            } catch {
                console.log(`Couldn't DM ${user.tag} about their ban`);
            }

        } catch (error) {
            console.error('Ban error:', error);
            await interaction.reply({ 
                content: "❌ Failed to ban user", 
                ephemeral: true 
            });
        }
    }
};
