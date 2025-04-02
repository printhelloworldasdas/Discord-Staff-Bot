
const { SlashCommandBuilder } = require('discord.js');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('prefix')
      .setDescription('Cambia el prefix del bot')
      .addStringOption(option =>
        option.setName('nuevo_prefix')
          .setDescription('Nuevo prefix (1-2 caracteres)')
          .setRequired(true)),
    async execute(interaction, client, config, saveConfig, t) {
      if (!interaction.memberPermissions.has('ManageGuild')) {
        return interaction.reply(t('prefix.no_permission', interaction));
      }
      const newPrefix = interaction.options.getString('nuevo_prefix');
      if (newPrefix.length > 2) {
        return interaction.reply(t('prefix.invalid_length', interaction));
      }
      config.prefixes[interaction.guild.id] = newPrefix;
      saveConfig();
      interaction.reply(t('prefix.changed', interaction, { prefix: newPrefix }));
    }
  }
];
