const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for kick'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction, client, config, saveConfig) {
        const user = interaction.options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Permission checks
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ 
                content: "❌ I don't have permission to kick members",
                ephemeral: true 
            });
        }

        if (!member) {
            return interaction.reply({ 
                content: "❌ User not found in this server",
                ephemeral: true 
            });
        }

        try {
            // Execute kick
            await member.kick(`Kicked by ${interaction.user.tag}: ${reason}`);

            // Store in config
            if (!config.modActions) config.modActions = {};
            if (!config.modActions[interaction.guild.id]) {
                config.modActions[interaction.guild.id] = [];
            }
            
            config.modActions[interaction.guild.id].push({
                type: 'kick',
                userId: user.id,
                moderatorId: interaction.user.id,
                reason: reason,
                date: new Date().toISOString()
            });
            saveConfig();

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('✅ Kick Successful')
                .setDescription(`${user.tag} has been kicked`)
                .addFields(
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Try to DM user
            try {
                await user.send(`You've been kicked from **${interaction.guild.name}**\nReason: ${reason}`);
            } catch {
                console.log(`Couldn't DM ${user.tag} about their kick`);
            }

        } catch (error) {
            console.error('Kick error:', error);
            await interaction.reply({ 
                content: "❌ Failed to kick user", 
                ephemeral: true 
            });
        }
    }
};
