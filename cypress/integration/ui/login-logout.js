context('Login-Logout', () => {
    describe('Login-Logout UI', () => {
        it('Login using valid credentials', () => {
            cy.visit('');
            cy.get('[placeholder="Email"]').focus().clear().type('Frantz@kargo.com');
            cy.get('[placeholder="Password"]').focus().clear().type('admin');
            cy.get('[id="kt_login_signin_submit"]').click().then(() => {
                cy.url().should('include', 'advertisers');
            });
        });

        it('Logout', () => {
            cy.get('[class="kt-header__topbar-icon"]').click(); // clicking avatar
            cy.get('[class="btn btn-label-brand btn-sm btn-bold"]').first().click().then(() => { // clicking on sign out
                cy.url().should('include', 'login?returnUrl');// User redirected to login page
            });
        });

        it('Login using invalid credentials', () => {
            cy.visit('');
            cy.get('[placeholder="Email"]').focus().clear().type('eh@kargo.com');
            cy.get('[placeholder="Password"]').focus().clear().type('wrong');
            cy.get('[id="kt_login_signin_submit"]').click();
            cy.get('[class="alert-text"]').should('contain', 'The login email or password are incorrect'); // verifying the displayed message when the user enters an invalid password / email.
        });

        xit('Forget Password'); // Will be added when feature is completed & pushed to Dev
    });
});
