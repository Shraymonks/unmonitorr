export default {
  '*.cjs': ['eslint --fix', 'prettier --write'],
  '*.ts': (files) => {
    const filesList = files.join(' ');
    return [
      'tsc --noEmit',
      `eslint --fix ${filesList}`,
      `prettier --write ${filesList}`,
    ];
  },
  '*.{json,md}': 'prettier --write',
};
