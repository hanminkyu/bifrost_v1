module.exports = (function () {
    return {
        local: {
            host: 'localhost',
            port: '3306',
            user: 'root',
            password: 'root',
            database: 'bifrost'
        },
        real: {
            host: '',
            port: '',
            user: '',
            password: '',
            database: ''
        }
    }
})();
