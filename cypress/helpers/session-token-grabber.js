//  This will login and retrieve user session token
//  Aim is to provide a fresh user token for each test

exports.retrieveUserToken = async () => {
    const loginRequestOption = {
        url: 'http://altice.dev.kargo.com/api/v1/account/login',
        method: 'POST',
        headers: {
            authorization: 'Basic ZnJhbnR6QGthcmdvLmNvbTphZG1pbg==',
        },
    };

    const loginResponse = await cy.request(loginRequestOption);
    return loginResponse.body;  // returns user
};
