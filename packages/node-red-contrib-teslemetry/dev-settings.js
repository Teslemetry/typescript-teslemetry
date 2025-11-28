module.exports = {
    flowFile: 'flows.json',
    credentialSecret: 'teslemetry-dev-secret',
    flowFilePretty: true,
    uiPort: 1880,
    editorTheme: {
        projects: {
            enabled: false
        }
    },
    functionExternalModules: true,
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    }
}
