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
        const political = {
            name: 'UI Kargo-QA',
            orgName: 'Kargo Automation',
            office: 'Kargo NYC',
            phone: '2129790000',
            repName: 'Quality',
            address: '4 Broad ST',
            city: 'Manhattan',
            zipCode: 10004,
            email: 'dev@kargo.com',
            fedId: '111-00-0101'
        };
        
        it('Create an Advertiser', () => {
            cy.visit('');
            cy.get('[mattooltip="Create new Advertiser"]').click(); // clicking on create advertiser button
            cy.get('[placeholder="Enter Name"]').click().type(advertiserName); // click() needed ensure stability of test
            cy.get('[placeholder="Enter External ID"]').type(externalId); 
            cy.get('[mattooltip="Save changes"]').click().wait(1000);
            cy.url().should('include', '/advertisers/'); 
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                advertiserID = urlPathName.split('/').pop(); // Grabbing Deal ID from URL
              });
        });
        
        it('Verify elements of Previously Created Advertiser', () => {
            cy.server();
            cy.route(`api/v1/advertisers?sort_order=desc&sort_by=id&page=0&limit=10&search=${advertiserName}`).as('searchAPI');
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
            cy.get('[role="switch"]').click({ force: true }); 
            cy.get('[placeholder="Enter Subject Name"]').type(political.name); 
            cy.get('[placeholder="Enter Office"]').type(political.office); 
            cy.get('[placeholder="Enter representative Name"]').type(political.repName); 
            cy.get('[placeholder="Enter Representative Email"]').type(political.email); 
            cy.get('[placeholder="Enter Federal Id Number"]').type(political.fedId); 
            cy.get('[placeholder="Enter Organization Name"]').type(political.orgName); 
            cy.get('[placeholder="Enter Organization Address"]').type(political.address); 
            cy.get('[placeholder="Enter Organization City"]').type(political.city); 
            cy.get('[placeholder="Select Organization State"]').click(); 
            cy.contains('New York').click(); // Selecting New York for State
            cy.get('[placeholder="Enter Organization Zip Code"]').type(political.zipCode); 
            cy.get('[placeholder="Enter Organization Phone Number"]').type(political.phone); 
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
            
            // Verify Political Section
            cy.log('Verifies Political Name');
            cy.get('li:nth-child(1)').eq(2).should('contain', political.name);  // verifies Political Name 
            cy.log('Verifies Political Office');
            cy.get('li:nth-child(2)').eq(2).should('contain', political.office);  // verifies Political Office 
            cy.log('Verifies Political Rep Name');
            cy.get('li:nth-child(3)').eq(0).should('contain', political.repName);  // verifies Political Rep Name 
            cy.log('Verifies Political Email');
            cy.get('li:nth-child(4)').should('contain', political.email);  // verifies Political Email 
            cy.log('Verifies Political Org Name');
            cy.get('li:nth-child(1)').eq(3).should('contain', political.orgName);  // verifies Political Org Name 
            cy.log('Verifies Political Phone');
            cy.get('li:nth-child(2)').eq(3).should('contain', political.phone);  // verifies Political Phone 
            cy.log('Verifies Political Address');
            cy.get('li:nth-child(3)').eq(1).should('contain', political.address);  // verifies Political Address 
        });
    });
});