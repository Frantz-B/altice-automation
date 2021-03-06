const { retrieveUserToken } = require('../../helpers/session-token-grabber');
const { requestOptions } = require('../../helpers/request-helper');
const { generateName } = require('../../helpers/name-helper');

context('Campaign', () => {
    describe('Campaign UI', () => {
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

        let advertiserId;
        let campaignID;
        let campaignName = generateName('Campaign');
        let trafficker = 'Automation Support';
        let contractDate = Cypress.moment().format('l'); // Yields Date format MM/DD/YYYY
        let ioNumber = generateName('io-Campaign');
        let externalId = generateName('x-ID');

        // create CRUD test
        it('Retrieve an Advertiser to select as Parent', () => {
            const lastCreatedAdvertiser = Cypress.moment().format('YY.');

            const advertiserRequestOptions = requestOptions(apiToken, {
                url: `/api/v1/advertisers?sort_order=desc&sort_by=id&page=0&limit=10&search=${lastCreatedAdvertiser}`,
            });

            cy.request(advertiserRequestOptions).then((resp) => {
                const advertiserRow = resp.body.rows;
                if (advertiserRow.length === 0) {
                    throw new Error('No Advertiser Id returned'); // Temp solution
                } else {
                    advertiserId = advertiserRow[0].id;
                    cy.log(`Advertiser ID found:  ${advertiserId}`);
                }
            });
        });

        it('Create a Campaign', () => {
            cy.server();
            cy.route('POST', '/api/v1/campaigns').as('campaignCreation');

            cy.visit(`/advertisers/${advertiserId}`);
            cy.get('[mattooltip="Create new Campaign"]', { timeout: 8000 }).click(); // clicking on create campaign button
            cy.get('[placeholder="Enter Name"]').click().type(campaignName, { force: true }); // Force true needed to ensure full string is typed
            cy.get('[placeholder="Enter Trafficker Name"]').type(trafficker);
            cy.get('[placeholder="Choose a Contract Date"]').type(contractDate);
            cy.get('[placeholder="Enter IO Number"]').type(ioNumber);
            cy.get('[placeholder="Enter External ID"]').type(externalId);
            cy.get('[mattooltip="Save changes"]').click().wait('@campaignCreation');
            cy.url().should('include', '/campaigns/');
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                campaignID = urlPathName.split('/').pop(); // Grabbing Deal ID from URL
            });
        });

        it('Verify elements of Previously Created Campaign', () => {
            cy.server();
            cy.route(`/api/v1/campaigns?sort_order=desc&sort_by=id&page=0&limit=*&advertiserId=*&search=${campaignName}`)
                .as('searchAPI');

            cy.visit(`/advertisers/${advertiserId}`);
            cy.get('[placeholder="Search"]', { timeout: 8000 }).type(campaignName).wait('@searchAPI'); // adding wait for api return results

            // Verifying list of results on Advertiser detail page
            cy.log('Verifies Campaign Name');
            cy.get('[mattooltip="View campaign"]', { timeout: 8000 }).should('contain', campaignName); // verifies Name of Campaign
            cy.log('Verifies Traffiker');
            cy.get('.mat-cell.cdk-column-traffickerName').should('contain', trafficker); // verifies Traffiker of Campaign
            cy.log('Verifies Contract Date');
            contractDate = Cypress.moment(contractDate).format('ll'); //  Yields format MMM DD, YYYY
            cy.get('mat-cell.mat-cell.cdk-column-contractDate').should('contain', contractDate); // verifies Contract Date of Campaign

            //  Verifying Campaign Detail Page
            cy.get('[mattooltip="View campaign"]').click(); // Clicks on Campaign from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', campaignName); // verifies Title
            cy.log('Verifies External ID on Campaign Detail page');
            cy.get(' div:nth-child(2) > ul > li:nth-child(2)').should('contain', externalId); // verifies External ID on Campaign Detail page
            cy.log('Verifies Traffikcer Name on Campaign Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(1)').should('contain', trafficker); // verifies Traffikcer Name on Campaign Detail page
            cy.log('Verifies IO Number on Campaign Detail page');
            cy.get('div:nth-child(2) > ul > li:nth-child(1)').should('contain', ioNumber); // verifies IO Number on Campaign Detail page
            cy.log('Verifies Contract Date on Campaign Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(2)').should('contain', contractDate); // verifies Contract Date on Campaign Detail page
            cy.log('Verifies campaign detail page icons are displayed');
            cy.log('Verifies External ID icon is displayed');
            cy.get(' div:nth-child(2) > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'fingerprint-24px.svg'); // verifies External ID icon is displayed
            cy.log('Verifies Trafficker Name icon is displayed');
            cy.get('div:nth-child(1) > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'person-24px.svg'); // verifies Trafficker Name icon is displayed
            cy.log('Verifies IO Number icon is displayed');
            cy.get('div:nth-child(2) > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'login-24px.svg'); // verifies IO Number icon is displayed
            cy.log('Verifies Contract Date icon is displayed');
            cy.get('div:nth-child(1) > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'today-24px.svg'); // verifies Contract Date icon is displayed
            // cy.log('Verifies Impressions icon is displayed');
            // cy.get('h6 > i > img').should('have.attr', 'src').should('include', 'visibility_dark-24px.svg'); // verifies Impressions icon is displayed
            // cy.log('Verifies Goal icon is displayed');
            // cy.get('span > i > img').should('have.attr', 'src').should('include', 'emoji_events-24px.svg'); // verifies Goal icon is displayed
        });

        it('Edit Campaign', () => {
            campaignName += '-update';
            trafficker += 'Max';
            ioNumber += '-Up';
            externalId += '-Campaign';
            contractDate = Cypress.moment().subtract(1, 'days').format('l');

            cy.visit(`/campaigns/${campaignID}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]', { timeout: 8000 }).click(); // clicking on Edit Campaign button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit campaign option
            cy.get('[placeholder="Enter Name"]').clear({ force: true }).type(campaignName);
            cy.get('[placeholder="Enter Trafficker Name"]').clear({ force: true }).type(trafficker);
            cy.get('[placeholder="Choose a Contract Date"]').clear({ force: true }).type(contractDate);
            cy.get('[placeholder="Enter IO Number"]').clear({ force: true }).type(ioNumber);
            cy.get('[placeholder="Enter External ID"]').clear({ force: true }).type(externalId);
            cy.get('[mattooltip="Save changes"]').click();
            cy.url().should('include', '/campaigns/');
        });

        it('Verify elements of Previously Edited Campaign on its Detail Page', () => {
            cy.server();
            cy.route(`/api/v1/campaigns?sort_order=desc&sort_by=id&page=0&limit=*&advertiserId=*&search=${campaignName}`)
                .as('searchAPI');

            cy.visit(`/advertisers/${advertiserId}`);
            cy.get('[placeholder="Search"]', { timeout: 8000 }).type(campaignName).wait('@searchAPI'); // adding wait for api return results

            // Verifying list of results on Advertiser detail page
            cy.log('Verifies Campaign Name');
            cy.get('[mattooltip="View campaign"]', { timeout: 8000 }).should('contain', campaignName); // verifies Name of Campaign
            cy.log('Verifies Traffiker');
            cy.get('.mat-cell.cdk-column-traffickerName').should('contain', trafficker); // verifies Traffiker of Campaign
            cy.log('Verifies Contract Date');
            contractDate = Cypress.moment(contractDate).format('ll'); //  Yields format MMM DD, YYYY
            cy.get('mat-cell.mat-cell.cdk-column-contractDate').should('contain', contractDate); // verifies Contract Date of Campaign

            //  Verifying Campaign Detail Page
            cy.get('[mattooltip="View campaign"]').click(); // Clicks on Campaign from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', campaignName); // verifies Title
            cy.log('Verifies External ID on Campaign Detail page');
            cy.get(' div:nth-child(2) > ul > li:nth-child(2)').should('contain', externalId); // verifies External ID on Campaign Detail page
            cy.log('Verifies Traffikcer Name on Campaign Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(1)').should('contain', trafficker); // verifies Traffikcer Name on Campaign Detail page
            cy.log('Verifies IO Number on Campaign Detail page');
            cy.get('div:nth-child(2) > ul > li:nth-child(1)').should('contain', ioNumber); // verifies IO Number on Campaign Detail page
            cy.log('Verifies Contract Date on Campaign Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(2)').should('contain', contractDate); // verifies Contract Date on Campaign Detail page
            cy.log('Verifies campaign detail page icons are displayed');
            cy.log('Verifies External ID icon is displayed');
            cy.get(' div:nth-child(2) > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'fingerprint-24px.svg'); // verifies External ID icon is displayed
            cy.log('Verifies Trafficker Name icon is displayed');
            cy.get('div:nth-child(1) > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'person-24px.svg'); // verifies Trafficker Name icon is displayed
            cy.log('Verifies IO Number icon is displayed');
            cy.get('div:nth-child(2) > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'login-24px.svg'); // verifies IO Number icon is displayed
            cy.log('Verifies Contract Date icon is displayed');
            cy.get('div:nth-child(1) > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'today-24px.svg'); // verifies Contract Date icon is displayed
            // cy.log('Verifies Impressions icon is displayed');
            // cy.get('h6 > i > img').should('have.attr', 'src').should('include', 'visibility_dark-24px.svg'); // verifies Impressions icon is displayed
            // cy.log('Verifies Goal icon is displayed');
            // cy.get('span > i > img').should('have.attr', 'src').should('include', 'emoji_events-24px.svg'); // verifies Goal icon is displayed
        });
    });
});
