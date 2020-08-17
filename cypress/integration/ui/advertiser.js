const { retrieveUserToken } = require('../../helpers/session-token-grabber');
const { generateName } = require('../../helpers/name-helper');

context('Advertiser', () => {
    describe('Advertiser UI', () => {
        let userTokenResponse;

        before(  () => {
            userTokenResponse =  retrieveUserToken();  //logs in and returns token
        });
        beforeEach(async () => {
            const userToken = await userTokenResponse;  // needed for userToken to be retained
            localStorage.setItem('user_token', userToken);
        });

        // create CRUD test
        let advertiserID;
        let advertiserName = generateName('Advertiser');
        let externalId = generateName('ex-ID');
        
        it('Create an Advertiser', () => {
            cy.server();
            cy.route('POST', '/api/v1/advertisers').as('advertiserCreation')
            
            cy.visit('');
            cy.get('[mattooltip="Create new Advertiser"]').click(); // clicking on create advertiser button
            cy.get('[placeholder="Enter Name"]').click().type(advertiserName, { force: true }); // force true needed ensure stability of test
            cy.get('[placeholder="Enter External ID"]').type(externalId); 
            cy.get('[mattooltip="Save changes"]').click().wait('@advertiserCreation').its('status').should('eq', 200);
            cy.url().should('include', '/advertisers/'); 
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                advertiserID = urlPathName.split('/').pop(); // Grabbing Deal ID from URL
              });
        });
        
        it('Verify elements of Previously Created Advertiser', () => {
            cy.server();
            cy.route(`api/v1/advertisers?sort_order=desc&sort_by=id&page=0&limit=*&search=${advertiserName}`).as('searchAPI');
            
            cy.visit('');
            cy.get('[placeholder="Search"]', { timeout: 2000 }).type(advertiserName).wait('@searchAPI'); // adding wait for api return results
            cy.get('[mattooltip="View advertiser"]').click();  // Click on View Advertiser button on the 1st row 
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', advertiserName);  // verifies title 
            cy.log('Verifies Active is checked');
            cy.get('div:nth-child(2) > i').should('have.class', 'fa fa-check');  // verifies Active is checked 
            cy.log('Verifies Approved is checked');
            cy.get('div:nth-child(3) > i').should('have.class', 'fa fa-check');  // verifies Approved is checked 
            cy.log('Verifies Political is NOT checked');
            cy.get('div:nth-child(4) > i').should('have.class', 'fa fa-minus');  // verifies Political is NOT checked 
            cy.log('Verifies External ID');
            cy.get('div.col-sm-2.col-lg-3.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', externalId);  // verifies External ID  
        });
        
        it('Edit Advertiser to make it Political', () => {
            advertiserName += '-update'
            externalId += '!!'
            cy.visit(`/advertisers/${advertiserID}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on edit advertiser button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit advertiser option
            cy.get('[placeholder="Enter Name"]').clear({ force: true }).type(advertiserName); 
            cy.get('[placeholder="Enter External ID"]').clear({ force: true }).type(externalId);

            // Adding Political Info
            cy.get('[role="switch"]').click({ force: true }); // Toggle for turning on Political
            cy.get('#mat-select-1').click({ force: true }); // Dropdown for 'Federal' or 'State/local'
            cy.get('[class="mat-option-text"]').first().click({ force: true });  // Selecting Federal
            cy.get('[mattooltip="Save changes"]').click(); 
        });

        it('Verify elements of Previously Created Political Advertiser', () => {
            cy.visit(`/advertisers/${advertiserID}`);
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', advertiserName);  // verifies title 
            cy.log('Verifies Active is checked');
            cy.get('div:nth-child(2) > i').should('have.class', 'fa fa-check');  // verifies Active is checked 
            cy.log('Verifies Approved is checked');
            cy.get('div:nth-child(3) > i').should('have.class', 'fa fa-minus');  // verifies Approved is checked 
            cy.log('Verifies Political is NOT checked');
            cy.get('div:nth-child(4) > i').should('have.class', 'fa fa-check');  // verifies Political is NOT checked 
            cy.log('Verifies External ID');
            cy.get('div.col-sm-2.col-lg-3.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', externalId);  // verifies External ID 
        });
    });
});