/** `ADM 1.1: Short message`: ticket id (story code, phase, ticket), colon, subject. The whole first line is at most 75 characters. */
const HEADER = /^([A-Z]{2,5} \d+(?:\.\d+)+): (\S.*)$/;

export default {
  parserPreset: {
    parserOpts: {
      headerPattern: HEADER,
      headerCorrespondence: ['ticket', 'subject'],
    },
  },
  // Merges, reverts and dependency bots write their own subjects.
  ignores: [(message) => /^(Merge|Revert|Bump) /.test(message)],
  plugins: [
    {
      rules: {
        'ticket-header': ({ header }) => [
          HEADER.test(header ?? ''),
          'the first line must be "<STORY> <phase>.<ticket>: <message>", such as "ADM 1.1: Add setlists"',
        ],
        'body-point-form': ({ body }) => {
          const lines = (body ?? '').split('\n').filter((line) => line.trim() !== '');
          const bad = lines.find((line) => !/^(- |\s{2,}\S)/.test(line));
          return [
            bad === undefined,
            `the body is point form, each point starting with "- " (found: "${bad}")`,
          ];
        },
      },
    },
  ],
  rules: {
    'ticket-header': [2, 'always'],
    'body-point-form': [2, 'always'],
    'header-max-length': [2, 'always', 75],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
  },
};
