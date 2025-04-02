const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName('language')
            .setDescription('Change the bot language / Cambiar el idioma del bot')
            .addStringOption(option =>
                option.setName('lang')
                    .setDescription('Select language / Seleccionar idioma')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Español', value: 'es' },
                        { name: 'English', value: 'en' }
                    )),
        async execute(interaction, client, config, saveConfig) {
            const lang = interaction.options.getString('lang');
            
            // Guardar preferencia de usuario
            if (!config.userLanguages) config.userLanguages = {};
            config.userLanguages[interaction.user.id] = lang;
            saveConfig();
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(lang === 'es' ? 'Idioma actualizado' : 'Language updated')
                .setDescription(t('language.updated', interaction))
                .setFooter({ text: t('language.current', interaction) });
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('mylanguage')
            .setDescription('Check your current language / Ver tu idioma actual'),
        async execute(interaction, client, config) {
            const lang = config.userLanguages?.[interaction.user.id] || config.language || 'es';
            const languageName = lang === 'es' ? 'Español' : 'English';
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(lang === 'es' ? 'Tu idioma' : 'Your language')
                .setDescription(`${t('language.current', interaction)}\n\n${lang === 'es' ? 'Usa `/language` para cambiarlo' : 'Use `/language` to change it'}`)
                .addFields(
                    { name: lang === 'es' ? 'Idioma' : 'Language', value: languageName, inline: true },
                    { name: 'Code', value: lang, inline: true }
                );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
];
