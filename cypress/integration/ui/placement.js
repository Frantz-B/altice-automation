const { retrieveUserToken } = require('../../helpers/session-token-grabber');
const { generateName, generateRandomNum } = require('../../helpers/name-helper');

context('Placement', () => {
    describe('Placement UI', () => {
        let userTokenResponse;
        let apiToken;
        
        before(  () => {
            userTokenResponse =  retrieveUserToken();  //logs in and returns token
        });
        beforeEach(async () => {
            const userToken = await userTokenResponse;  // needed for userToken to be retained
            apiToken = userToken;
            localStorage.setItem('user_token', userToken);  // needed for UI tests
        });


        let campaignId;
        let placementId;
        let placementName = generateName('Placement');
        let rate = generateRandomNum(100);
        let impressionGoal = generateRandomNum(900000);


        // create CRUD test
        it('Retrieve an Campaign to select as Parent', () => {
            const lastCreatedCampaign = Cypress.moment().format('YY.');
            
            const getRequest = (options = {}) => {
                const defaultOptions = {
                    auth: {
                        bearer: apiToken
                    },
                };
                return Cypress._.extend(defaultOptions, options); // _ using lodash built-in library
            };

            const campaignRequestOptions = getRequest({
                url: `/api/v1/campaigns?sort_order=desc&sort_by=id&page=0&limit=10&search=${lastCreatedCampaign}`,
            });

            cy.request(campaignRequestOptions).then((resp) => {
                const campaignRow = resp.body.rows;
                if( campaignRow.length == 0 ) {
                    throw new Error("No Campaign Id returned"); // Temp solution
                } else {
                    campaignId = campaignRow[0].id;
                    cy.log('Campaign ID found:' + campaignId);
                }
            });
        });

        it('Create a Placement', () => {
            cy.visit(`/campaigns/${campaignId}`);
            cy.get('[mattooltip="Create new Placement"]').click(); // clicking on create campaign button
            cy.get('[placeholder="Enter Name"]').click().type(placementName); // click() needed ensure stability of test
            cy.get('[placeholder="Enter Rate"]').type(rate); 
            cy.get('[placeholder="Deal Type"]').click(); // selecting Rate Unit
            cy.get('[value="CPM"]').click(); // selecting CPM for the rate type
            cy.get('[placeholder="Enter Impression Goal"]').type(impressionGoal);
            cy.get('[mattooltip="Save changes"]').click();  //.wait(1000) <- will evaluate if this wait is needed
            cy.url().should('include', '/placements/'); 
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                placementId = urlPathName.split('/').pop(); // Grabbing Placement ID from URL
            });
        });
        
        it('Verify elements of Previously Created Placement', () => {
            cy.server();
            cy.route(`api/v1/placements?sort_order=desc&sort_by=id&page=0&limit=*&campaignId=${campaignId}&search=${placementName}`)
                .as('searchAPI');

            cy.visit(`/campaigns/${campaignId}`);
            cy.get('[placeholder="Search"]', { timeout: 2000 }).type(placementName).wait('@searchAPI'); // adding wait for api return results
            
            // Verifying list of results on Campaign detail page
            cy.log('Verifies Placement Name');
            cy.get('[mattooltip="View placement"]').should('contain', placementName);  // verifies Name of Placement
            cy.log('Verifies Rate');
            cy.get('mat-cell.cdk-column-rate').should('contain', rate + '.00');  // verifies Rate of Placement
            cy.log('Verifies Rate Unit Type');
            cy.get('mat-cell.cdk-column-rateUnit').should('contain', 'CPM');  // verifies Rate Unit Type of Placement
            cy.log('Verifies Impression Goal');
            cy.get('.mat-cell.cdk-column-impressionGoal').should('contain', Intl.NumberFormat().format(impressionGoal));  // verifies Impression Goal of Placement
            
            //  Verifying Placement Detail Page
            cy.get('[mattooltip="View placement"]').click();  // Clicks on Placement from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', placementName);  // verifies Title 
            cy.log('Verifies Rate on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').first().should('contain', rate + '.00');  // verifies Rate on Placement Detail page 
            cy.log('Verifies Rate Unit Type on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').first().should('contain', 'CPM');  // verifies Rate Unit Type on Placement Detail page 
            cy.log('Verifies Impression Goal on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').last().should('contain', Intl.NumberFormat().format(impressionGoal));  // verifies Impression Goal on Placement Detail page 
        });
        
        it('Edit Placement', () => {
            placementName += '-update'
            rate += 14
            impressionGoal += 7000

            cy.visit(`/placements/${placementId}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Placement button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Placement option
            cy.get('[placeholder="Enter Name"]').clear({ force: true }).type(placementName); 
            cy.get('[placeholder="Enter Rate"]').clear({ force: true }).type(rate); 
            cy.get('[placeholder="Enter Impression Goal"]').clear({ force: true }).type(impressionGoal);
            cy.get('[mattooltip="Save changes"]').click();  //.wait(1000)
            cy.url().should('include', '/placements/');  
        });

        it('Verify elements of Previously Edited Placements on its Detail Page', () => {
            cy.visit(`/placements/${placementId}`);
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', placementName);  // verifies Title 
            cy.log('Verifies Rate on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').first().should('contain', rate + '.00');  // verifies Rate on Placement Detail page 
            cy.log('Verifies Rate Unit Type on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').first().should('contain', 'CPM');  // verifies Rate Unit Type on Placement Detail page 
            cy.log('Verifies Impression Goal on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').last().should('contain', Intl.NumberFormat().format(impressionGoal));  // verifies Impression Goal on Placement Detail page 
        });
    });
});
