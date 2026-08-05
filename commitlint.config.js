export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'schemas',
        'entitlements',
        'extraction',
        'evals',
        'pipeline',
        'telemetry',
        'web',
        'docs',
        'ci',
        'repo',
        'deps',
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
  },
};
