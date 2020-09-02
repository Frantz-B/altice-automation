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
            cy.get('[mattooltip="Create new Placement"]', { timeout: 8000 }).click(); // clicking on create campaign button
            cy.get('[placeholder="Enter Name"]').click().type(placementName, { force: true }); // Force true needed to ensure string is fully typed
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
            cy.get('[placeholder="Search"]', { timeout: 8000 }).type(placementName).wait('@searchAPI'); // adding wait for api return results
            
            // Verifying list of results on Campaign detail page
            cy.log('Verifies Placement Name');
            cy.get('[mattooltip="View placement"]', { timeout: 8000 }).should('contain', placementName);  // verifies Name of Placement
            cy.log('Verifies Rate');
            cy.get('mat-cell.cdk-column-rate').should('contain', rate + '.00');  // verifies Rate of Placement
            cy.log('Verifies Rate Unit Type');
            cy.get('mat-cell.cdk-column-rateUnit').should('contain', 'CPM');  // verifies Rate Unit Type of Placement
            cy.log('Verifies Impression Goal');
            cy.get('.mat-cell.cdk-column-impressionGoal').should('contain', Intl.NumberFormat().format(impressionGoal));  // verifies Impression Goal of Placement
            
            //  Vreifying Placement Detail Page
            cy.get('[mattooltip="View placement"]').click();  // Clicks on Placement from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', placementName);  // verifies Title 
            cy.log('Verifies Rate on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').first().should('contain', rate + '.00');  // verifies Rate on Placement Detail page 
            cy.log('Verifies Rate Unit Type on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').first().should('contain', 'CPM');  // verifies Rate Unit Type on Placement Detail page 
            cy.log('Verifies Impression Goal on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').last().should('contain', Intl.NumberFormat().format(impressionGoal));  // verifies Impression Goal on Placement Detail page 
            
            //  Vreifying Placement detail page icons
            cy.log('Verifies Rate icon is displayed');
            cy.get('ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include','monetization_on-24px.svg');  // verifies Rate icon is displayed
            cy.log('Verifies Rate Unit icon is displayed');
            cy.get('ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include','trending_up-24px.svg');  // verifies Rate Unit icon is displayed
            cy.log('Verifies Flight Dates icon is displayed');
            cy.get('div.col-sm-5.col-lg-6.margin-bottom-10-mobile > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include','date_range-24px.svg');  // verifies Flight Dates icon is displayed
            cy.log('Verifies Impression Goal icon is displayed');
            cy.get('div.col-sm-5.col-lg-6.margin-bottom-10-mobile > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include','emoji_events-24px.svg');  // verifies Impression Goal icon is displayed
            cy.log('Verifies Impressions icon is displayed');
            cy.get('kt-pacing-full > div > div.title-row.justify-content-between > h6 > i > img').should('have.attr', 'src').should('include','visibility-24px.svg');  // verifies Impressions icon is displayed
            cy.log('Verifies Goal icon is displayed');
            cy.get('div.title-row.justify-content-between > span > i > img').should('have.attr', 'src').should('include','emoji_events-24px.svg');  // verifies Goal icon is displayed
        });
        
        it('Edit Placement', () => {
            placementName += '-update'
            rate += 14
            impressionGoal += 7000

            cy.visit(`/placements/${placementId}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]', { timeout: 8000 }).click(); // clicking on Edit Placement button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Placement option
            cy.get('[placeholder="Enter Name"]').clear({ force: true }).type(placementName); 
            cy.get('[placeholder="Enter Rate"]').clear({ force: true }).type(rate); 
            cy.get('[placeholder="Enter Impression Goal"]').clear({ force: true }).type(impressionGoal);
            cy.get('[mattooltip="Save changes"]').click();  //.wait(1000)
            cy.url().should('include', '/placements/');  
        });

        it('Verify elements of Previously Edited Placements on its Detail Page', () => {
            cy.visit(`/placements/${placementId}`);
            cy.get('[class="kt-subheader__title ng-star-inserted"]', { timeout: 8000 }).should('contain', placementName);  // verifies Title 
            cy.log('Verifies Rate on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').first().should('contain', rate + '.00');  // verifies Rate on Placement Detail page 
            cy.log('Verifies Rate Unit Type on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').first().should('contain', 'CPM');  // verifies Rate Unit Type on Placement Detail page 
            cy.log('Verifies Impression Goal on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').last().should('contain', Intl.NumberFormat().format(impressionGoal));  // verifies Impression Goal on Placement Detail page 

            //  Vreifying Placement detail page icons
            cy.log('Verifies Rate icon is displayed');
            cy.get('ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include','monetization_on-24px.svg');  // verifies Rate icon is displayed
            cy.log('Verifies Rate Unit icon is displayed');
            cy.get('ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include','trending_up-24px.svg');  // verifies Rate Unit icon is displayed
            cy.log('Verifies Flight Dates icon is displayed');
            cy.get('div.col-sm-5.col-lg-6.margin-bottom-10-mobile > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include','date_range-24px.svg');  // verifies Flight Dates icon is displayed
            cy.log('Verifies Impression Goal icon is displayed');
            cy.get('div.col-sm-5.col-lg-6.margin-bottom-10-mobile > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include','emoji_events-24px.svg');  // verifies Impression Goal icon is displayed
            cy.log('Verifies Impressions icon is displayed');
            cy.get('kt-pacing-full > div > div.title-row.justify-content-between > h6 > i > img').should('have.attr', 'src').should('include','visibility-24px.svg');  // verifies Impressions icon is displayed
            cy.log('Verifies Goal icon is displayed');
            cy.get('div.title-row.justify-content-between > span > i > img').should('have.attr', 'src').should('include','emoji_events-24px.svg');  // verifies Goal icon is displayed
        });
    });
});
