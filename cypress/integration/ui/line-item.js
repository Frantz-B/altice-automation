const { requestOptions } = require('../../helpers/request-helper');
const { retrieveUserToken } = require('../../helpers/session-token-grabber');
const { generateName, generateRandomNum } = require('../../helpers/name-helper');

context('Line-Item', () => {
    describe('Line-Item UI', () => {
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

        const lineItem = {};

        // create CRUD test
        it('Retrieve an Campaign to select as Parent', () => {
            const lastCreatedCampaign = Cypress.moment().format('YY.');

            const campaignRequestOptions = requestOptions(apiToken, {
                url: `/api/v1/campaigns?sort_order=desc&sort_by=id&page=0&limit=10&search=${lastCreatedCampaign}`,
            });

            cy.request(campaignRequestOptions).then((resp) => {
                const campaignRow = resp.body.rows;
                if (campaignRow.length === 0) {
                    throw new Error('No Campaign Id returned'); // Temp solution
                } else {
                    lineItem.campaignId = campaignRow[0].id;
                    cy.log(`Campaign ID found:  ${lineItem.campaignId}`);
                }
            });
        });

        it('Create a Banner Line-Item', () => {
            cy.server();
            cy.route(`/api/v1/campaigns/${lineItem.campaignId}`).as('campaignPageLoad');
            cy.route('POST', '/api/v1/line-items').as('lineItemCreation');

            lineItem.status = 'DRAFT';
            lineItem.creativeSize = '728x90';
            lineItem.name = generateName('Line-Item');
            lineItem.campaignStatus = 'Creative Missing';
            lineItem.impressionGoal = generateRandomNum(90000);
            lineItem.rate = generateRandomNum(100);
            lineItem.startDate = Cypress.moment().add(1, 'days').format('MM/DD/YYYY');
            lineItem.endDate = Cypress.moment().add(1, 'months').format('MM/DD/YYYY');
            lineItem.targetSpend = (lineItem.impressionGoal * lineItem.rate) / 1000;

            cy.visit(`/campaigns/${lineItem.campaignId}`).wait('@campaignPageLoad');
            cy.get('[mattooltip="Create new Line Item"]', { timeout: 8000 }).click(); // clicking on create Line-item button
            cy.get('[placeholder="Enter Name"]').first().click().type(lineItem.name, { force: true }); // Force true needed to ensure full string is typed
            cy.get('[placeholder="Enter Name"]').last().click().type(lineItem.impressionGoal); // clicking on the field for Impression Goal
            cy.get('[placeholder="Enter Rate"]').last().click().type(lineItem.rate); // clicking on the field for Rate
            cy.get('[placeholder="Deal Type"]').click(); // selecting Rate Unit
            cy.get('[value="CPM"]').click(); // selecting CPM for the rate type
            cy.get('[placeholder="Choose a Start Date"]').clear().type(lineItem.startDate);
            cy.get('[placeholder="Choose a End Date"]').clear().type(lineItem.endDate);
            cy.get('[placeholder="Creative Size"]').click();
            cy.contains(lineItem.creativeSize).click();

            cy.get('[placeholder="Pick a Format"]').click();
            cy.get('mat-option:nth-child(1)').click(); // Selects 1st option: 'Banner', for Format type
            // Below grabs the value of the selected Format option
            cy.get('div.mat-select-value').eq(3).invoke('text').then((selectedFormatOption) => {
                lineItem.format = selectedFormatOption;
            });
            cy.get('[placeholder="Creative Rotation"]').click();
            cy.get('mat-option:nth-child(1)').click(); // Selects 1st option: 'Even', for Creative Rotation type
            // Below grabs the value of the selected Creative Rotation option
            cy.get('div.mat-select-value').last().invoke('text').then((selectedCreativeRotationOption) => {
                lineItem.creativeRotation = selectedCreativeRotationOption;
            });
            cy.get('[mattooltip="Save changes"]').click().wait('@lineItemCreation');
            cy.url().should('include', '/line-items/');
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                lineItem.id = urlPathName.split('/').pop(); // Grabbing Line-Item ID from URL
            });
        });

        it('Verify elements of Previously Created Banner Line-Item', () => {
            cy.server();
            cy.route(`api/v1/line-items?sort_order=desc&sort_by=id&page=0&limit=*&campaignId=${lineItem.campaignId}&search=${lineItem.name}`)
                .as('searchAPI');

            cy.visit(`/campaigns/${lineItem.campaignId}`);
            cy.get('[placeholder="Search"]', { timeout: 8000 }).first().type(lineItem.name).wait('@searchAPI'); // adding wait for api return results

            // Verifying list of results on Campaign Detail page
            cy.log('Verifies Line-Item Name');
            cy.get('[mattooltip="View line item"]', { timeout: 8000 }).should('contain', lineItem.name); // verifies Name of Line-Item
            cy.log('Verifies Status');
            cy.get('mat-cell.cdk-column-status').should('contain', lineItem.campaignStatus); // When line-items are first created, it should be have 'Creative Missing' status
            cy.log('Verifies Start Date');
            cy.get('mat-cell.cdk-column-startFlightDate').should('contain', lineItem.startDate.slice(1, +2)); // verifies Start Date of Line-Item
            cy.log('Verifies End Date');
            cy.get('mat-cell.cdk-column-endFlightDate').should('contain', lineItem.endDate.slice(1, +2)); // verifies End Date of Line-Item
            cy.log('Verifies the Format');
            cy.get('mat-row:nth-child(2) > .cdk-column-format').should('contain', lineItem.format); // verifies Format Type of Line-Item
            cy.log('Verifies the Impression Goal');
            cy.get('[class="impressions-row"]').should('contain', Intl.NumberFormat().format(lineItem.impressionGoal)); // verifies Impression Goal of Line-Item
            cy.log('Verifies the Target Spend');
            cy.get('mat-cell.cdk-column-targetSpend').should('contain', Intl.NumberFormat().format(lineItem.targetSpend.toFixed(2))); // verifies Target Spend of Line-Item
            cy.log('Verifies the Total Spent');
            cy.get('mat-cell.mat-cell.cdk-column-totalSpend.mat-column-totalSpend').should('contain', '$0.00'); // verifies total spent of line item

            //  Verifying Line-Item Detail Page
            cy.get('[mattooltip="View line item"]').click(); // Clicks on Line-Item from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', lineItem.name); // verifies Title
            cy.log('Verifies Status on Line-Item Detail page');
            cy.get('div > div:nth-child(1) > ul > li:nth-child(1)').first().should('contain', lineItem.status); // verifies Status on Line-Item Detail page
            cy.log('Verifies Start Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(1)').first().should('contain', Cypress.moment(lineItem.startDate).format('D/M/YY')); // verifies Start Date on Line-Item Detail page
            cy.log('Verifies End Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(2)').first().should('contain', Cypress.moment(lineItem.endDate).format('D/M/YY')); // verifies End Date on Line-Item Detail page
            cy.log('Verifies Format on Line-Item Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(2)').last().should('contain', lineItem.format); // verifies Format on Line-Item Detail page
            cy.log('Verifies Target Spend on Line-Item Detail page');
            cy.get('div:nth-child(2) > ul > li:nth-child(4)').last().should('contain', Intl.NumberFormat().format(lineItem.targetSpend.toFixed(2))); // verifies Target Spend on Line-Item Detail page
            cy.log('Verifies Creative Rotation Type on Line-Item Detail page');
            cy.get('div:nth-child(2) > ul > li:nth-child(3)').should('contain', lineItem.creativeRotation); // verifies Creative Rotation Type on Line-Item Detail page

            // Verifying icons in line item detail page
            cy.log('Verifies Status icon is displayed');
            cy.get('li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'linear_scale-24px.svg'); // verifies status icon is displayed
            cy.log('Verifies Format icon is displayed');
            cy.get('li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'ad_units-24px.svg'); // verifies Format icon is displayed
            cy.log('Verifies Size icon is displayed');
            cy.get('div:nth-child(1) > ul > li:nth-child(3) > label > kt-icon > img').should('have.attr', 'src').should('include', 'aspect_ratio-24px.svg'); // verifies Size icon is displayed
            cy.log('Verifies Creative Rotation icon is displayed');
            cy.get('li:nth-child(3) > label > i > img').should('have.attr', 'src').should('include', 'track_changes-24px.svg'); // verifies Creative Rotation icon is displayed
            cy.log('Verifies Start Date icon is displayed');
            cy.get('div:nth-child(2) > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'today-24px.svg'); // verifies Start Date icon is displayed
            cy.log('Verifies End Date icon is displayed');
            cy.get('div:nth-child(2) > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'event-24px.svg'); // verifies End Date icon is displayed
            cy.log('Verifies Impressions icon is displayed');
            cy.get('h6 > i > img').should('have.attr', 'src').should('include', 'visibility_dark-24px.svg'); // verifies Impressions icon is displayed
            cy.log('Verifies Goal icon is displayed');
            cy.get('span > i > img').should('have.attr', 'src').should('include', 'emoji_events-24px.svg'); // verifies Goal icon is displayed
            cy.log('Verifies Target Spend icon is displayed');
            cy.get('li:nth-child(4) > label > kt-icon > img').should('have.attr', 'src').should('include', 'target_spend-24px.svg'); // verifies target spend icon is displayed
            cy.log('Verifies Total Spent icon is displayed');
            cy.get('li:nth-child(5) > label > kt-icon > img').should('have.attr', 'src').should('include', 'money_bag-24px.svg'); // verifies Total Spent icon is displayed
        });

        it('Edit Banner Line-Item', () => {
            lineItem.name += '-update';
            lineItem.impressionGoal += 7000;
            lineItem.targetSpend = (lineItem.impressionGoal * lineItem.rate) / 1000;
            lineItem.endDate = Cypress.moment(lineItem.endDate).add(14, 'days').format('MM/DD/YYYY');
            lineItem.startDate = Cypress.moment(lineItem.startDate).add(1, 'days').format('MM/DD/YYYY');

            cy.visit(`/line-items/${lineItem.id}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]', { timeout: 8000 }).click(); // clicking on Edit Line-Item button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Line-Item option
            cy.get('[placeholder="Enter Name"]').first().clear({ force: true }).type(lineItem.name); // click on the field for Line-item name
            cy.get('[placeholder="Enter Name"]').last().clear({ force: true }).type(lineItem.impressionGoal); // clicking on the field for Line-item Impression Goal
            cy.get('[placeholder="Choose a Start Date"]').clear({ force: true }).type(lineItem.startDate);
            cy.get('[placeholder="Choose a End Date"]').clear({ force: true }).type(lineItem.endDate);
            cy.get('[placeholder="Pick a Format"]').invoke('attr', 'aria-disabled').should('equal', 'true'); // Verifying Format field is disabled
            cy.get('[placeholder="Pick a Format"]').should('contain', lineItem.format); // Verifying Format is the same as previous tests
            cy.get('[placeholder="Creative Size"]').invoke('attr', 'aria-disabled').should('equal', 'true'); // Verifying Creative size field is disabled
            cy.get('[placeholder="Creative Size"]').should('contain', lineItem.creativeSize); // Verifying Creative size is the same as previous tests
            cy.get('[placeholder="Creative Rotation"]').click();
            cy.get('mat-option:nth-child(2)').click(); // Selects 1st option: 'Weighted', for Creative Rotation type
            // Below grabs the value of the selected Creative Rotation option
            cy.get('div.mat-select-value > span').last().invoke('text').then((selectedCreativeRotationOption) => {
                lineItem.creativeRotation = selectedCreativeRotationOption;
            });
            cy.get('[mattooltip="Save changes"]').click();
            cy.url().should('include', '/line-items/');
        });

        it('Verify elements of Previously Edited Line-item', () => {
            cy.server();
            cy.route(`api/v1/line-items?sort_order=desc&sort_by=id&page=0&limit=*&campaignId=${lineItem.campaignId}&search=${lineItem.name}`)
                .as('searchAPI');

            cy.visit(`/campaigns/${lineItem.campaignId}`);
            cy.get('[placeholder="Search"]', { timeout: 8000 }).first().type(lineItem.name).wait('@searchAPI'); // adding wait for api return results

            // Verifying list of results on Campaign Detail page
            cy.log('Verifies Line-Item Name');
            cy.get('[mattooltip="View line item"]', { timeout: 8000 }).should('contain', lineItem.name); // verifies Name of Line-Item
            cy.log('Verifies Status');
            cy.get('mat-cell.cdk-column-status').should('contain', lineItem.campaignStatus); // When line-items are first created, it should be have 'Creative Missing' status
            cy.log('Verifies Start Date');
            cy.get('mat-cell.cdk-column-startFlightDate').should('contain', lineItem.startDate.slice(1, +2)); // verifies Start Date of Line-Item
            cy.log('Verifies End Date');
            cy.get('mat-cell.cdk-column-endFlightDate').should('contain', lineItem.endDate.slice(1, +2)); // verifies End Date of Line-Item
            cy.log('Verifies the Format');
            cy.get('mat-row:nth-child(2) > .cdk-column-format').should('contain', lineItem.format); // verifies Format Type of Line-Item
            cy.log('Verifies the Impression Goal');
            cy.get('[class="impressions-row"]').should('contain', Intl.NumberFormat().format(lineItem.impressionGoal)); // verifies Impression Goal of Line-Item
            cy.log('Verifies the Target Spend');
            cy.get('mat-cell.cdk-column-targetSpend').should('contain', Intl.NumberFormat().format(lineItem.targetSpend.toFixed(2))); // verifies Target Spend of Line-Item
            cy.log('Verifies the Total Spent');
            cy.get('mat-cell.mat-cell.cdk-column-totalSpend.mat-column-totalSpend').should('contain', '$0.00'); // verifies total spent of line item

            //  Verifying Line-Item Detail Page
            cy.get('[mattooltip="View line item"]').click(); // Clicks on Line-Item from Advertiser page
            cy.get('[class="kt-subheader__title ng-star-inserted"]').should('contain', lineItem.name); // verifies Title
            cy.log('Verifies Status on Line-Item Detail page');
            cy.get('div > div:nth-child(1) > ul > li:nth-child(1)').first().should('contain', lineItem.status); // verifies Status on Line-Item Detail page
            cy.log('Verifies Start Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(1)').first().should('contain', Cypress.moment(lineItem.startDate).format('D/M/YY')); // verifies Start Date on Line-Item Detail page
            cy.log('Verifies End Date on Line-Item Detail page');
            cy.get(' div > div:nth-child(2) > ul > li:nth-child(2)').first().should('contain', Cypress.moment(lineItem.endDate).format('D/M/YY')); // verifies End Date on Line-Item Detail page
            cy.log('Verifies Format on Line-Item Detail page');
            cy.get('div:nth-child(1) > ul > li:nth-child(2)').last().should('contain', lineItem.format); // verifies Format on Line-Item Detail page
            cy.log('Verifies Target Spend on Line-Item Detail page');
            cy.get('div:nth-child(2) > ul > li:nth-child(4)').last().should('contain', Intl.NumberFormat().format(lineItem.targetSpend.toFixed(2))); // verifies Target Spend on Line-Item Detail page
            cy.log('Verifies Creative Rotation Type on Line-Item Detail page');
            cy.get('div:nth-child(2) > ul > li:nth-child(3)').should('contain', lineItem.creativeRotation); // verifies Creative Rotation Type on Line-Item Detail page

            // Verifying icons in line item detail page
            cy.log('Verifies Status icon is displayed');
            cy.get('li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'linear_scale-24px.svg'); // verifies status icon is displayed
            cy.log('Verifies Format icon is displayed');
            cy.get('li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'ad_units-24px.svg'); // verifies Format icon is displayed
            cy.log('Verifies Size icon is displayed');
            cy.get('div:nth-child(1) > ul > li:nth-child(3) > label > kt-icon > img').should('have.attr', 'src').should('include', 'aspect_ratio-24px.svg'); // verifies Size icon is displayed
            cy.log('Verifies Creative Rotation icon is displayed');
            cy.get('li:nth-child(3) > label > i > img').should('have.attr', 'src').should('include', 'track_changes-24px.svg'); // verifies Creative Rotation icon is displayed
            cy.log('Verifies Start Date icon is displayed');
            cy.get('div:nth-child(2) > ul > li:nth-child(1) > label > i > img').should('have.attr', 'src').should('include', 'today-24px.svg'); // verifies Start Date icon is displayed
            cy.log('Verifies End Date icon is displayed');
            cy.get('div:nth-child(2) > ul > li:nth-child(2) > label > i > img').should('have.attr', 'src').should('include', 'event-24px.svg'); // verifies End Date icon is displayed
            cy.log('Verifies Impressions icon is displayed');
            cy.get('h6 > i > img').should('have.attr', 'src').should('include', 'visibility_dark-24px.svg'); // verifies Impressions icon is displayed
            cy.log('Verifies Goal icon is displayed');
            cy.get('span > i > img').should('have.attr', 'src').should('include', 'emoji_events-24px.svg'); // verifies Goal icon is displayed
            cy.log('Verifies Target Spend icon is displayed');
            cy.get('li:nth-child(4) > label > kt-icon > img').should('have.attr', 'src').should('include', 'target_spend-24px.svg'); // verifies target spend icon is displayed
            cy.log('Verifies Total Spent icon is displayed');
            cy.get('li:nth-child(5) > label > kt-icon > img').should('have.attr', 'src').should('include', 'money_bag-24px.svg'); // verifies Total Spent icon is displayed
        });
    });
});
