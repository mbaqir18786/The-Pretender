function timestamp() {
    return new Date().toISOString();
}

module.exports = {
    info: (event, details) => {
        console.log(`[INFO] ${timestamp()} [${event}] ${details}`);
    },
    warn: (event, details) => {
        console.warn(`[WARN] ${timestamp()} [${event}] ${details}`);
    },
    error: (event, details, err) => {
        console.error(`[ERROR] ${timestamp()} [${event}] ${details}`, err || '');
    }
};
