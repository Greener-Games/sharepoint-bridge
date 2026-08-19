/**
 * Example SharePoint Tab Dev Bridge Server Configuration
 * Duplicate this file as .sharepoint/serverconfig.js and customize for your local setup.
 */
module.exports = {
  profiles: {
    mainSite: {
      port: 8080,
      sharepointUrl: 'https://<tenant>.sharepoint.com/sites/MyMainSite',
    },
    templateSite: {
      port: 8081,
      sharepointUrl: 'https://<tenant>.sharepoint.com/sites/MyTemplateSite',
    },
  },
};
