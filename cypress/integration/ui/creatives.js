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

        const creative = {};


        // create CRUD test
        it('Retrieve Placement to select as Parent', () => {
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
                url: `/api/v1/placements?sort_order=desc&sort_by=id&page=0&limit=10&search=${lastCreatedPlacement}`,
            });

            cy.request(placementRequestOptions).then((resp) => {
                const placementRow = resp.body.rows;
                if( placementRow.length == 0 ) {
                    throw new Error("No Placement Id returned"); // Temp solution
                } else {
                    creative.placementId = placementRow[0].id;
                    cy.log('Placement ID found:' + creative.placementId);
                }
            });
        });

        it('Retrieve Line Item to select as Parent', () => {
            const lastCreatedLineItem = Cypress.moment().format('YY.');
            
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
                    creative.lineItemId = LineItemRow[0].id;
                    cy.log('Line-Item ID found:' + creative.lineItemId);
                }
            });
        });

        it('Create VAST Video Creative at Placement Lvl' , () => {
            cy.server();
            cy.route('/api/v1/creatives/*').as('creativeDetailPage');

            creative.name = generateName('Creative-lvl_Placement');
            creative.vastXml = 'https://Placement-lvl-Creative.com';
            creative.mediaType = 'VAST';
            creative.format = 'Video';
            creative.height = '250';
            creative.width = '300';

            cy.visit(`/placements/${creative.placementId}`);
            cy.get('[mattooltip="Create new Creative"]').click(); // clicking on create new creative button
            cy.get('[placeholder="Enter Name"]').click().type(creative.name, { force: true }); // Force true need to cypress to type entire string consistently
            cy.get('[placeholder="Format"]').click(); // selecting Format
            cy.get('[class="mat-option"]').click(); // selecting video for the creative format.
            cy.get('[placeholder="Creative Media Type"]').click(); // selecting Creative Media Type.
            cy.get('mat-option').eq(1).click(); // selecting  Rich Media as Creative Media Type.
            cy.get('div[data-ktwizard-type="action-next"]').click();  // click on Next-Step button.
            cy.get('.mat-input-element.mat-form-field-autofill-control.ng-pristine').type(creative.vastXml); // fill the creative XML field.
            cy.get('[placeholder="Dimensions"]').click(); // click to select dimensions.
            cy.get('[class="mat-option ng-star-inserted mat-active"]').click(); // click to select dimensions 300 x 250
            cy.get('[data-ktwizard-type="action-next"]').click();  // click on Next-Step button.
            cy.get('[data-ktwizard-type="action-submit"]').click().wait('@creativeDetailPage').its('status').should('eq', 200); // Submitting the Creative Info for creation
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                creative.id = urlPathName.split('/').pop(); // Grabbing Creative ID from URL
            });
        }); 

        it('Verify created VAST Video Creative on Placement Lvl table', () => {
            cy.server();
            cy.route('/api/v1/creatives?sort_order=desc&sort_by=id&page=0&limit=25&placementId=*&search=*').as('searchCreative')
            
            cy.visit(`/placements/${creative.placementId}`);
            cy.get('[placeholder="Search"]').last().type(creative.name).wait('@searchCreative').its('status').should('eq', 200); // adding wait for api return results
            cy.log('Verifies Creative Name');
            cy.get('[mattooltip="View creative"]', { timeout: 8000 }).should('contain', creative.name);  // verifies Name of Creative
            cy.log('Verifies Creative ID');
            cy.get('mat-cell.cdk-column-id').should('contain', creative.id);  // verifies Creative ID
            cy.log('Verifies Creative Format Type');
            cy.get('.cell--icon-14sdf.cdk-column-format').should('contain', creative.format);  // verifies Format Type of Creative
            cy.log('Verifies Media Type');
            cy.get('.cell--icon-14asd.cdk-column-isRichMedia').should('contain', creative.mediaType);  // verifies Media Type of Creative.
        });

        it('Verify created VAST Video Creative Detail Page', () => {
            cy.visit(`/creatives/${creative.id}`);
            cy.log('Verifies Format on Creative Detail page');
            cy.get('.kt-subheader__title', { timeout: 8000 }).should('be.visible').should('contain', creative.name);  // verifies Title 
            cy.log('Verifies Format on Creative Detail page');
            cy.get('div.col-sm-3 > ul > li:nth-child(1)').should('contain', creative.format.toUpperCase());  // verifies Format Type of Creative Detail page 
            cy.log('Verifies Media Type on Creative Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', creative.mediaType); // verifies Format Type of Creative Detail page is Rich media.
            cy.get('.col-lg-8.column-wrapper > kt-portlet > div > kt-portlet-body > div')
                .should('be.visible')
                .should('contain', creative.vastXml)
                .should('have.class', 'snippet-wrapper'); // make sure the snippet-wrapper is displaying.
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.get('li > span:nth-child(2)').should('contain', creative.width);  // verifies Width: 300 on Creative Detail page
            cy.get('li > span:nth-child(3)').should('contain', creative.height);  // verifies Height: 300 on Creative Detail page
        });

        it('Update VAST Video Creative', () => {
            cy.server();
            cy.route('/api/v1/creatives/*').as('creativeDetailPage');

            creative.name += '-update';
            creative.vastXml += '.update.qa';

            cy.visit(`/creatives/${creative.id}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]', { timeout: 8000 }).click(); // clicking on Edit Creative button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Creative option
            cy.get('[placeholder="Enter Name"]').first().clear({ force: true }).type(creative.name, { force: true }); 
            cy.get('[data-ktwizard-type="action-next"]').click();  //click on Next-Step button
            cy.get('.mat-input-element.mat-form-field-autofill-control.ng-pristine').clear({ force: true }).type(creative.vastXml); // edit the creative XML field.
            cy.get('[data-ktwizard-type="action-next"]').click();  //click on Next-Step button.
            cy.get('[data-ktwizard-type="action-submit"]').click().wait('@creativeDetailPage').its('status').should('eq', 200);  // Submitting the Creative Info for creation
        });

        it('Verify updated Video Creative on Placement Lvl table', () => {
            cy.server();
            cy.route('/api/v1/creatives?sort_order=desc&sort_by=id&page=0&limit=25&placementId=*&search=*').as('searchCreative')
            
            cy.visit(`/placements/${creative.placementId}`);
            cy.get('[placeholder="Search"]').last().type(creative.name).wait('@searchCreative').its('status').should('eq', 200); // adding wait for api return results
            cy.log('Verifies Creative Name');
            cy.get('[mattooltip="View creative"]', { timeout: 8000 }).should('contain', creative.name);  // verifies Updated Name of Creative
            cy.log('Verifies Creative ID');
            cy.get('mat-cell.cdk-column-id').should('contain', creative.id);  // verifies Creative ID
            cy.log('Verifies Creative Format Type');
            cy.get('.cell--icon-14sdf.cdk-column-format').should('contain', creative.format);  // verifies Format Type of Creative
            cy.log('Verifies Media Type');
            cy.get('.cell--icon-14asd.cdk-column-isRichMedia').should('contain', creative.mediaType);  // verifies Media Type of Creative.
        });

        it('Verify updated Video Creative Detail Page.', () => {
            cy.visit(`/creatives/${creative.id}`);
            cy.log('Verifies Format on Creative Detail page');
            cy.get('.kt-subheader__title', { timeout: 8000 }).should('be.visible').should('contain', creative.name);  // verifies Title 
            cy.log('Verifies Format on Creative Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').should('contain', creative.format.toUpperCase());  // verifies Format Type of Creative Detail page 
            cy.log('Verifies Media Type on Creative Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', creative.mediaType); // verifies Format Type of Creative Detail page is Rich media.
            cy.get('.col-lg-8.column-wrapper > kt-portlet > div > kt-portlet-body > div')
                .should('be.visible')
                .should('contain', creative.vastXml)
                .should('have.class', 'snippet-wrapper'); // make sure the snippet-wrapper is displaying.
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.get('li > span:nth-child(2)').should('contain', creative.width);  // verifies Width: 300 on Creative Detail page
            cy.get('li > span:nth-child(3)').should('contain', creative.height);  // verifies Height: 300 on Creative Detail page
        });

               // Archive the created creative 
        it('Archive VAST Video Creative', () => {
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('button:nth-child(2)').last().click(); // clicking on archive Creative option
        });

        it('Verify the Vidoe Creative is archived in UI', () => {
            cy.visit(`/creatives/${creative.id}`);
            cy.get('.kt-subheader__title', { timeout: 8000 }).should('contain', creative.name); // verifies Title
            cy.log('Verifies the archived Creative icon');
            cy.get('[class="fas fa-archive"]').should('be.visible'); // verify the archive icon is displaying.
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.log('Verifies Edit creative button is disabled');
            cy.get('[class="dropdown-item"]').first().should('have.attr', 'disabled'); // verifies edit button is disabled.
        });

        it('Create Banner Creative at Line-Item Lvl', () => {
            cy.server();
            cy.route('/api/v1/creatives/*').as('creativeDetailPage');

            creative.name = generateName('Creative-lvl_Line-item');
            creative.html = 'https://Line_item-lvl-Creative.com';
            creative.mediaType = 'Rich media';
            creative.format = 'Banner';
            creative.height = '250';
            creative.width = '300';

            cy.visit(`/line-items/${creative.lineItemId}`);
            cy.get('[mattooltip="Create new Creative"]').click(); // clicking on create new creative button
            cy.get('[placeholder="Enter Name"]').click().type(creative.name, { force: true }); // Force true needed for cypress to type entire string
            cy.get('[placeholder="Creative Media Type"]').click(); // selecting Creative Media Type.
            cy.get('span[class="mat-option-text"]').eq(1).click(); // selecting  Rich Media as Creative Media Type.
            cy.get('div[data-ktwizard-type="action-next"]').click();  //click on Next-Step button.
            cy.get('.mat-input-element.mat-form-field-autofill-control.ng-pristine').type(creative.html); // fill the creative XML field.
            cy.get('[placeholder="Dimensions"]').click(); // click to select dimensions.
            cy.get('[class="mat-option ng-star-inserted mat-active"]').click(); // click to select dimensions 300 x 250.
            cy.get('[data-ktwizard-type="action-next"]').click();  //click on Next-Step button.
            cy.get('[data-ktwizard-type="action-submit"]').click().wait('@creativeDetailPage').its('status').should('eq', 200);  // Submitting the Creative Info for creation
            cy.location().then((currentLocation) => {
                const urlPathName = currentLocation.pathname;
                creative.id = urlPathName.split('/').pop(); // Grabbing Creative ID from URL
            });
        });

        it('Verify created Banner Creative on Line-item Lvl table.', () => {
            cy.server();
            cy.route('/api/v1/creatives?sort_order=desc&sort_by=id&page=0&limit=25&lineItemId=*&placementId=*&search=*').as('searchCreative')
            
            cy.visit(`/line-items/${creative.lineItemId}`)
            cy.get('[placeholder="Search"]').type(creative.name).wait('@searchCreative').its('status').should('eq', 200); // adding wait for api return results
            cy.log('Verifies Creative Name');
            cy.get('[mattooltip="View creative"]', { timeout: 8000 }).should('contain', creative.name);  // verifies Name of Creative
            cy.log('Verifies Creative ID');
            cy.get('.mat-cell.mat-column-id').should('contain', creative.id);  // verifies Creative ID
            cy.log('Verifies Creative Format Type');
            cy.get('.cell--icon-14sdf.cdk-column-format').should('contain', creative.format);  // verifies Format Type of Creative
            cy.log('Verifies Media Type');
            cy.get('.cell--icon-14asd.cdk-column-isRichMedia').should('contain', creative.mediaType);  // verifies Media Type of Creative.
        });

        it('Verify created Banner Creative Detail Page', () => {
            cy.visit(`/creatives/${creative.id}`);
            cy.log('Verifies Format on Creative Detail page');
            cy.get('.kt-subheader__title', { timeout: 8000 }).should('be.visible').should('contain', creative.name);  // verifies Title 
            cy.log('Verifies Format on Creative Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').should('contain', creative.format.toUpperCase());  // verifies Format Type of Creative Detail page 
            cy.log('Verifies Media Type on Creative Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', creative.mediaType); // verifies Format Type of Creative Detail page is Rich media.
            cy.get('.col-lg-8.column-wrapper > kt-portlet > div > kt-portlet-body > div')
                .should('be.visible')
                .should('contain', creative.html)
                .should('have.class', 'snippet-wrapper'); // make sure the snippet-wrapper is displaying.
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.get('li > span:nth-child(2)').should('contain', creative.width);  // verifies Width: 300 on Creative Detail page
            cy.get('li > span:nth-child(3)').should('contain', creative.height);  // verifies Height: 250 on Creative Detail page
        });

        it('Update created Banner Creative', () => {
            cy.server();
            cy.route('/api/v1/creatives/*').as('creativeDetailPage');

            creative.name += '-update';
            creative.html += '.update.qa';

            cy.visit(`/creatives/${creative.id}`);
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('[class="dropdown-item"]').first().click(); // clicking on edit Creative option
            cy.get('[placeholder="Enter Name"]').first().clear({ force: true }).type(creative.name, { force: true }); 
            cy.get('[data-ktwizard-type="action-next"]').click();  //click on Next-Step button
            cy.get('.mat-input-element.mat-form-field-autofill-control.ng-pristine').clear({ force: true }).type(creative.html); // edit the creative XML field.
            cy.get('[data-ktwizard-type="action-next"]').click();  //click on Next-Step button.
            cy.get('[data-ktwizard-type="action-submit"]').click().wait('@creativeDetailPage').its('status').should('eq', 200);  // Submitting the Creative Info for creation
        });

        it('Verify updated Banner Creative on Line-Item Lvl table.', () => {
            cy.server();
            cy.route('/api/v1/creatives?sort_order=desc&sort_by=id&page=0&limit=25&lineItemId=*&placementId=*&search=*').as('searchCreative')
            
            cy.visit(`/line-items/${creative.lineItemId}`)
            cy.get('[placeholder="Search"]').type(creative.name).wait('@searchCreative').its('status').should('eq', 200); // adding wait for api return results
            cy.log('Verifies Creative Name');
            cy.get('[mattooltip="View creative"]', { timeout: 8000 }).should('contain', creative.name);  // verifies Name of Creative
            cy.log('Verifies Creative ID');
            cy.get('.mat-cell.mat-column-id').should('contain', creative.id);  // verifies Creative ID
            cy.log('Verifies Creative Format Type');
            cy.get('.cell--icon-14sdf.cdk-column-format').should('contain', creative.format);  // verifies Format Type of Creative
            cy.log('Verifies Media Type');
            cy.get('.cell--icon-14asd.cdk-column-isRichMedia').should('contain', creative.mediaType);  // verifies Media Type of Creative.
        });

        it('Verify updated Banner Creative Detail Page', () => {
            cy.visit(`/creatives/${creative.id}`);
            cy.log('Verifies Format on Creative Detail page');
            cy.get('.kt-subheader__title', { timeout: 8000 }).should('be.visible').should('contain', creative.name);  // verifies Title 
            cy.log('Verifies Format on Creative Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(1)').should('contain', creative.format.toUpperCase());  // verifies Format Type of Creative Detail page 
            cy.log('Verifies Media Type on Creative Detail page');
            cy.get('.margin-bottom-10-mobile > ul > li:nth-child(2)').should('contain', creative.mediaType); // verifies Format Type of Creative Detail page is Rich media.
            cy.get('.col-lg-8.column-wrapper > kt-portlet > div > kt-portlet-body > div')
                .should('be.visible')
                .should('contain', creative.html)
                .should('have.class', 'snippet-wrapper'); // make sure the snippet-wrapper is displaying.
            cy.log('Verifies Dimensions on Creative Detail page');
            cy.get('li > span:nth-child(2)').should('contain', creative.width);  // verifies Width: 300 on Creative Detail page
            cy.get('li > span:nth-child(3)').should('contain', creative.height);  // verifies Height: 250 on Creative Detail page
        });
 
        it('Archive Banner Creative', () => {
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('button:nth-child(2)').last().click(); // clicking on archive Placement option
        });

        it('Verify the Banner Creative is archived in UI', () => {
            cy.visit(`/creatives/${creative.id}`);
            cy.get('.kt-subheader__title', { timeout: 8000 }).should('contain', creative.name); // verifies Title
            cy.log('Verifies the archived Creative icon');
            cy.get('[class="fas fa-archive"]').should('be.visible'); // verify the archive icon is displaying.
            cy.log('Verifies Edit creative button is disabled');
            cy.get('[class="dropdown-toggle mat-raised-button mat-button-base mat-primary"]').click(); // clicking on Edit Creative button
            cy.get('[class="dropdown-item"]').first().should('have.attr', 'disabled'); // verifies edit button is disabled.
        });
    });
});
