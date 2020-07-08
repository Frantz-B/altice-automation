const { retrieveUserToken } = require('../../helpers/session-token-grabber');
const { generateName } = require('../../helpers/name-helper');

context('Creative', () => {
    describe('Creative UI', () => {
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
        let creativeId;
        let LineItemId;
        let LineItemFormatVideo = false;
        let creativeName = generateName('creative');
        let richMediaText = 'https://textrichmedia.com';
        let richMediaTextUpdate;

        // create CRUD test
        it('Retrieve Placement to select as Parent', () => {
            const lastCreatedPlacement = '-UI Placement';
            
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
                    throw new Error("No Placement Id returned"); // Temp solution
                } else {
                    placementId = placementRow[0].id;
                    cy.log('Placement ID found:' + placementId);
                }
            });
        });

        it('Retrieve Line Item to select as Parent', () => {
            const lastCreatedLineItem = '-UI Line-Item';
            
            const getRequest = (options = {}) => {
                const defaultOptions = {
                    auth: {
                        bearer: apiToken
                    },
                };
                return Cypress._.extend(defaultOptions, options); // _ using lodash built-in library
            };

            const LineItemRequestOptions = getRequest({
                url: `/api/v1/line-items?sort_order=desc&sort_by=id&page=0&limit=10&search=${lastCreatedLineItem}`,
            });

            cy.request(LineItemRequestOptions).then((resp) => {
                const LineItemRow = resp.body.rows;
                if( LineItemRow.length == 0 ) {
                    throw new Error("No Line Item Id returned"); // Temp solution
                } else {
                    LineItemId = LineItemRow[0].id;
                    if (LineItemRow[0].format > 'VIDEO') {
                        LineItemFormatVideo = true;
                      }
                    cy.log('Line-Item ID found:' + LineItemId);
                    cy.log('Line-Item Format found:' + LineItemFormatVideo);
                }
            });
        });

         it('Create Video Creative at Placement Lvl' , () => {
            cy.server();
            cy.route(`/api/v1/placements/${placementId}`).as('placementPageLoad').wait(1000);
            cy.visit(`/placements/${placementId}`).wait('@placementPageLoad');
            cy.get('[mattooltip="Create new Creative"]').click(); // clicking on create new creative button
            cy.get('[placeholder="Enter Name"]').first().click().type(creativeName); 
            cy.get('[placeholder="Format"]').click(); // selecting Format
            cy.get('[class="mat-option"]').click(); // selecting video for the creative format.
            cy.get('[placeholder="Creative Media Type"]').click(); // selecting Creative Media Type.
            cy.get('mat-option').eq(1).click(); // selecting  Rich Media as Creative Media Type.
            cy.get('div[data-ktwizard-type="action-next"]').click();  //.wait(1000) <- click on Next-Step button.
            cy.get('[placeholder="Creative XML"]').type(richMediaText); // fill the creative XML field.
            cy.get('[placeholder="Dimensions"]').click(); // click to select dimensions.
            cy.get('[class="mat-option ng-star-inserted mat-active"]').click(); // click to select dimensions 300 x 250.
            cy.get('[data-ktwizard-type="action-next"]').click();  //.wait(1000) <- click on Next-Step button.
            cy.get('[data-ktwizard-type="action-submit"]').click() //.wait(1000) <- will evaluate if this wait is needed - submit the creative
            cy.wait(1000);  // this wait for redirect 
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                creativeId = urlPathName.split('/').pop(); // Grabbing Creative ID from URL
            });
        }); 

        it('Verify created Video Creative on Placement Lvl table.', () => {
        cy.server();
        cy.visit(`/placements/${placementId}`);
        cy.get('[id="mat-input-1"]', { timeout: 2000 }).first().type(creativeName); // adding wait for api return results
        cy.log('Verifies Creative Name');
        cy.get('[mattooltip="View creative"]').should('contain', creativeName);  // verifies Name of Creative
        cy.log('Verifies Creative ID');
        cy.get('mat-cell.mat-cell.cdk-column-id.mat-column-id.ng-star-inserted').should('contain', creativeId);  // verifies Creative ID
        cy.log('Verifies Creative Format Type');
        cy.get('mat-cell.cell--icon-14sdf.mat-cell.cdk-column-format.mat-column-format.ng-star-inserted').should('contain', 'Video');  // verifies Formt Type of Creative
        cy.log('Verifies Media Type');
        cy.get('[class="cell--icon-14asd mat-cell cdk-column-isRichMedia mat-column-isRichMedia ng-star-inserted"]').should('contain', 'Rich media');  // verifies Media Type of Creative.
        
        //  Verifying Creative Detail Page
      //  cy.get('[mattooltip="View creative"]').click().wait(2000);  // Clicks on Creatives from Placement page

        });

      it('Verify created Video Creative on Creative Detail Page', () => {
            cy.visit(`/creatives/${creativeId}`);
            cy.get('#kt_subheader > div > div > h3').should('contain', creativeName);  // verifies Title 
            cy.log('Verifies Format on Creative Detail page');
            cy.get('div.col-sm-3.margin-bottom-10-mobile > ul > li:nth-child(1)').should('contain', 'VIDEO');  // verifies Formt Type of Creative Detail page 
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.log('Verifies Rate Media Type on Creative Detail page');
            cy.get('div.col-sm-3.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', 'Media Type');  // verifies Media Type on Creative Detail page 
            cy.get('div.col-sm-3.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', 'Rich media'); // verifies Formt Type of Creative Detail page is Rich media.
            cy.get('div:nth-child(2) > div.col-sm-6.col-md-7.col-lg-8.column-wrapper > kt-portlet > div > kt-portlet-body > div').should('have.class', 'snippet-wrapper'); // make sure the snippet-wrapper is displaying.
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(2)').should('contain', 'Width: 300');  // verifies Width: 300 of Creative Detail page
            cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(3)').should('contain', 'Height: 250');  // verifies hight: 300 of Creative Detail page
        });

        it('Update Video Creative', () => {
            creativeName += '-update';
            richMediaTextUpdate= 'Updat rich media text';
            cy.log(creativeId);
            cy.visit(`/creatives/${creativeId}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Placement option
            cy.get('[placeholder="Enter Name"]').first().clear({ force: true }).type(creativeName); 
            cy.get('[data-ktwizard-type="action-next"]').click();  //.wait(1000) <- click on Next-Step button
            cy.get('[placeholder="Creative XML"]').first().clear({ force: true }).type(richMediaTextUpdate); // edit the creative XML field.
            cy.get('[data-ktwizard-type="action-next"]').click();  //.wait(1000) <- click on Next-Step button.
            cy.get('[data-ktwizard-type="action-submit"]', { timeout: 2000 }).click();  //.wait(1000) <- will evaluate if this wait is needed - submit the creative
            cy.url().should('include', '/creatives/');  
        });

        it('Verify updated Video Creative on Placement Lvl table.', () => {
            cy.server();
            cy.visit(`/placements/${placementId}`);
            cy.get('[id="mat-input-1"]', { timeout: 2000 }).first().type(creativeName); // adding wait for api return results
            cy.log('Verifies Creative Name');
            cy.get('[mattooltip="View creative"]').should('contain', creativeName);  // verifies Name of Creative is updated 
            cy.log('Verifies Creative ID');
            cy.get('mat-cell.mat-cell.cdk-column-id.mat-column-id.ng-star-inserted').should('contain', creativeId);  // verifies Creative ID
            });

        it('Verify updated Video Creative on Creative Detail Page.', () => {
            cy.visit(`/creatives/${creativeId}`);
            cy.get('#kt_subheader > div > div > h3').should('contain', creativeName); // verifies Title
            cy.log('Verifies Format on Creative Detail page'); 
            cy.get('ul > li:nth-child(1)').eq(1).should('contain', 'VIDEO');  // verifies Formt Type of Creative Detail page 
            cy.get('div.col-sm-3.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', 'Rich media'); // verifies Formt Type of Creative Detail page is Rich media.
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(2)').should('contain', 'Width: 300');  // verifies Width: 300 of Creative Detail page
            cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(3)').should('contain', 'Height: 250');  // verifies hight: 300 of Creative Detail page
        });

               // Archive the created creative 
        it('Archive Creative.', () => {
            cy.log(creativeId);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('div.col-sm-2.col--end > div > div > div > button:nth-child(2)').click(); // clicking on archive Placement option
        });

    it('Verify the creative is archived properly', () => {
      //      cy.visit(`/creatives/${creativeId}`).wait(2000);
            cy.get('#kt_subheader > div > div > h3').should('contain', creativeName); // verifies Title
            cy.log('Verifies the archived Creative icon');
            cy.get('[class="fas fa-archive"]').should('be.visible'); // verify the archivr icon is displaying.
            cy.log('Verifies Edit creative button is disabled');
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('[class="dropdown-item"]').first().should('have.attr', 'disabled'); // verifies edit button is disabled.
            });

    it('Create creative at Line-Item Lvl (Banner or Creative)', () => {
        creativeName = generateName('creative');
        cy.server();
            cy.route(`/api/v1/line-items/${LineItemId}`).as('lineItemPageLoad');
            cy.visit(`/line-items/${LineItemId}`).wait('@lineItemPageLoad').wait(1000);
            cy.get('[mattooltip="Create new Creative"]').click(); // clicking on create new creative button
            cy.get('[placeholder="Enter Name"]').first().click().type(creativeName); 
            cy.get('[placeholder="Creative Media Type"]').click().wait(1000); // selecting Creative Media Type.
            cy.get('span[class="mat-option-text"]').eq(1).click(); // selecting  Rich Media as Creative Media Type.
            cy.get('div[data-ktwizard-type="action-next"]').click();  //.wait(1000) <- click on Next-Step button.
            if (LineItemFormatVideo){
                cy.get('[placeholder="Creative XML"]').type(richMediaText); // fill the creative XML field.
                cy.get('[placeholder="Dimensions"]').click(); // click to select dimensions.
                cy.get('[class="mat-option ng-star-inserted mat-active"]').click(); // click to select dimensions 300 x 250.
            } else {
            cy.get('[placeholder="Creative HMTL"]').type(richMediaText); // fill the creative HTML field.
            cy.get('[placeholder="Dimensions"]').click(); // click to select dimensions.
            cy.get('[class="mat-option ng-star-inserted mat-active"]').click(); // click to select dimensions 300 x 250.
            }
            cy.get('[data-ktwizard-type="action-next"]').click();  //.wait(1000) <- click on Next-Step button.
            cy.get('[data-ktwizard-type="action-submit"]').click();  //.wait(1000) <- will evaluate if this wait is needed - submit the creative
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                creativeId = urlPathName.split('/').pop(); // Grabbing Creative ID from URL
     
    });
});

       it('Verify created Creative on Line-item Lvl table.', () => {
        cy.visit(`/line-items/${LineItemId}`)
        cy.get('[placeholder="Search"]', { timeout: 2000 }).first().type(creativeName); // adding wait for api return results
        cy.log('Verifies Creative Name');
        cy.get('mat-cell.primary-table-column.mat-cell.cdk-column-name.mat-column-name.ng-star-inserted > a').should('contain', creativeName);  // verifies Name of Creative
        cy.log('Verifies Creative ID');
        cy.get('mat-row > mat-cell.mat-cell.cdk-column-id.mat-column-id.ng-star-inserted').should('contain', creativeId);  // verifies Creative ID
        });

        it('Verify created Creative on Creative Detail Page', () => {
            cy.visit(`/creatives/${creativeId}`);
            cy.get('#kt_subheader > div > div > h3').should('contain', creativeName);  // verifies Title 
            cy.log('Verifies Format on Creative Detail page');
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.log('Verifies Rate Media Type on Creative Detail page');
            cy.get('div.col-sm-3.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', 'Media Type');  // verifies Media Type on Creative Detail page 
            cy.get('div:nth-child(2) > div.col-sm-6.col-md-7.col-lg-8.column-wrapper > kt-portlet > div > kt-portlet-body > div').should('have.class', 'snippet-wrapper'); // make sure the snippet-wrapper is displaying.
            if (LineItemFormatVideo){
                cy.get('ul > li:nth-child(1)').eq(1).should('contain', 'VIDEO');  // verifies Formt Type of Creative Detail page 
            } else {
                cy.get('ul > li:nth-child(1)').eq(1).should('contain', 'BANNER');  // verifies Formt Type of Creative Detail page 
            }
            cy.get('div.col-sm-3.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', 'Rich media'); // verifies Formt Type of Creative Detail page is Rich media.
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(2)').should('contain', 'Width: 300');  // verifies Width: 300 of Creative Detail page
            cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(3)').should('contain', 'Height: 250');  // verifies hight: 250 of Creative Detail page
        });

        it('Update created Creative', () => {
            creativeName += '-update';
            cy.log(creativeId);
            cy.visit(`/creatives/${creativeId}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Placement option
            cy.get('[placeholder="Enter Name"]').first().clear({ force: true }).type(creativeName); 
            cy.get('[data-ktwizard-type="action-next"]').click();  //.wait(1000) <- click on Next-Step button
            if (LineItemFormatVideo){
                cy.get('[placeholder="Dimensions"]').click(); // click to select dimensions.
                cy.get('class="mat-option ng-star-inserted"').click(); // click to select dimensions 300 x 250.
            }
            cy.get('[data-ktwizard-type="action-next"]').click();  //.wait(1000) <- click on Next-Step button.
            cy.get('[data-ktwizard-type="action-submit"]', { timeout: 2000 }).click();  //.wait(1000) <- will evaluate if this wait is needed - submit the creative
            cy.url().should('include', '/creatives/');  
        });

        it('Verify updated Creative on Line-Item Lvl table.', () => {
            cy.visit(`/line-items/${LineItemId}`)
            cy.get('[placeholder="Search"]', { timeout: 2000 }).first().type(creativeName); // adding wait for api return results
            cy.log('Verifies Creative Name');
            cy.get('mat-cell.primary-table-column.mat-cell.cdk-column-name.mat-column-name.ng-star-inserted > a').should('contain', creativeName);  // verifies Name of Creative
            cy.log('Verifies Creative ID');
            cy.get('mat-row > mat-cell.mat-cell.cdk-column-id.mat-column-id.ng-star-inserted').should('contain', creativeId);  // verifies Creative ID.
            if (LineItemFormatVideo){
                cy.get('mat-cell.cell--icon-14sdf.mat-cell.cdk-column-format.mat-column-format.ng-star-inserted').eq(1).should('contain', 'Video');  // verifies Formt Type of Creative Detail page 
            } else {
                cy.get('mat-cell.cell--icon-14sdf.mat-cell.cdk-column-format.mat-column-format.ng-star-inserted').eq(1).should('contain', 'Banner');  // verifies Formt Type of Creative Detail page 
            }
            cy.get('mat-cell.cell--icon-14asd.mat-cell.cdk-column-isRichMedia.mat-column-isRichMedia.ng-star-inserted').eq(2).should('contain', 'Rich media'); // verifies Formt Type of Creative Detail page is Rich media.
            });

        it('Verify updated Creative on Creative Detail Page', () => {
            cy.visit(`/creatives/${creativeId}`);
            cy.get('#kt_subheader > div > div > h3').should('contain', creativeName); // verifies Title
            cy.log('Verifies Format on Creative Detail page');
            cy.get('div.col-sm-3.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', 'Rich media'); // verifies Formt Type of Creative Detail page is Rich media.
            if (LineItemFormatVideo){
                cy.get('ul > li:nth-child(1)').eq(1).should('contain', 'VIDEO');  // verifies Formt Type of Creative Detail page 
                cy.log('Verifies Dimensions on Creative Detail page');
                cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(2)').should('contain', 'Width: 320');  // verifies Width: 320 of Creative Detail page
                cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(3)').should('contain', 'Height: 50');  // verifies hight: 50 of Creative Detail page
            } else {
                cy.get('ul > li:nth-child(1)').eq(1).should('contain', 'BANNER');  // verifies Formt Type of Creative Detail page 
            }
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(2)').should('contain', 'Width: 300');  // verifies Width: 300 of Creative Detail page
            cy.get('div.col-sm-7.margin-bottom-10-mobile > ul > li > span:nth-child(3)').should('contain', 'Height: 250');  // verifies hight: 250 of Creative Detail page
        });

        // Archive the created creative 
        it('Archive Creative', () => {
            cy.log(creativeId);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('div.col-sm-2.col--end > div > div > div > button:nth-child(2)').click(); // clicking on archive Placement option
        });

         it('Verify the creative is archived properly', () => {
      //      cy.visit(`/creatives/${creativeId}`).wait(2000);
            cy.get('#kt_subheader > div > div > h3').should('contain', creativeName); // verifies Title
            cy.log('Verifies the archived Creative icon');
            cy.get('[class="fas fa-archive"]').should('be.visible'); // verify the archivr icon is displaying.
            cy.log('Verifies Edit creative button is disabled');
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('[class="dropdown-item"]').first().should('have.attr', 'disabled'); // verifies edit button is disabled.
            });

    });
});