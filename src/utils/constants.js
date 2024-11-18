export const DIFY_APPS = {
  APP_1: {
    ID: 'd0ed912c-9e20-4a6f-bf94-65b1e11c195c',
    NAME: 'First Application',
    DESCRIPTION: 'Main workflow application'
  }
};

export const SYSTEM_USER = {
  ID: 'b16eba17-da94-413a-9af4-52409ab64d7c'
};

export const INPUT_FIELDS = {
  INSIGHTS_NUMBER: {
    variable: 'insights_number',
    label: 'Number of Insights per question',
    required: true,
    type: 'select',
    options: ['5', '10', '15', '20', '25']
  },
  SUMMARY_INSIGHTS_NUMBER: {
    variable: 'summary_insights_number',
    label: 'Number of Summary Insights',
    required: true,
    type: 'select',
    options: ['10', '20', '30', '40', '50']
  },
  LANGUAGE: {
    variable: 'language',
    label: 'Language',
    required: true,
    type: 'select',
    options: ['Български', 'English']
  }
};