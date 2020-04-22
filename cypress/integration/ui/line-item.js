const { retrieveUserToken } = require('../../helpers/session-token-grabber');
const { generateName, generateRandomNum } = require('../../helpers/name-helper');

context('Line-Item', () => {
    describe('Line-Item UI', () => {
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


        let placementId;
        let lineItemId;
        let lineItemName = generateName('Line-Item');
        let impressionGoal = generateRandomNum(90000);
        let startDate = Cypress.moment().add(1, 'days').format('MM/DD/YYYY');
        let endDate = Cypress.moment().add(1, 'months').format('MM/DD/YYYY');


        // create CRUD test
        it('Retrieve an Campaign to select as Parent', () => {
            const lastCreatedPlacement = Cypress.moment().format('YY.');
            
            const getRequest = (options = {}) => {
                const defaultOptions = {
                    auth: {
                        bearer: apiToken
                    },
                };
                return Cypress._.extend(defaultOptions, options); // _ using lodash built-in library
            };

            const placementRequestOptions = getRequest({
                url: `/api/v1/placements?sort_order=desc&sort_by=id&page=0&limit=10&search=z${lastCreatedPlacement}`,
            });

            cy.request(placementRequestOptions).then((resp) => {
                const placementRow = resp.body.rows;
                if( placementRow.length == 0 ) {
                    throw new Error("No Campaign Id returned"); // Temp solution
                } else {
                    placementId = placementRow[0].id;
                    cy.log('Placement ID found:' + placementId);
                }
            });
        });

        it('Create a Line-Item', () => {
            cy.visit(`/placements/${placementId}`);
            cy.get('[mattooltip="Create new Line Item"]').click(); // clicking on create Line-item button
            cy.get('[placeholder="Enter Name"]').first().click().type(lineItemName); // clicking on the field for Line-item name
            cy.get('[placeholder="Enter Name"]').last().click().type(impressionGoal); // clicking on the field for Impression Goal
            cy.get('[placeholder="Choose a Start Date"]').clear().type(startDate);
            cy.get('[placeholder="Choose a End Date"]').clear().type(endDate);
            cy.get('[mattooltip="Save changes"]').click();
            cy.url().should('include', '/line-items/'); 
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                lineItemId = urlPathName.split('/').pop(); // Grabbing Line-Item ID from URL
            });
        });
        
        it('Verify elements of Previously Created Line-Item', () => {
            cy.server();
            cy.route(`/api/v1/line-items?sort_order=asc&sort_by=name&page=0&limit=5&placementId=${placementId}&search=${lineItemName}`)
                .as('searchAPI');
            cy.visit(`/placements/${placementId}`);
            cy.get('[placeholder="Search"]', { timeout: 2000 }).first().type(lineItemName).wait('@searchAPI'); // adding wait for api return results
            
            // Verifying list of results on Campaign detail page
            cy.log('Verifies Line-Item Name');
            cy.get('[mattooltip="View line item"]').should('contain', lineItemName);  // verifies Name of Line-Item
            cy.log('Verifies Status');
            cy.get('mat-cell.cdk-column-status').should('contain', 'DRAFT');  // When line-items are first created, it should be have DRAFT status
            cy.log('Verifies Start Date');
            cy.get('mat-cell.cdk-column-startFlightDate').should('contain', startDate.slice(1, -2));  // verifies Start Date of Line-Item
            cy.log('Verifies End Date');
            cy.get('mat-cell.cdk-column-endFlightDate').should('contain', endDate.slice(1, -2));  // verifies End Date of Line-Item
            cy.log('Verifies the Format');  // Below will have to change to toggle in future
            cy.get('mat-cell.cdk-column-format').should('contain', 'Banner');  // verifies Rate Unit Type of Line-Item
            
            //  Verifying Line-Item Detail Page
            cy.get('[mattooltip="View line item"]').click();  // Clicks on Line-Item from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', lineItemName);  // verifies Title 
            cy.log('Verifies Status on Line-Item Detail page');
            cy.get('div > div:nth-child(1) > ul > li:nth-child(1)').first().should('contain', 'DRAFT');  // verifies Status on Line-Item Detail page 
            cy.log('Verifies Start Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(1)').first().should('contain', Cypress.moment(startDate).format('ll'));  // verifies Start Date on Line-Item Detail page 
            cy.log('Verifies End Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(2)').first().should('contain', Cypress.moment(endDate).format('ll'));  // verifies End Date on Line-Item Detail page 
            cy.log('Verifies Format on Line-Item Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(2)').last().should('contain', 'Banner');  // verifies Format on Line-Item Detail page 
        });
        
        it('Edit Line-Item', () => {
            lineItemName += '-update'
            impressionGoal += 7000
            startDate = Cypress.moment(startDate).add(1, 'days').format('MM/DD/YYYY');
            endDate = Cypress.moment(endDate).add(14, 'days').format('MM/DD/YYYY');

            cy.visit(`/line-items/${lineItemId}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Line-Item button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Line-Item option
            cy.get('[placeholder="Enter Name"]').first().clear({ force: true }).type(lineItemName);  // click on the field for Line-item name
            cy.get('[placeholder="Enter Name"]').last().clear({ force: true }).type(impressionGoal);  // clicking on the field for Line-item Impression Goal
            cy.get('[placeholder="Choose a Start Date"]').clear({ force: true }).type(startDate);
            cy.get('[placeholder="Choose a End Date"]').clear({ force: true }).type(endDate);
            cy.get('[mattooltip="Save changes"]').click();
            cy.url().should('include', '/line-items/');  
        });

        it('Verify elements of Previously Edited Line-items on its Detail Page', () => {
            cy.visit(`/line-items/${lineItemId}`);
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', lineItemName);  // verifies Title 
            cy.log('Verifies Status on Line-Item Detail page');
            cy.get('div > div:nth-child(1) > ul > li:nth-child(1)').first().should('contain', 'DRAFT');  // verifies Status on Line-Item Detail page 
            cy.log('Verifies Start Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(1)').first().should('contain', Cypress.moment(startDate).format('ll'));  // verifies Start Date on Line-Item Detail page 
            cy.log('Verifies End Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(2)').first().should('contain', Cypress.moment(endDate).format('ll'));  // verifies End Date on Line-Item Detail page 
            cy.log('Verifies Format on Line-Item Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(2)').last().should('contain', 'Banner');  // verifies Format on Line-Item Detail page 
        });
    });
});
