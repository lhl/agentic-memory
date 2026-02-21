const QMD_INDEX_ENV_VAR = 'CLAWVAULT_QMD_INDEX';
const DEFAULT_TEST_QMD_INDEX = 'clawvault-test';
const configuredTestIndex = process.env.CLAWVAULT_TEST_QMD_INDEX?.trim() || DEFAULT_TEST_QMD_INDEX;

if (!process.env[QMD_INDEX_ENV_VAR]?.trim()) {
  process.env[QMD_INDEX_ENV_VAR] = configuredTestIndex;
}
