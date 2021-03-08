const { extend } = Cypress._; // _ using lodash built-in library;

// This function is expected to initialize request options with proper token
exports.requestOptions = (token, options = {}) => {
    const defaultOptions = {
        auth: {
            bearer: token,
        },
    };
    return extend(defaultOptions, options);
};
