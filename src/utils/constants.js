export const DIFY_APPS = {
  APP_1: {
    ID: '4c9a6fd8-e444-409b-aa34-a963054cd5da',
    NAME: 'First Application',
    DESCRIPTION: 'Main workflow application'
  }
};

export const SYSTEM_USER = {
  ID: 'b16eba17-da94-413a-9af4-52409ab64d7c'
};

export const INPUT_FIELDS = {
  SYSTEM_MESSAGE_1: {
    variable: 'system_message_1',
    label: 'System Message 1',
    required: true,
    maxLength: 10000
  },
  SYSTEM_MESSAGE_2: {
    variable: 'system_message_2',
    label: 'System Message 2',
    required: true,
    maxLength: 10000
  },
  USER_PROMPT_1: {
    variable: 'user_prompt_1',
    label: 'User Prompt 1',
    required: true,
    maxLength: 10000
  },
  USER_PROMPT_2: {
    variable: 'user_prompt_2',
    label: 'User Prompt 2',
    required: true,
    maxLength: 10000
  }
};