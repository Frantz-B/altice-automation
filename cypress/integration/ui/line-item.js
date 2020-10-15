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

        const lineItem = {};

        // create CRUD test
        it('Retrieve an Campaign to select as Parent', () => {
            const lastCreatedPlacement = Cypress.moment().format('YY.');
            lineItem.placement = {}
            
            const getRequest = (options = {}) => {
                const defaultOptions = {
                    auth: {
                        bearer: apiToken
                    },
                };
                return Cypress._.extend(defaultOptions, options); // _ using lodash built-in library
            };

            const placementRequestOptions = getRequest({
                url: `/api/v1/placements?sort_order=desc&sort_by=id&page=0&limit=10&search=${lastCreatedPlacement}`,
            });

            cy.request(placementRequestOptions).then((resp) => {
                const placementRow = resp.body.rows;
                if( placementRow.length == 0 ) {
                    throw new Error("No Campaign Id returned"); // Temp solution
                } else {
                    const selectedPlacement = placementRow.find(({ canArchive }) => canArchive === true);
                    if (!selectedPlacement) {
                        throw new Error("No valid Placement returned"); // Temp solution
                    } else {
                        lineItem.placement.id = selectedPlacement.id;
                        lineItem.placement.rate = selectedPlacement.rate;
                        cy.log('Placement ID found:' + lineItem.placement.id);
                    }
                }
            });
        });

        it('Create a Line-Item', () => {
            cy.server();
            cy.route(`/api/v1/placements/${lineItem.placement.id}`).as('placementPageLoad');

            lineItem.name = generateName('Line-Item');
            lineItem.impressionGoal = generateRandomNum(90000);
            lineItem.startDate = Cypress.moment().add(1, 'days').format('MM/DD/YYYY');
            lineItem.endDate = Cypress.moment().add(1, 'months').format('MM/DD/YYYY');
            lineItem.targetSpend = lineItem.impressionGoal * lineItem.placement.rate / 1000;

            cy.visit(`/placements/${lineItem.placement.id}`).wait('@placementPageLoad');
            cy.get('[mattooltip="Create new Line Item"]').click(); // clicking on create Line-item button
            cy.get('[placeholder="Enter Name"]').first().click().type(lineItem.name, { force: true }); // Force true needed to ensure full string is typed
            cy.get('[placeholder="Enter Name"]').last().click().type(lineItem.impressionGoal); // clicking on the field for Impression Goal
            cy.get('[placeholder="Choose a Start Date"]').clear().type(lineItem.startDate);
            cy.get('[placeholder="Choose a End Date"]').clear().type(lineItem.endDate);
            cy.get('[mattooltip="Save changes"]').click();
            cy.url().should('include', '/line-items/'); 
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                lineItem.id = urlPathName.split('/').pop(); // Grabbing Line-Item ID from URL
            });
        });
        
        it('Verify elements of Previously Created Line-Item', () => {
            cy.server();
            cy.route(`/api/v1/line-items?sort_order=desc&sort_by=id&page=0&limit=*&placementId=${lineItem.placement.id}&search=${lineItem.name}`)
                .as('searchAPI');
    
            cy.visit(`/placements/${lineItem.placement.id}`);
            cy.get('[placeholder="Search"]', { timeout: 8000 }).first().type(lineItem.name).wait('@searchAPI'); // adding wait for api return results
            
            // Verifying list of results on placement detail page
            cy.log('Verifies Line-Item Name');
            cy.get('[mattooltip="View line item"]', { timeout: 8000 }).should('contain', lineItem.name);  // verifies Name of Line-Item
            cy.log('Verifies Status');
            cy.get('mat-cell.cdk-column-status').should('contain', 'Creative Missing');  // When line-items are first created, it should be have Creative Missing status
            cy.log('Verifies Start Date');
            cy.get('mat-cell.cdk-column-startFlightDate').should('contain', lineItem.startDate.slice(1, +2));  // verifies Start Date of Line-Item
            cy.log('Verifies End Date');
            cy.get('mat-cell.cdk-column-endFlightDate').should('contain', lineItem.endDate.slice(1, +2));  // verifies End Date of Line-Item
            cy.log('Verifies the Format');  // Below will have to change to toggle in future
            cy.get('mat-cell.cdk-column-format').should('contain', 'Banner');  // verifies Rate Unit Type of Line-Item
            
            //  Verifying Line-Item Detail Page
            cy.get('[mattooltip="View line item"]').click();  // Clicks on Line-Item from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', lineItem.name);  // verifies Title 
            cy.log('Verifies Status on Line-Item Detail page');
            cy.get('div > div:nth-child(1) > ul > li:nth-child(1)').first().should('contain', 'DRAFT');  // verifies Status on Line-Item Detail page 
            cy.log('Verifies Start Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(1)').first().should('contain', Cypress.moment(lineItem.startDate).format('ll'));  // verifies Start Date on Line-Item Detail page 
            cy.log('Verifies End Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(2)').first().should('contain', Cypress.moment(lineItem.endDate).format('ll'));  // verifies End Date on Line-Item Detail page 
            cy.log('Verifies Format on Line-Item Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(2)').last().should('contain', 'Banner');  // verifies Format on Line-Item Detail page 
            cy.log('Verifies Target Spend on Line-Item Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(4)').last().should('contain', Intl.NumberFormat().format(lineItem.targetSpend.toFixed(2)));  // verifies Target Spend on Line-Item Detail page 

            // Verifying icons in line item detail page 
            cy.log('Verifies Status icon is displayed');
            cy.get('li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include','linear_scale-24px.svg');  // verifies status icon is displayed
            cy.log('Verifies Format icon is displayed');
            cy.get('li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include','ad_units-24px.svg');  // verifies Format icon is displayed
            cy.log('Verifies Creative Rotation icon is displayed');
            cy.get('li:nth-child(3) > label > i > img').should('have.attr', 'src').should('include','track_changes-24px.svg');  // verifies Creative Rotation icon is displayed
            cy.log('Verifies Start Date icon is displayed');
            cy.get('div:nth-child(2) > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include','today-24px.svg');  // verifies Start Date icon is displayed
            cy.log('Verifies End Date icon is displayed');
            cy.get('div:nth-child(2) > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include','event-24px.svg');  // verifies End Date icon is displayed
            cy.log('Verifies Impressions icon is displayed');
            cy.get('h6 > i > img').should('have.attr', 'src').should('include','visibility_dark-24px.svg');  // verifies Impressions icon is displayed
            cy.log('Verifies Goal icon is displayed');
            cy.get('span > i > img').should('have.attr', 'src').should('include','emoji_events-24px.svg');  // verifies Goal icon is displayed
            cy.log('Verifies Target Spend icon is displayed');
            cy.get('label > kt-icon > img').should('have.attr', 'src').should('include','target_spend-24px.svg');  // verifies target spend icon is displayed
        });
        
        it('Edit Line-Item', () => {
            lineItem.name += '-update';
            lineItem.impressionGoal += 7000;
            lineItem.targetSpend = lineItem.impressionGoal * lineItem.placement.rate / 1000;
            lineItem.endDate = Cypress.moment(lineItem.endDate).add(14, 'days').format('MM/DD/YYYY');
            lineItem.startDate = Cypress.moment(lineItem.startDate).add(1, 'days').format('MM/DD/YYYY');

            cy.visit(`/line-items/${lineItem.id}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]', { timeout: 8000 }).click(); // clicking on Edit Line-Item button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Line-Item option
            cy.get('[placeholder="Enter Name"]').first().clear({ force: true }).type(lineItem.name);  // click on the field for Line-item name
            cy.get('[placeholder="Enter Name"]').last().clear({ force: true }).type(lineItem.impressionGoal);  // clicking on the field for Line-item Impression Goal
            cy.get('[placeholder="Choose a Start Date"]').clear({ force: true }).type(lineItem.startDate);
            cy.get('[placeholder="Choose a End Date"]').clear({ force: true }).type(lineItem.endDate);
            cy.get('[mattooltip="Save changes"]').click();
            cy.url().should('include', '/line-items/');  
        });

        it('Verify elements of Previously Edited Line-items on its Detail Page', () => {
            cy.visit(`/line-items/${lineItem.id}`);
            cy.get('[class="kt-subheader__title ng-star-inserted"]', { timeout: 8000 }).should('contain', lineItem.name);  // verifies Title 
            cy.log('Verifies Status on Line-Item Detail page');
            cy.get('div > div:nth-child(1) > ul > li:nth-child(1)').first().should('contain', 'DRAFT');  // verifies Status on Line-Item Detail page 
            cy.log('Verifies Start Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(1)').first().should('contain', Cypress.moment(lineItem.startDate).format('ll'));  // verifies Start Date on Line-Item Detail page 
            cy.log('Verifies End Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(2)').first().should('contain', Cypress.moment(lineItem.endDate).format('ll'));  // verifies End Date on Line-Item Detail page 
            cy.log('Verifies Format on Line-Item Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(2)').last().should('contain', 'Banner');  // verifies Format on Line-Item Detail page 
            cy.log('Verifies Target Spend on Line-Item Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(4)').last().should('contain', Intl.NumberFormat().format(lineItem.targetSpend.toFixed(2)));  // verifies Target Spend on Line-Item Detail page 

             // Verifying icons in line item detail page 
             cy.log('Verifies Status icon is displayed');
             cy.get('li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include','linear_scale-24px.svg');  // verifies status icon is displayed
             cy.log('Verifies Format icon is displayed');
             cy.get('li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include','ad_units-24px.svg');  // verifies Format icon is displayed
             cy.log('Verifies Creative Rotation icon is displayed');
             cy.get('li:nth-child(3) > label > i > img').should('have.attr', 'src').should('include','track_changes-24px.svg');  // verifies Creative Rotation icon is displayed
             cy.log('Verifies Start Date icon is displayed');
             cy.get('div:nth-child(2) > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include','today-24px.svg');  // verifies Start Date icon is displayed
             cy.log('Verifies End Date icon is displayed');
             cy.get('div:nth-child(2) > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include','event-24px.svg');  // verifies End Date icon is displayed
             cy.log('Verifies Impressions icon is displayed');
             cy.get('h6 > i > img').should('have.attr', 'src').should('include','visibility_dark-24px.svg');  // verifies Impressions icon is displayed
             cy.log('Verifies Goal icon is displayed');
             cy.get('span > i > img').should('have.attr', 'src').should('include','emoji_events-24px.svg');  // verifies Goal icon is displayed
             cy.log('Verifies Target Spend icon is displayed');
            cy.get('label > kt-icon > img').should('have.attr', 'src').should('include','target_spend-24px.svg');  // verifies target spend icon is displayed
        });
    });
});
