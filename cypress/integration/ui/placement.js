const { retrieveUserToken } = require('../../helpers/session-token-grabber');
const { generateName, generateRandomNum } = require('../../helpers/name-helper');

context('Placement', () => {
    describe('Placement UI', () => {
        let userTokenResponse;
        let apiToken;

        before(() => {
            userTokenResponse = retrieveUserToken(); // logs in and returns token
        });
        beforeEach(async () => {
            const userToken = await userTokenResponse; // needed for userToken to be retained
            apiToken = userToken;
            localStorage.setItem('user_token', userToken); // needed for UI tests
        });

        const placement = {};

        // create CRUD test
        it('Retrieve an Campaign to select as Parent', () => {
            const lastCreatedCampaign = Cypress.moment().format('YY.');

            const getRequest = (options = {}) => {
                const defaultOptions = {
                    auth: {
                        bearer: apiToken,
                    },
                };
                return Cypress._.extend(defaultOptions, options); // _ using lodash built-in library
            };

            const campaignRequestOptions = getRequest({
                url: `/api/v1/campaigns?sort_order=desc&sort_by=id&page=0&limit=10&search=${lastCreatedCampaign}`,
            });

            cy.request(campaignRequestOptions).then((resp) => {
                const campaignRow = resp.body.rows;
                if (campaignRow.length === 0) {
                    throw new Error('No Campaign Id returned'); // Temp solution
                } else {
                    placement.campaignId = campaignRow[0].id;
                    cy.log(`Campaign ID found:  ${placement.campaignId}`);
                }
            });
        });

        it('Create a Placement', () => {
            placement.name = generateName('Placement');
            placement.rate = generateRandomNum(100);
            placement.impressionGoal = generateRandomNum(900000);
            placement.targetSpend = (placement.impressionGoal * placement.rate) / 1000;

            cy.visit(`/campaigns/${placement.campaignId}`);
            cy.get('[mattooltip="Create new Placement"]', { timeout: 8000 }).click(); // clicking on create campaign button
            cy.get('[placeholder="Enter Name"]').click().type(placement.name, { force: true }); // Force true needed to ensure string is fully typed
            cy.get('[placeholder="Enter Rate"]').type(placement.rate);
            cy.get('[placeholder="Deal Type"]').click(); // selecting Rate Unit
            cy.get('[value="CPM"]').click(); // selecting CPM for the rate type
            cy.get('[placeholder="Enter Impression Goal"]').type(placement.impressionGoal);
            cy.get('[mattooltip="Save changes"]').click();
            cy.url().should('include', '/placements/');
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                placement.id = urlPathName.split('/').pop(); // Grabbing Placement ID from URL
            });
        });

        it('Verify elements of Previously Created Placement', () => {
            cy.server();
            cy.route(`api/v1/placements?sort_order=desc&sort_by=id&page=0&limit=*&campaignId=${placement.campaignId}&search=${placement.name}`)
                .as('searchAPI');

            cy.visit(`/campaigns/${placement.campaignId}`);
            cy.get('[placeholder="Search"]', { timeout: 8000 }).type(placement.name).wait('@searchAPI'); // adding wait for api return results

            // Verifying list of results on Campaign detail page
            cy.log('Verifies Placement Name');
            cy.get('[mattooltip="View placement"]', { timeout: 8000 }).should('contain', placement.name); // verifies Name of Placement
            cy.log('Verifies Rate');
            cy.get('mat-cell.cdk-column-rate').should('contain', `${placement.rate}.00`); // verifies Rate of Placement
            cy.log('Verifies Rate Unit Type');
            cy.get('mat-cell.cdk-column-rateUnit').should('contain', 'CPM'); // verifies Rate Unit Type of Placement
            cy.log('Verifies Impression Goal');
            cy.get('.mat-cell.cdk-column-impressionGoal').should('contain', Intl.NumberFormat().format(placement.impressionGoal)); // verifies Impression Goal of Placement
            cy.log('Verifies Total Spent');
            cy.get('.mat-cell.mat-cell.cdk-column-totalSpent.mat-column-totalSpent').should('contain', '$0.00'); // verifies total spent of Placement

            //  Verifying Placement Detail Page
            cy.get('[mattooltip="View placement"]').click(); // Clicks on Placement from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', placement.name); // verifies Title
            cy.log('Verifies Rate on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').first().should('contain', `${placement.rate}.00`); // verifies Rate on Placement Detail page
            cy.log('Verifies Rate Unit Type on Placement Detail page');
            cy.get('div.col-sm-5.col-lg-6.margin-bottom-10-mobile > ul > li').first().should('contain', 'CPM'); // verifies Rate Unit Type on Placement Detail page
            cy.log('Verifies Impression Goal on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').first().should('contain', Intl.NumberFormat().format(placement.impressionGoal)); // verifies Impression Goal on Placement Detail page
            cy.log('Verifies Target Spend on Placement Detail page');
            cy.get('div.col-sm-5 > ul > li:nth-child(2)').last().should('contain', Intl.NumberFormat().format(placement.targetSpend.toFixed(2))); // verifies Target Spend on Placement Detail page
            cy.log('Verifies time zone on Placement Detail page');
            cy.get('.col-sm-5.col-lg-6 > ul > li:nth-child(3)').first().should('contain', 'America/New_York'); // verifies time zone default value is America/New_York
            cy.log('Verifies Total Spent on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(4)').first().should('contain', '$0.00'); // verifies total spent = 0.00

            //  Verifying Placement detail page icons
            cy.log('Verifies Rate icon is displayed');
            cy.get('li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'monetization_on-24px.svg'); // verifies Rate icon is displayed
            cy.log('Verifies Rate Unit icon is displayed');
            cy.get('.col-sm-5 > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'trending_up_dark-24px.svg'); // verifies Rate Unit icon is displayed
            cy.log('Verifies Flight Dates icon is displayed');
            cy.get('li:nth-child(3) > label > i > img').should('have.attr', 'src').should('include', 'date_range-24px.svg'); // verifies Flight Dates icon is displayed
            cy.log('Verifies Impression Goal icon is displayed');
            cy.get('li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'emoji_events-24px.svg'); // verifies Impression Goal icon is displayed
            cy.log('Verifies Impressions icon is displayed');
            cy.get('h6 > i > img').should('have.attr', 'src').should('include', 'visibility_dark-24px.svg'); // verifies Impressions icon is displayed
            cy.log('Verifies Goal icon is displayed');
            cy.get('span > i > img').should('have.attr', 'src').should('include', 'emoji_events-24px.svg'); // verifies Goal icon is displayed
            cy.log('Verifies Target Spend icon is displayed');
            cy.get('label > kt-icon > img').should('have.attr', 'src').should('include', 'target_spend-24px.svg'); // verifies target spend icon is displayed
            cy.log('Verifies Time Zone icon is displayed');
            cy.get('.col-sm-5.col-lg-6 > ul > li:nth-child(3) > label > i > img').should('have.attr', 'src').should('include', 'language-24px.svg'); // verifies time zone icon is displayed
            cy.log('Verifies Total Spent icon is displayed');
            cy.get('li:nth-child(4) > label > i > img').should('have.attr', 'src').should('include', 'money_bag-24px.svg'); // verifies Total Spent icon is displayed
        });

        it('Edit Placement', () => {
            placement.rate += 14;
            placement.name += '-update';
            placement.impressionGoal += 7000;
            placement.targetSpend = (placement.impressionGoal * placement.rate) / 1000;

            cy.visit(`/placements/${placement.id}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]', { timeout: 8000 }).click(); // clicking on Edit Placement button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Placement option
            cy.get('[placeholder="Enter Name"]').clear({ force: true }).type(placement.name);
            cy.get('[placeholder="Enter Rate"]').clear({ force: true }).type(placement.rate);
            cy.get('[placeholder="Enter Impression Goal"]').clear({ force: true }).type(placement.impressionGoal);
            cy.get('[mattooltip="Save changes"]').click();
            cy.url().should('include', '/placements/');
        });

        it('Verify elements of Previously Edited Placements on its Detail Page', () => {
            cy.visit(`/placements/${placement.id}`);
            cy.get('[class="kt-subheader__title ng-star-inserted"]', { timeout: 8000 }).should('contain', placement.name); // verifies Title
            cy.log('Verifies Rate on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').first().should('contain', `${placement.rate}.00`); // verifies Rate on Placement Detail page
            cy.log('Verifies Rate Unit Type on Placement Detail page');
            cy.get('div.col-sm-5.col-lg-6.margin-bottom-10-mobile > ul > li').first().should('contain', 'CPM'); // verifies Rate Unit Type on Placement Detail page
            cy.log('Verifies Impression Goal on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').first().should('contain', Intl.NumberFormat().format(placement.impressionGoal)); // verifies Impression Goal on Placement Detail page
            cy.log('Verifies Target Spend on Placement Detail page');
            cy.get('div.col-sm-5 > ul > li:nth-child(2)').first().should('contain', Intl.NumberFormat().format(placement.targetSpend.toFixed(2))); // verifies Target Spend on Placement Detail page
            cy.log('Verifies Time Zone on Placement Detail page');
            cy.get('.col-sm-5.col-lg-6 > ul > li:nth-child(3)').first().should('contain', 'America/New_York'); // verifies time zone default value is America/New_York
            cy.log('Verifies Total Spent on Placement Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(4)').first().should('contain', '$0.00'); // verifies total spent = 0.00

            //  Verifying Placement detail page icons
            cy.log('Verifies Rate icon is displayed');
            cy.get('li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'monetization_on-24px.svg'); // verifies Rate icon is displayed
            cy.log('Verifies Rate Unit icon is displayed');
            cy.get('.col-sm-5 > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'trending_up_dark-24px.svg'); // verifies Rate Unit icon is displayed
            cy.log('Verifies Flight Dates icon is displayed');
            cy.get('li:nth-child(3) > label > i > img').should('have.attr', 'src').should('include', 'date_range-24px.svg'); // verifies Flight Dates icon is displayed
            cy.log('Verifies Impression Goal icon is displayed');
            cy.get('li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'emoji_events-24px.svg'); // verifies Impression Goal icon is displayed
            cy.log('Verifies Impressions icon is displayed');
            cy.get('h6 > i > img').should('have.attr', 'src').should('include', 'visibility_dark-24px.svg'); // verifies Impressions icon is displayed
            cy.log('Verifies Goal icon is displayed');
            cy.get('span > i > img').should('have.attr', 'src').should('include', 'emoji_events-24px.svg'); // verifies Goal icon is displayed
            cy.log('Verifies Target Spend icon is displayed');
            cy.get('label > kt-icon > img').should('have.attr', 'src').should('include', 'target_spend-24px.svg'); // verifies target spend icon is displayed
            cy.log('Verifies Time Zone icon is displayed');
            cy.get('.col-sm-5.col-lg-6 > ul > li:nth-child(3) > label > i > img').should('have.attr', 'src').should('include', 'language-24px.svg'); // verifies time zone icon is displayed
            cy.log('Verifies Total Spent icon is displayed');
            cy.get('li:nth-child(4) > label > i > img').should('have.attr', 'src').should('include', 'money_bag-24px.svg'); // verifies Total Spent icon is displayed
        });
    });
});