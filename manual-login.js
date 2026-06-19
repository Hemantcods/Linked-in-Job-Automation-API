const { createManualLoginSession } = require('./linkedinFunctions');

(async () => {
  try {
    await createManualLoginSession('state.json');
    console.log('Manual login process complete. state.json has been created.');
  } catch (error) {
    console.error('Failed to create manual login session:', error.message);
    process.exit(1);
  }
})();